// backend/src/controllers/budgetConfig.controller.js
const budgetConfigService = require('../services/budgetConfig.service')
const R = require('../utils/response')

const asyncHandler = fn => (req, res) =>
  Promise.resolve(fn(req, res)).catch(err =>
    R.error(res, err.message, err.status || 500)
  )

const getStructure = asyncHandler(async (req, res) => {
  const data = await budgetConfigService.getStructure(req.tenant.id)
  return R.success(res, data)
})

const createTitle = asyncHandler(async (req, res) => {
  const title = await budgetConfigService.createTitle(req.tenant.id, req.body)
  return R.created(res, { title })
})

const updateTitle = asyncHandler(async (req, res) => {
  const title = await budgetConfigService.updateTitle(req.params.id, req.tenant.id, req.body)
  return R.success(res, { title })
})

const removeTitle = asyncHandler(async (req, res) => {
  await budgetConfigService.removeTitle(req.params.id, req.tenant.id)
  return R.success(res, { message: 'Título removido' })
})

const createLevel = asyncHandler(async (req, res) => {
  const level = await budgetConfigService.createLevel(req.tenant.id, req.body)
  return R.created(res, { level })
})

const updateLevel = asyncHandler(async (req, res) => {
  const level = await budgetConfigService.updateLevel(req.params.id, req.tenant.id, req.body)
  return R.success(res, { level })
})

const removeLevel = asyncHandler(async (req, res) => {
  await budgetConfigService.removeLevel(req.params.id, req.tenant.id)
  return R.success(res, { message: 'Nível removido' })
})

const setLevelRate = asyncHandler(async (req, res) => {
  const rate = await budgetConfigService.setLevelRate(req.params.id, req.tenant.id, req.body)
  return R.success(res, { rate })
})

module.exports = {
  getStructure,
  createTitle, updateTitle, removeTitle,
  createLevel, updateLevel, removeLevel,
  setLevelRate,
}