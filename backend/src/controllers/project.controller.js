const projectService = require('../services/project.service')
const R = require('../utils/response')

const getAll = async (req, res) => {
  try {
    const result = await projectService.getAll(req.query)
    return R.success(res, result)
  } catch (err) { return R.error(res, err.message, err.status || 500) }
}

const getById = async (req, res) => {
  try {
    const project = await projectService.getById(req.params.id)
    return R.success(res, { project })
  } catch (err) { return R.error(res, err.message, err.status || 500) }
}

const create = async (req, res) => {
  try {
    const project = await projectService.create(req.body, req.user.id)
    return R.created(res, { project })
  } catch (err) { return R.error(res, err.message, err.status || 500) }
}

const update = async (req, res) => {
  try {
    const project = await projectService.update(req.params.id, req.body, req.user.id)
    return R.success(res, { project })
  } catch (err) { return R.error(res, err.message, err.status || 500) }
}

const uploadCover = async (req, res) => {
  try {
    if (!req.file) return R.badRequest(res, 'Nenhum arquivo enviado')
    const url = `/uploads/images/${req.file.filename}`
    const project = await projectService.updateCover(req.params.id, url)
    return R.success(res, { project })
  } catch (err) { return R.error(res, err.message, err.status || 500) }
}

const getStatusHistory = async (req, res) => {
  try {
    const history = await projectService.getStatusHistory(req.params.id)
    return R.success(res, { history })
  } catch (err) { return R.error(res, err.message, err.status || 500) }
}

const addMember = async (req, res) => {
  try {
    await projectService.addMember(req.params.id, req.body.user_id)
    return R.success(res, { message: 'Membro adicionado' })
  } catch (err) { return R.error(res, err.message, err.status || 500) }
}

const removeMember = async (req, res) => {
  try {
    await projectService.removeMember(req.params.id, req.params.userId)
    return R.success(res, { message: 'Membro removido' })
  } catch (err) { return R.error(res, err.message, err.status || 500) }
}

module.exports = { getAll, getById, create, update, uploadCover, getStatusHistory, addMember, removeMember }