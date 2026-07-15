const prisma = require('../config/prisma')
const AppError = require('../utils/AppError')
const projectRepo = require('../repositories/project.repository')
const stageRepo   = require('../repositories/stage.repository')
const companyRepo = require('../repositories/company.repository')

// ─────────────────────────────────────────────────────────────────────
// Relatório de Projeto (documento curado para gerar PDF).
//
// Persistência via Prisma tenant models (ProjectReport / ProjectReportItem).
// companyId é passado explicitamente nos creates (além de a extensão injetar)
// para funcionar também dentro do $transaction interativo, independentemente
// de a extensão ser aplicada ao client da transação.
// ─────────────────────────────────────────────────────────────────────

// Monta a árvore (etapas → fases) a partir das linhas planas.
function buildTree(items) {
  const childrenByParent = new Map()
  for (const i of items) {
    if (i.parentId) {
      if (!childrenByParent.has(i.parentId)) childrenByParent.set(i.parentId, [])
      childrenByParent.get(i.parentId).push(i)
    }
  }
  const toDTO = (i) => ({
    id: i.id, kind: i.kind, title: i.title, observation: i.observation,
    is_completed: i.isCompleted, source_id: i.sourceId, item_order: i.itemOrder,
  })
  return items
    .filter(i => !i.parentId)
    .sort((a, b) => a.itemOrder - b.itemOrder)
    .map(s => ({
      ...toDTO(s),
      phases: (childrenByParent.get(s.id) || [])
        .sort((a, b) => a.itemOrder - b.itemOrder)
        .map(toDTO),
    }))
}

// Dados do projeto + cliente vinculado + responsável técnico (p/ cabeçalho e
// assinaturas do PDF). Importados na hora — não ficam salvos no relatório.
async function loadContext(projectId, companyId) {
  const project = await projectRepo.findById(projectId, companyId)
  if (!project) throw new AppError(404, 'Projeto não encontrado')

  // Cliente vinculado ao projeto (CRM). Se não houver, usa o texto livre.
  const clientLead = await prisma.clientLead.findFirst({
    where: { projectId },
    select: { name: true, email: true, phone: true },
  })
  const company = await companyRepo.findById(companyId)

  return {
    project: {
      id: project.id, title: project.title, client: project.client,
      description: project.description, status: project.status,
      start_date: project.start_date, expected_date: project.expected_date,
      completed_date: project.completed_date, budget: project.budget,
    },
    client: clientLead || (project.client ? { name: project.client, email: null, phone: null } : null),
    responsible: {
      name: company?.responsible_name || null,
      role: company?.responsible_role || null,
    },
    company: {
      name: company?.name || null,
      trade_name: company?.trade_name || null,
      document: company?.document || null,
      email: company?.email || null,
      phone: company?.phone || null,
      logo_url: company?.logo_url || null,
    },
  }
}

// Sincroniza o relatório com as fases CONCLUÍDAS do projeto (a cada abertura):
// só fases marcadas como concluídas entram (com sua etapa); fases concluídas
// depois da 1ª abertura são acrescentadas; itens semeados que deixaram de ser
// elegíveis (fase desmarcada/excluída) são removidos SOMENTE se não tiverem
// relato do usuário. Itens custom (sourceId null) nunca são tocados.
async function syncCompletedItems(reportId, companyId, projectId) {
  const stages   = await stageRepo.findStagesByProject(projectId)
  const stageIds = stages.map(s => s.id)
  const phases   = await stageRepo.findPhasesByStageIds(stageIds)

  const phasesByStage = new Map()
  for (const ph of phases) {
    if (!phasesByStage.has(ph.project_stage_id)) phasesByStage.set(ph.project_stage_id, [])
    phasesByStage.get(ph.project_stage_id).push(ph)
  }

  const items = await prisma.projectReportItem.findMany({ where: { reportId } })
  const stageItemBySource = new Map(items.filter(i => !i.parentId && i.sourceId).map(i => [i.sourceId, i]))
  const phaseSourceIds    = new Set(items.filter(i => i.parentId && i.sourceId).map(i => i.sourceId))
  const completedPhaseIds = new Set(phases.filter(p => p.is_completed).map(p => p.id))

  // 1) Acrescenta fases concluídas que ainda não estão no relatório.
  let stageOrder = items.filter(i => !i.parentId).reduce((m, i) => Math.max(m, i.itemOrder), -1) + 1
  for (const s of stages) {
    const sPhases   = phasesByStage.get(s.id) || []
    const completed = sPhases.filter(p => p.is_completed)
    if (completed.length === 0) continue

    let stageItem = stageItemBySource.get(s.id)
    if (!stageItem) {
      stageItem = await prisma.projectReportItem.create({
        data: {
          companyId, reportId, parentId: null, kind: 'stage',
          title: s.stage_name, observation: null,
          isCompleted: sPhases.every(p => p.is_completed),
          sourceId: s.id, itemOrder: stageOrder++,
        },
      })
      stageItemBySource.set(s.id, stageItem)
    }

    let phaseOrder = items
      .filter(i => i.parentId === stageItem.id)
      .reduce((m, i) => Math.max(m, i.itemOrder), -1) + 1
    for (const ph of completed) {
      if (phaseSourceIds.has(ph.id)) continue
      await prisma.projectReportItem.create({
        data: {
          companyId, reportId, parentId: stageItem.id, kind: 'phase',
          title: ph.phase_name, observation: null, isCompleted: true,
          sourceId: ph.id, itemOrder: phaseOrder++,
        },
      })
    }
  }

  // 2) Remove fases semeadas não-concluídas (regra antiga importava todas)
  //    que não têm relato — sem apagar texto escrito pelo usuário.
  const stalePhaseIds = items
    .filter(i => i.parentId && i.sourceId && !completedPhaseIds.has(i.sourceId))
    .filter(i => !i.observation || !i.observation.trim())
    .map(i => i.id)
  if (stalePhaseIds.length > 0) {
    await prisma.projectReportItem.deleteMany({ where: { id: { in: stalePhaseIds } } })
  }

  // 3) Remove etapas semeadas que ficaram vazias, sem relato, e cuja etapa
  //    real não tem nenhuma fase concluída.
  const remaining = await prisma.projectReportItem.findMany({ where: { reportId } })
  const childCount = new Map()
  for (const i of remaining) {
    if (i.parentId) childCount.set(i.parentId, (childCount.get(i.parentId) || 0) + 1)
  }
  const staleStageIds = remaining
    .filter(i => !i.parentId && i.sourceId)
    .filter(i => !(childCount.get(i.id) > 0))
    .filter(i => !i.observation || !i.observation.trim())
    .filter(i => {
      const sPhases = phasesByStage.get(i.sourceId) || []
      return !sPhases.some(p => p.is_completed)
    })
    .map(i => i.id)
  if (staleStageIds.length > 0) {
    await prisma.projectReportItem.deleteMany({ where: { id: { in: staleStageIds } } })
  }
}

// Abre o relatório do projeto; cria na 1ª vez e sincroniza as fases
// concluídas a cada abertura.
const getOrCreate = async (projectId, companyId, userId) => {
  const project = await projectRepo.findById(projectId, companyId)
  if (!project) throw new AppError(404, 'Projeto não encontrado')

  let report = await prisma.projectReport.findFirst({ where: { projectId } })
  if (!report) {
    report = await prisma.projectReport.create({
      data: { companyId, projectId, createdBy: userId, updatedBy: userId },
    })
  }
  await syncCompletedItems(report.id, companyId, projectId)

  const items = await prisma.projectReportItem.findMany({ where: { reportId: report.id } })
  const ctx = await loadContext(projectId, companyId)
  return {
    report: {
      id: report.id, project_id: projectId,
      doc_title: report.docTitle, updated_at: report.updatedAt,
    },
    ...ctx,
    items: buildTree(items),
  }
}

// Salva a árvore editada (replace-all: apaga os itens e reinsere na ordem).
const save = async (projectId, companyId, userId, payload) => {
  const project = await projectRepo.findById(projectId, companyId)
  if (!project) throw new AppError(404, 'Projeto não encontrado')

  let report = await prisma.projectReport.findFirst({ where: { projectId } })
  if (!report) {
    report = await prisma.projectReport.create({
      data: { companyId, projectId, createdBy: userId, updatedBy: userId },
    })
  }
  const reportId = report.id

  await prisma.$transaction(async (tx) => {
    await tx.projectReportItem.deleteMany({ where: { reportId } })

    let order = 0
    for (const stage of (payload.items || [])) {
      const s = await tx.projectReportItem.create({
        data: {
          companyId, reportId, parentId: null, kind: 'stage',
          title: stage.title, observation: stage.observation || null,
          isCompleted: !!stage.is_completed, sourceId: stage.source_id || null,
          itemOrder: order++,
        },
      })
      let pOrder = 0
      for (const phase of (stage.phases || [])) {
        await tx.projectReportItem.create({
          data: {
            companyId, reportId, parentId: s.id, kind: 'phase',
            title: phase.title, observation: phase.observation || null,
            isCompleted: !!phase.is_completed, sourceId: phase.source_id || null,
            itemOrder: pOrder++,
          },
        })
      }
    }
    // doc_title: cabeçalho editável do documento ('' normaliza para null —
    // o frontend cai no padrão "Relatório de Projeto").
    const docTitle = (payload.doc_title || '').trim() || null
    await tx.projectReport.updateMany({
      where: { id: reportId },
      data: { updatedBy: userId, docTitle },
    })
  })

  const saved = await prisma.projectReport.findFirst({ where: { id: reportId } })
  const items = await prisma.projectReportItem.findMany({ where: { reportId } })
  const ctx = await loadContext(projectId, companyId)
  return {
    report: { id: reportId, project_id: projectId, doc_title: saved?.docTitle || null },
    ...ctx,
    items: buildTree(items),
  }
}

module.exports = { getOrCreate, save }
