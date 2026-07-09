const budgetService = require('../services/budget.service')
const R = require('../utils/response')

const asyncHandler = fn => (req, res) =>
  Promise.resolve(fn(req, res)).catch(err =>
    R.error(res, err.message, err.status || 500)
  )

const getAll = asyncHandler(async (req, res) => {
  const result = await budgetService.getAll(req.query, req.tenant.id)
  return R.success(res, result)
})

const getById = asyncHandler(async (req, res) => {
  const budget = await budgetService.getById(req.params.id, req.tenant.id)
  return R.success(res, { budget })
})

const calculatePreview = asyncHandler(async (req, res) => {
  const result = await budgetService.calculatePreview(req.body, req.tenant.id)
  return R.success(res, result)
})

const create = asyncHandler(async (req, res) => {
  const budget = await budgetService.create(req.body, req.user.user_id, req.tenant.id)
  return R.created(res, { budget })
})

const update = asyncHandler(async (req, res) => {
  const budget = await budgetService.update(req.params.id, req.body, req.tenant.id)
  return R.success(res, { budget })
})

const remove = asyncHandler(async (req, res) => {
  await budgetService.remove(req.params.id, req.tenant.id)
  return R.success(res, { message: 'Orçamento excluído' })
})

const finalize = asyncHandler(async (req, res) => {
  const budget = await budgetService.finalize(req.params.id, req.tenant.id, req.user.user_id)
  return R.success(res, { budget })
})

const checkDivergence = asyncHandler(async (req, res) => {
  const result = await budgetService.checkDivergence(req.params.id, req.tenant.id)
  return R.success(res, result)
})

const applyCurrentRates = asyncHandler(async (req, res) => {
  const budget = await budgetService.applyCurrentRatesToDraft(req.params.id, req.tenant.id)
  return R.success(res, { budget })
})

const recalculate = asyncHandler(async (req, res) => {
  const budget = await budgetService.recalculateFinalized(req.params.id, req.tenant.id, req.user.user_id)
  return R.success(res, { budget })
})

const getLatestSnapshot = asyncHandler(async (req, res) => {
  const result = await budgetService.getLatestSnapshotFull(req.params.id, req.tenant.id)
  return R.success(res, result)
})

module.exports = {
  getAll, getById, calculatePreview,
  create, update, remove,
  finalize, checkDivergence, applyCurrentRates, recalculate,
  getLatestSnapshot,
}