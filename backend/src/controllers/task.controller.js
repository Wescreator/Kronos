const taskService = require('../services/task.service')
const R = require('../utils/response')

const getAll     = async (req, res) => {
  try { return R.success(res, await taskService.getAll(req.query)) }
  catch (err) { return R.error(res, err.message, err.status || 500) }
}

const getById    = async (req, res) => {
  try { return R.success(res, { task: await taskService.getById(req.params.id) }) }
  catch (err) { return R.error(res, err.message, err.status || 500) }
}

const create     = async (req, res) => {
  try { return R.created(res, { task: await taskService.create(req.body, req.user.id) }) }
  catch (err) { return R.error(res, err.message, err.status || 500) }
}

const update     = async (req, res) => {
  try { return R.success(res, { task: await taskService.update(req.params.id, req.body, req.user.id) }) }
  catch (err) { return R.error(res, err.message, err.status || 500) }
}

const addComment = async (req, res) => {
  try {
    const fileUrl = req.file ? `/uploads/files/${req.file.filename}` : null
    const comment = await taskService.addComment(req.params.id, req.user.id, req.body.content, fileUrl)
    return R.created(res, { comment })
  } catch (err) { return R.error(res, err.message, err.status || 500) }
}

const getDashboard = async (req, res) => {
  try { return R.success(res, { stats: await taskService.getDashboardStats() }) }
  catch (err) { return R.error(res, err.message, err.status || 500) }
}

module.exports = { getAll, getById, create, update, addComment, getDashboard }