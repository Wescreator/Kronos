const proposalService = require('../services/proposal.service')
const R = require('../utils/response')

const getAll = async (req, res) => {
  try {
    const result = await proposalService.getAll(req.query)
    return R.success(res, result)
  } catch (err) { return R.error(res, err.message, err.status || 500) }
}

const getById = async (req, res) => {
  try {
    const proposal = await proposalService.getById(req.params.id)
    return R.success(res, { proposal })
  } catch (err) { return R.error(res, err.message, err.status || 500) }
}

const create = async (req, res) => {
  try {
    const proposal = await proposalService.create(req.body, req.user.id)
    return R.created(res, { proposal })
  } catch (err) { return R.error(res, err.message, err.status || 500) }
}

const update = async (req, res) => {
  try {
    const proposal = await proposalService.update(req.params.id, req.body)
    return R.success(res, { proposal })
  } catch (err) { return R.error(res, err.message, err.status || 500) }
}

const duplicate = async (req, res) => {
  try {
    const proposal = await proposalService.duplicate(req.params.id, req.user.id)
    return R.created(res, { proposal })
  } catch (err) { return R.error(res, err.message, err.status || 500) }
}

const remove = async (req, res) => {
  try {
    await proposalService.remove(req.params.id)
    return R.success(res, { message: 'Proposta excluída' })
  } catch (err) { return R.error(res, err.message, err.status || 500) }
}

module.exports = { getAll, getById, create, update, duplicate, remove }