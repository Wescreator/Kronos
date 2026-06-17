const projectService = require('../services/project.service')
const R = require('../utils/response')

const asyncHandler = fn => (req, res) =>
  Promise.resolve(fn(req, res)).catch(err =>
    R.error(res, err.message, err.status || 500)
  )

const getAll = asyncHandler(async (req, res) => {
  const result = await projectService.getAll(req.query)
  return R.success(res, result)
})

const getById = asyncHandler(async (req, res) => {
  const project = await projectService.getById(req.params.id)
  return R.success(res, { project })
})

const create = asyncHandler(async (req, res) => {
  const project = await projectService.create(req.body, req.user.id)
  return R.created(res, { project })
})

const update = asyncHandler(async (req, res) => {
  const project = await projectService.update(
    req.params.id,
    req.body,
    req.user.id
  )
  return R.success(res, { project })
})

const uploadCover = asyncHandler(async (req, res) => {
  if (!req.file) {
    return R.badRequest(res, 'Nenhum arquivo enviado')
  }

  const url = `/uploads/images/${req.file.filename}`
  const project = await projectService.updateCover(req.params.id, url)

  return R.success(res, { project })
})

const getStatusHistory = asyncHandler(async (req, res) => {
  const history = await projectService.getStatusHistory(req.params.id)
  return R.success(res, { history })
})

const addMember = asyncHandler(async (req, res) => {
  await projectService.addMember(req.params.id, req.body.user_id)
  return R.success(res, { message: 'Membro adicionado' })
})

const removeMember = asyncHandler(async (req, res) => {
  await projectService.removeMember(req.params.id, req.params.userId)
  return R.success(res, { message: 'Membro removido' })
})

module.exports = {getAll, getById, create, update, uploadCover, getStatusHistory, addMember, removeMember
}