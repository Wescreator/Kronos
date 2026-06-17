const taskService = require('../services/task.service')
const R = require('../utils/response')

const asyncHandler = fn => (req, res) =>
  Promise.resolve(fn(req, res)).catch(err =>
    R.error(res, err.message, err.status || 500)
  )

const getAll = asyncHandler(async (req, res) => {
  const result = await taskService.getAll(req.query)
  return R.success(res, result)
})

const getById = asyncHandler(async (req, res) => {
  const task = await taskService.getById(req.params.id)
  return R.success(res, { task })
})

const create = asyncHandler(async (req, res) => {
  const task = await taskService.create(req.body, req.user.id)
  return R.created(res, { task })
})

const update = asyncHandler(async (req, res) => {
  const task = await taskService.update(
    req.params.id,
    req.body,
    req.user.id
  )

  return R.success(res, { task })
})

const addComment = asyncHandler(async (req, res) => {
  const fileUrl = req.file
    ? `/uploads/files/${req.file.filename}`
    : null

  const comment = await taskService.addComment(
    req.params.id,
    req.user.id,
    req.body.content,
    fileUrl
  )

  return R.created(res, { comment })
})

const getDashboard = asyncHandler(async (req, res) => {
  const stats = await taskService.getDashboardStats()
  return R.success(res, { stats })
})

module.exports = {getAll, getById, create, update, addComment, getDashboard
}