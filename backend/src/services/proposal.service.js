const proposalRepo = require('../repositories/proposal.repository')
const AppError = require('../utils/AppError')
const { paginate, paginatedResponse } = require('../utils/pagination')

// ── Listar todas ───────────────────────────────────────────────
const getAll = async (query, companyId) => {
  const { page, limit, offset } = paginate(query)
  const { rows, total } = await proposalRepo.findAll({
    companyId,
    limit,
    offset,
    search: query.search,
  })
  return paginatedResponse(rows, total, page, limit)
}

// ── Buscar por ID ──────────────────────────────────────────────
const getById = async (id, companyId) => {
  const proposal = await proposalRepo.findById(id, companyId)
  if (!proposal) throw new AppError(404, 'Proposta não encontrada')
  return proposal
}

// ── Criar ──────────────────────────────────────────────────────
const create = async (data, userId, companyId) => {
  if (!data.title || !data.title.trim()) {
    throw new AppError(400, 'Título é obrigatório')
  }

  if (!userId) {
    throw new AppError(400, 'createdBy inválido')
  }

  if (!companyId) {
    throw new AppError(400, 'companyId inválido')
  }

  // Número + cabeçalho + filhos numa única transação (ver createWithChildren).
  const proposal = await proposalRepo.createWithChildren({
    companyId,
    title: data.title.trim(),
    clientId: data.client_id || null,
    clientName: data.client_name || null,
    serviceObject: data.service_object || '',
    finalNotes: data.final_notes || null,
    serviceDeadline: data.service_deadline || null,
    validUntil: data.valid_until || null,
    paymentMessage: data.payment_message || null,
    createdBy: userId,
    // Normalização defensiva dos arrays
    scopeItems:   Array.isArray(data.scope_items)   ? data.scope_items   : [],
    services:     Array.isArray(data.services)      ? data.services      : [],
    paymentTerms: Array.isArray(data.payment_terms) ? data.payment_terms : [],
  })

  return proposalRepo.findById(proposal.id, companyId)
}

// ── Atualizar ──────────────────────────────────────────────────
const update = async (id, data, companyId) => {
  const existing = await proposalRepo.findById(id, companyId)
  if (!existing) throw new AppError(404, 'Proposta não encontrada')

  const allowed = [
    'title',
    'client_id',
    'client_name',
    'service_object',
    'final_notes',
    'service_deadline',
    'valid_until',
    'payment_message',
    'status',
  ]

  const fields = {}
  for (const key of allowed) {
    if (data[key] !== undefined) fields[key] = data[key]
  }

  if (Object.keys(fields).length > 0) {
    await proposalRepo.update(id, companyId, fields)
  }

  await Promise.all([
    data.scope_items !== undefined &&
      proposalRepo.replaceScopeItems(id, companyId, data.scope_items),

    data.services !== undefined &&
      proposalRepo.replaceServices(id, companyId, data.services),

    data.payment_terms !== undefined &&
      proposalRepo.replacePaymentTerms(id, companyId, data.payment_terms),
  ])

  return proposalRepo.findById(id, companyId)
}

// ── Duplicar ───────────────────────────────────────────────────
const duplicate = async (id, userId, companyId) => {
  const original = await proposalRepo.findById(id, companyId)
  if (!original) throw new AppError(404, 'Proposta não encontrada')

  const copy = await proposalRepo.createWithChildren({
    companyId,
    title: `${original.title} (cópia)`,
    clientId: original.client_id,
    clientName: original.client_name,
    serviceObject: original.service_object,
    finalNotes: original.final_notes,
    serviceDeadline: original.service_deadline,
    validUntil: original.valid_until,
    paymentMessage: original.payment_message,
    createdBy: userId,
    scopeItems:   original.scope_items   || [],
    services:     original.services      || [],
    paymentTerms: original.payment_terms || [],
  })

  return proposalRepo.findById(copy.id, companyId)
}

// ── Excluir ────────────────────────────────────────────────────
const remove = async (id, companyId) => {
  const existing = await proposalRepo.findById(id, companyId)
  if (!existing) throw new AppError(404, 'Proposta não encontrada')

  await proposalRepo.remove(id, companyId)
}

module.exports = {
  getAll,
  getById,
  create,
  update,
  duplicate,
  remove,
}