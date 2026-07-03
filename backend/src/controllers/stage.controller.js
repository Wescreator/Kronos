const stageRepo   = require('../repositories/stage.repository')
const projectRepo = require('../repositories/project.repository')
const R           = require('../utils/response')

const asyncHandler = fn => (req, res) =>
  Promise.resolve(fn(req, res)).catch(err =>
    R.error(res, err.message, err.status || 500)
  )

// Garante que o projeto pertence a empresa do solicitante.
async function assertProjectInTenant(projectId, companyId) {
  const project = await projectRepo.findById(projectId, companyId)
  if (!project) throw { status: 404, message: 'Projeto não encontrado' }
  return project
}

const getStages = asyncHandler(async (req, res) => {
  const projectId = req.params.id
  await assertProjectInTenant(projectId, req.tenant.id)

  const alreadyHas = await stageRepo.hasStages(projectId)
  if (!alreadyHas) {
    await stageRepo.createDefaultStages(projectId, req.tenant.id)
  }

  const stages = await stageRepo.findStagesByProject(projectId)
  const stageIds = stages.map(s => s.id)
  const phases   = await stageRepo.findPhasesByStageIds(stageIds)

  const result = stages.map(stage => ({
    ...stage,
    phases: phases.filter(ph => ph.project_stage_id === stage.id),
  }))

  return R.success(res, { stages: result })
})

const addPhase = asyncHandler(async (req, res) => {
  const { stageId } = req.params
  const { phase_name, comment } = req.body

  if (!phase_name?.trim()) {
    return R.badRequest(res, 'Nome da fase é obrigatório')
  }

  // Verifica que a etapa pertence a um projeto da empresa
  const owner = await stageRepo.findStageOwner(stageId)
  if (!owner || owner.company_id !== req.tenant.id) {
    return R.notFound(res, 'Etapa não encontrada')
  }

  const phase = await stageRepo.createPhase({
    stageId,
    phaseName:  phase_name.trim(),
    comment,
    createdBy:  req.user.user_id,
    companyId:  req.tenant.id,
  })

  return R.created(res, { phase })
})

const updatePhase = asyncHandler(async (req, res) => {
  const { phaseId } = req.params
  const { phase_name, comment, is_completed } = req.body

  const owner = await stageRepo.findPhaseOwner(phaseId)
  if (!owner || owner.company_id !== req.tenant.id) {
    return R.notFound(res, 'Fase não encontrada')
  }

  const current = await stageRepo.findPhaseById(phaseId)
  if (!current) return R.notFound(res, 'Fase não encontrada')

  const wasCompleted = current.is_completed
  const nowCompleted = is_completed === true || is_completed === 'true'

  const phase = await stageRepo.updatePhase(phaseId, {
    phaseName:    phase_name,
    comment,
    nowCompleted: is_completed !== undefined ? nowCompleted : undefined,
    wasCompleted,
    userId:       req.user.user_id,
  })

  return R.success(res, { phase })
})

const deletePhase = asyncHandler(async (req, res) => {
  const { phaseId } = req.params

  const owner = await stageRepo.findPhaseOwner(phaseId)
  if (!owner || owner.company_id !== req.tenant.id) {
    return R.notFound(res, 'Fase não encontrada')
  }

  await stageRepo.deletePhase(phaseId)
  return R.success(res, { message: 'Fase removida' })
})

module.exports = { getStages, addPhase, updatePhase, deletePhase }