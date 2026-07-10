const stageRepo       = require('../repositories/stage.repository')
const AppError = require('../utils/AppError')
const projectRepo     = require('../repositories/project.repository')
const commentRepo     = require('../repositories/phase-comment.repository')
const attachmentRepo  = require('../repositories/phase-attachment.repository')
const fileService     = require('../services/file.service')
const { assertProjectAccess, canManageResource } = require('../utils/authz')
const R = require('../utils/response')

const asyncHandler = fn => (req, res) =>
  Promise.resolve(fn(req, res)).catch(err =>
    R.error(res, err.message, err.status || 500)
  )

async function assertProjectInTenant(projectId, companyId) {
  const project = await projectRepo.findById(projectId, companyId)
  if (!project) throw new AppError(404, 'Projeto não encontrado')
  return project
}

// ───────── ETAPAS ─────────

const getStages = asyncHandler(async (req, res) => {
  const projectId = req.params.id
  await assertProjectInTenant(projectId, req.tenant.id)

  const stages   = await stageRepo.findStagesByProject(projectId)
  const stageIds = stages.map(s => s.id)
  const phases   = await stageRepo.findPhasesByStageIds(stageIds)
  const phaseIds = phases.map(p => p.id)

  const [comments, attachments] = await Promise.all([
    commentRepo.findByPhaseIds(phaseIds),
    attachmentRepo.findByPhaseIds(phaseIds),
  ])

  const result = stages.map(stage => ({
    ...stage,
    phases: phases
      .filter(ph => ph.project_stage_id === stage.id)
      .map(ph => ({
        ...ph,
        comments:    comments.filter(c => c.phase_id === ph.id),
        attachments: attachments.filter(a => a.phase_id === ph.id),
      })),
  }))

  return R.success(res, { stages: result })
})

const createStage = asyncHandler(async (req, res) => {
  const projectId = req.params.id
  const { stage_name } = req.body
  if (!stage_name?.trim()) return R.badRequest(res, 'Nome da etapa é obrigatório')

  await assertProjectInTenant(projectId, req.tenant.id)
  await assertProjectAccess(projectId, req)

  const stage = await stageRepo.createStage({
    projectId, companyId: req.tenant.id, stageName: stage_name.trim(), createdBy: req.user.user_id,
  })

  return R.created(res, { stage: { ...stage, phases: [] } })
})

const updateStage = asyncHandler(async (req, res) => {
  const { stageId } = req.params
  const { stage_name } = req.body
  if (!stage_name?.trim()) return R.badRequest(res, 'Nome da etapa é obrigatório')

  const owner = await stageRepo.findStageOwner(stageId)
  if (!owner || owner.company_id !== req.tenant.id) return R.notFound(res, 'Etapa não encontrada')

  await assertProjectAccess(owner.project_id, req)

  const stage = await stageRepo.updateStage(stageId, stage_name.trim())
  return R.success(res, { stage })
})

const deleteStage = asyncHandler(async (req, res) => {
  const { stageId } = req.params

  const owner = await stageRepo.findStageOwner(stageId)
  if (!owner || owner.company_id !== req.tenant.id) return R.notFound(res, 'Etapa não encontrada')

  if (!canManageResource(owner.created_by, req)) {
    return R.forbidden(res, 'Apenas quem criou a etapa, administradores ou o proprietário podem excluí-la')
  }

  // Limpa os anexos (R2) de todas as fases da etapa antes do cascade no banco
  const attachments = await attachmentRepo.findByStageId(stageId)
  await stageRepo.deleteStage(stageId)
  await Promise.allSettled(attachments.map(a => fileService.remove(a.object_key)))

  return R.success(res, { message: 'Etapa removida' })
})

const reorderStages = asyncHandler(async (req, res) => {
  const projectId = req.params.id
  const { ordered_ids } = req.body
  if (!Array.isArray(ordered_ids) || ordered_ids.length === 0) {
    return R.badRequest(res, 'Lista de etapas inválida')
  }

  await assertProjectInTenant(projectId, req.tenant.id)
  await assertProjectAccess(projectId, req)

  await stageRepo.reorderStages(projectId, req.tenant.id, ordered_ids)
  return R.success(res, { message: 'Ordem atualizada' })
})

// ───────── FASES ─────────

const addPhase = asyncHandler(async (req, res) => {
  const { stageId } = req.params
  const { phase_name } = req.body

  if (!phase_name?.trim()) return R.badRequest(res, 'Nome da fase é obrigatório')

  const owner = await stageRepo.findStageOwner(stageId)
  if (!owner || owner.company_id !== req.tenant.id) return R.notFound(res, 'Etapa não encontrada')

  await assertProjectAccess(owner.project_id, req)

  const phase = await stageRepo.createPhase({
    stageId, phaseName: phase_name.trim(), createdBy: req.user.user_id, companyId: req.tenant.id,
  })

  return R.created(res, { phase: { ...phase, comments: [], attachments: [] } })
})

const updatePhase = asyncHandler(async (req, res) => {
  const { phaseId } = req.params
  const { phase_name, is_completed } = req.body

  const owner = await stageRepo.findPhaseOwner(phaseId)
  if (!owner || owner.company_id !== req.tenant.id) return R.notFound(res, 'Fase não encontrada')

  await assertProjectAccess(owner.project_id, req)

  const current = await stageRepo.findPhaseById(phaseId)
  if (!current) return R.notFound(res, 'Fase não encontrada')

  const fields = {}
  const isRenaming = phase_name !== undefined && phase_name.trim() !== current.phase_name

  if (phase_name !== undefined) {
    if (!phase_name.trim()) return R.badRequest(res, 'Nome da fase é obrigatório')
    fields.phaseName = phase_name.trim()
  }

  if (is_completed !== undefined) {
    const nowCompleted = is_completed === true || is_completed === 'true'
    fields.isCompleted = nowCompleted
    fields.completedBy = nowCompleted ? req.user.user_id : null
    fields.completedAt = nowCompleted ? new Date() : null
  } else if (isRenaming && current.is_completed) {
    // Editar o nome da fase invalida a confirmação de conclusão anterior —
    // precisa ser marcada como concluída de novo.
    fields.isCompleted = false
    fields.completedBy = null
    fields.completedAt = null
  }

  const phase = await stageRepo.updatePhase(phaseId, fields)
  return R.success(res, { phase })
})

const deletePhase = asyncHandler(async (req, res) => {
  const { phaseId } = req.params

  const owner = await stageRepo.findPhaseOwner(phaseId)
  if (!owner || owner.company_id !== req.tenant.id) return R.notFound(res, 'Fase não encontrada')

  const phase = await stageRepo.findPhaseById(phaseId)
  if (!canManageResource(phase?.created_by, req)) {
    return R.forbidden(res, 'Apenas quem criou a fase, administradores ou o proprietário podem excluí-la')
  }

  const attachments = await attachmentRepo.findByPhaseIds([phaseId])
  await stageRepo.deletePhase(phaseId)
  await Promise.allSettled(attachments.map(a => fileService.remove(a.object_key)))

  return R.success(res, { message: 'Fase removida' })
})

const reorderPhases = asyncHandler(async (req, res) => {
  const { stageId } = req.params
  const { ordered_ids } = req.body
  if (!Array.isArray(ordered_ids) || ordered_ids.length === 0) {
    return R.badRequest(res, 'Lista de fases inválida')
  }

  const owner = await stageRepo.findStageOwner(stageId)
  if (!owner || owner.company_id !== req.tenant.id) return R.notFound(res, 'Etapa não encontrada')

  await assertProjectAccess(owner.project_id, req)

  await stageRepo.reorderPhases(stageId, req.tenant.id, ordered_ids)
  return R.success(res, { message: 'Ordem atualizada' })
})

module.exports = {
  getStages, createStage, updateStage, deleteStage, reorderStages,
  addPhase, updatePhase, deletePhase, reorderPhases,
}