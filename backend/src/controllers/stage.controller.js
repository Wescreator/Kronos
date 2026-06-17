const stageRepo = require('../repositories/stage.repository')
const R         = require('../utils/response')

const asyncHandler = fn => (req, res) =>
  Promise.resolve(fn(req, res)).catch(err =>
    R.error(res, err.message, err.status || 500)
  )

const getStages = asyncHandler(async (req, res) => {
  const projectId = req.params.id

  const alreadyHas = await stageRepo.hasStages(projectId)
  if (!alreadyHas) {
    await stageRepo.createDefaultStages(projectId)
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

  const phase = await stageRepo.createPhase({
    stageId,
    phaseName:  phase_name.trim(),
    comment,
    createdBy:  req.user.id,
  })

  return R.created(res, { phase })
})

const updatePhase = asyncHandler(async (req, res) => {
  const { phaseId } = req.params
  const { phase_name, comment, is_completed } = req.body

  const current = await stageRepo.findPhaseById(phaseId)
  if (!current) return R.notFound(res, 'Fase não encontrada')

  const wasCompleted = current.is_completed
  const nowCompleted = is_completed === true || is_completed === 'true'

  const phase = await stageRepo.updatePhase(phaseId, {
    phaseName:    phase_name,
    comment,
    nowCompleted: is_completed !== undefined ? nowCompleted : undefined,
    wasCompleted,
    userId:       req.user.id,
  })

  return R.success(res, { phase })
})

const deletePhase = asyncHandler(async (req, res) => {
  await stageRepo.deletePhase(req.params.phaseId)
  return R.success(res, { message: 'Fase removida' })
})

module.exports = { getStages, addPhase, updatePhase, deletePhase }