const proposalService = require('../services/proposal.service')
const R = require('../utils/response')

const asyncHandler = fn => (req, res) =>
  Promise.resolve(fn(req, res)).catch(err =>
    R.error(res, err.message, err.status || 500)
  )

const getAll = asyncHandler(async (req, res) => {
  const result = await proposalService.getAll(req.query)
  return R.success(res, result)
})

const getById = asyncHandler(async (req, res) => {
  const proposal = await proposalService.getById(req.params.id)
  return R.success(res, { proposal })
})

const create = asyncHandler(async (req, res) => {
  const proposal = await proposalService.create(req.body, req.user.id)
  return R.created(res, { proposal })
})

const update = asyncHandler(async (req, res) => {
  const proposal = await proposalService.update(req.params.id, req.body)
  return R.success(res, { proposal })
})

const duplicate = asyncHandler(async (req, res) => {
  const proposal = await proposalService.duplicate(req.params.id, req.user.id)
  return R.created(res, { proposal })
})

const remove = asyncHandler(async (req, res) => {
  await proposalService.remove(req.params.id)
  return R.success(res, { message: 'Proposta excluída' })
})

module.exports = {getAll, getById, create, update, duplicate, remove
}