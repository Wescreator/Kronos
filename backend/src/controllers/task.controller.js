const taskService = require('../services/task.service')
const R = require('../utils/response')

const getAll     = async (req, res) => {
  try { return R.success(res, await taskService.getAll(req.query, req.tenant.id)) }
  catch (err) { return R.error(res, err.message, err.status || 500) }
}

const getById    = async (req, res) => {
  try { return R.success(res, { task: await taskService.getById(req.params.id, req.tenant.id) }) }
  catch (err) { return R.error(res, err.message, err.status || 500) }
}

const create     = async (req, res) => {
  try { return R.created(res, { task: await taskService.create(req.body, req.user.user_id, req.tenant.id) }) }
  catch (err) { return R.error(res, err.message, err.status || 500) }
}

const update     = async (req, res) => {
  try { return R.success(res, { task: await taskService.update(req.params.id, req.body, req.user.user_id, req.tenant.id) }) }
  catch (err) { return R.error(res, err.message, err.status || 500) }
}

const remove     = async (req, res) => {
  try {
    await taskService.remove(req.params.id, req.tenant.id)
    return R.success(res, { message: 'Tarefa excluída com sucesso' })
  } catch (err) { return R.error(res, err.message, err.status || 500) }
}

const addComment = async (req, res) => {
  try {
    // req.file (buffer) é passado diretamente ao service, que faz o
    // upload via fileService (R2) quando um arquivo está presente.
    const comment = await taskService.addComment(
      req.params.id,
      req.user.user_id,
      req.body.content,
      req.file || null,
      req.tenant.id
    )
    return R.created(res, { comment })
  } catch (err) { return R.error(res, err.message, err.status || 500) }
}

const getDashboard = async (req, res) => {
  try { return R.success(res, { stats: await taskService.getDashboardStats(req.tenant.id) }) }
  catch (err) { return R.error(res, err.message, err.status || 500) }
}

module.exports = { getAll, getById, create, update, remove, addComment, getDashboard }