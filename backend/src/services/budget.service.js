const budgetRepo = require('../repositories/budget.repository')
const budgetConfigRepo = require('../repositories/budgetConfig.repository')
const { calculateBudgetTotal } = require('./budgetCalculator')
const { paginate, paginatedResponse } = require('../utils/pagination')

// ── Resolve os itens de um orçamento contra as taxas VIGENTES ─────────
// Usado tanto no preview (rascunho) quanto no recálculo de finalizados.
const resolveItemsAgainstCurrentRates = async (items, companyId, projectArea) => {
  const levelIds = items.filter(i => i.budgetLevelId).map(i => i.budgetLevelId)
  const currentRates = await budgetConfigRepo.getCurrentRatesByLevelIds(levelIds, companyId)
  const rateByLevel = new Map(currentRates.map(r => [r.budget_level_id, r]))

  const resolvedInputs = items.map((item) => {
    const rate = item.budgetLevelId ? rateByLevel.get(item.budgetLevelId) : null
    return {
      ...item,
      rateType: rate ? rate.rate_type : (item.rateType || 'fixed'),
      rateValue: rate ? rate.value : (item.rateSnapshotValue || 0),
    }
  })

  return calculateBudgetTotal({ items: resolvedInputs, projectArea, fixedFeesTotal: 0 })
}

// ── Constrói o payload do snapshot num formato ÚNICO, usado tanto em
// finalize() quanto em recalculateFinalized(), para que o PDF (e qualquer
// outro consumidor) sempre leia a mesma estrutura de dados. ──────────
const buildSnapshotPayload = (budget) => {
  const itemsTotal = budget.items.reduce((s, it) => s + Number(it.line_total), 0)
  const total = itemsTotal + Number(budget.fixed_fees_total)

  return {
    title: budget.title,
    client_name: budget.client_display_name || budget.client_name,
    project_area: budget.project_area,
    fixed_fees_total: budget.fixed_fees_total,
    items: budget.items.map(it => ({
      title_label: it.title_label,
      level_label: it.level_label,
      custom_label: it.custom_label,
      area_used: it.area_used,
      rate_type: it.rate_type,
      rate_value: it.rate_snapshot_value,
      line_total: it.line_total,
    })),
    total,
  }
}

// ── Preview em tempo real (endpoint leve, chamado pelo front com debounce) ──
const calculatePreview = async ({ items, projectArea, fixedFeesTotal }, companyId) => {
  const { items: resolvedItems, total } = await resolveItemsAgainstCurrentRates(
    items, companyId, projectArea
  )
  const grandTotal = total + (Number(fixedFeesTotal) || 0)
  return { items: resolvedItems, total: grandTotal }
}

const getAll = async (query, companyId) => {
  const { page, limit, offset } = paginate(query)
  const { rows, total } = await budgetRepo.findAll({
    companyId, limit, offset, search: query.search, status: query.status,
  })
  return paginatedResponse(rows, total, page, limit)
}

const getById = async (id, companyId) => {
  const budget = await budgetRepo.findById(id, companyId)
  if (!budget) throw { status: 404, message: 'Orçamento não encontrado' }
  return budget
}

// ── Cria orçamento: resolve itens contra taxas vigentes e já grava lineTotal ──
const create = async (data, userId, companyId) => {
  if (!data.title || !data.title.trim()) {
    throw { status: 400, message: 'Título é obrigatório' }
  }
  if (!companyId) throw { status: 400, message: 'companyId inválido' }

  const items = Array.isArray(data.items) ? data.items : []
  const { items: resolvedItems } = await resolveItemsAgainstCurrentRates(
    items, companyId, data.project_area || 0
  )

  const budgetNumber = await budgetRepo.nextBudgetNumber(companyId)

  const budget = await budgetRepo.create({
    companyId,
    budgetNumber,
    title: data.title.trim(),
    clientId: data.client_id || null,
    clientName: data.client_name || null,
    projectArea: data.project_area || 0,
    fixedFeesTotal: data.fixed_fees_total || 0,
    finalNotes: data.final_notes || null,
    createdBy: userId,
  })

  await budgetRepo.replaceItems(budget.id, companyId, resolvedItems.map(it => ({
    customLabel: it.customLabel,
    budgetLevelId: it.budgetLevelId || null,
    areaUsed: it.areaUsed ?? null,
    rateSnapshotValue: it.rateValue,
    rateType: it.rateType,
    lineTotal: it.lineTotal,
  })))

  return budgetRepo.findById(budget.id, companyId)
}

// ── Atualiza rascunho (sempre re-resolve contra vigente, pois ainda não é imutável) ──
const update = async (id, data, companyId) => {
  const existing = await budgetRepo.findById(id, companyId)
  if (!existing) throw { status: 404, message: 'Orçamento não encontrado' }
  if (existing.status === 'finalized') {
    throw { status: 400, message: 'Orçamento finalizado não pode ser editado diretamente. Use o recálculo.' }
  }

  const allowed = ['title', 'client_id', 'client_name', 'project_area', 'fixed_fees_total', 'final_notes']
  const fields = {}
  for (const key of allowed) {
    if (data[key] !== undefined) fields[key] = data[key]
  }
  if (Object.keys(fields).length) await budgetRepo.update(id, companyId, fields)

  if (data.items !== undefined) {
    const projectArea = data.project_area ?? existing.project_area
    const { items: resolvedItems } = await resolveItemsAgainstCurrentRates(
      data.items, companyId, projectArea
    )
    await budgetRepo.replaceItems(id, companyId, resolvedItems.map(it => ({
      customLabel: it.customLabel,
      budgetLevelId: it.budgetLevelId || null,
      areaUsed: it.areaUsed ?? null,
      rateSnapshotValue: it.rateValue,
      rateType: it.rateType,
      lineTotal: it.lineTotal,
    })))
  }

  return budgetRepo.findById(id, companyId)
}

// ── Finalizar: congela tudo em um BudgetSnapshot imutável ──────────────
const finalize = async (id, companyId, userId) => {
  const budget = await budgetRepo.findById(id, companyId)
  if (!budget) throw { status: 404, message: 'Orçamento não encontrado' }

  const payload = buildSnapshotPayload(budget)

  await budgetRepo.createSnapshot(id, companyId, {
    payload, totalAmount: payload.total, createdBy: userId,
  })
  await budgetRepo.update(id, companyId, { status: 'finalized' })

  return budgetRepo.findById(id, companyId)
}

// ── Compara rascunho salvo vs métricas vigentes (para o modal de divergência) ──
const checkDivergence = async (id, companyId) => {
  const budget = await budgetRepo.findById(id, companyId)
  if (!budget) throw { status: 404, message: 'Orçamento não encontrado' }

  const levelIds = budget.items.filter(i => i.budget_level_id).map(i => i.budget_level_id)
  const currentRates = await budgetConfigRepo.getCurrentRatesByLevelIds(levelIds, companyId)
  const rateByLevel = new Map(currentRates.map(r => [r.budget_level_id, r]))

  const divergences = budget.items
    .filter(it => it.budget_level_id)
    .map(it => {
      const current = rateByLevel.get(it.budget_level_id)
      const savedValue = Number(it.rate_snapshot_value)
      const currentValue = current ? Number(current.value) : null
      return {
        item_id: it.id,
        label: it.custom_label,
        saved_value: savedValue,
        current_value: currentValue,
        diverged: currentValue !== null && currentValue !== savedValue,
      }
    })
    .filter(d => d.diverged)

  return { hasDivergence: divergences.length > 0, divergences }
}

// ── Aplica métricas vigentes num rascunho (re-resolve tudo) ────────────
const applyCurrentRatesToDraft = async (id, companyId) => {
  const budget = await budgetRepo.findById(id, companyId)
  if (!budget) throw { status: 404, message: 'Orçamento não encontrado' }
  if (budget.status === 'finalized') {
    throw { status: 400, message: 'Use o recálculo para orçamentos finalizados' }
  }

  const items = budget.items.map(it => ({
    customLabel: it.custom_label,
    budgetLevelId: it.budget_level_id,
    areaUsed: it.area_used,
  }))

  const { items: resolvedItems } = await resolveItemsAgainstCurrentRates(
    items, companyId, budget.project_area
  )

  await budgetRepo.replaceItems(id, companyId, resolvedItems.map(it => ({
    customLabel: it.customLabel,
    budgetLevelId: it.budgetLevelId || null,
    areaUsed: it.areaUsed ?? null,
    rateSnapshotValue: it.rateValue,
    rateType: it.rateType,
    lineTotal: it.lineTotal,
  })))

  return budgetRepo.findById(id, companyId)
}

// ── Recalcular orçamento finalizado: gera NOVO snapshot, mantém histórico ──
const recalculateFinalized = async (id, companyId, userId) => {
  const budget = await budgetRepo.findById(id, companyId)
  if (!budget) throw { status: 404, message: 'Orçamento não encontrado' }
  if (budget.status !== 'finalized') {
    throw { status: 400, message: 'Apenas orçamentos finalizados podem ser recalculados' }
  }

  const items = budget.items.map(it => ({
    customLabel: it.custom_label,
    budgetLevelId: it.budget_level_id,
    areaUsed: it.area_used,
  }))

  const { items: resolvedItems } = await resolveItemsAgainstCurrentRates(
    items, companyId, budget.project_area
  )

  await budgetRepo.replaceItems(id, companyId, resolvedItems.map(it => ({
    customLabel: it.customLabel,
    budgetLevelId: it.budgetLevelId || null,
    areaUsed: it.areaUsed ?? null,
    rateSnapshotValue: it.rateValue,
    rateType: it.rateType,
    lineTotal: it.lineTotal,
  })))

  // Rebusca com os JOINs (title_label/level_label) para montar o payload
  // no MESMO formato usado por finalize() — nunca a partir de resolvedItems cru.
  const refreshed = await budgetRepo.findById(id, companyId)
  const payload = buildSnapshotPayload(refreshed)

  await budgetRepo.createSnapshot(id, companyId, {
    payload, totalAmount: payload.total, createdBy: userId,
  })

  return budgetRepo.findById(id, companyId)
}

// ── Busca o snapshot mais recente com payload completo (para o PDF) ────
const getLatestSnapshotFull = async (id, companyId) => {
  const budget = await budgetRepo.findById(id, companyId)
  if (!budget) throw { status: 404, message: 'Orçamento não encontrado' }

  const snapshot = await budgetRepo.getLatestSnapshot(id, companyId)
  return { budget, snapshot }
}

const remove = async (id, companyId) => {
  const existing = await budgetRepo.findById(id, companyId)
  if (!existing) throw { status: 404, message: 'Orçamento não encontrado' }
  await budgetRepo.remove(id, companyId)
}

module.exports = {
  calculatePreview,
  getAll, getById,
  create, update, remove,
  finalize,
  checkDivergence,
  applyCurrentRatesToDraft,
  recalculateFinalized,
  getLatestSnapshotFull,
}