const projectService = require('../services/project.service')
const fileService    = require('../services/file.service')
const R = require('../utils/response')

const getAll = async (req, res) => {
  try {
    const result = await projectService.getAll(req.query, req.tenant.id)
    return R.success(res, result)
  } catch (err) { return R.error(res, err.message, err.status || 500) }
}

const getById = async (req, res) => {
  try {
    const project = await projectService.getById(req.params.id, req.tenant.id)
    return R.success(res, { project })
  } catch (err) { return R.error(res, err.message, err.status || 500) }
}

const create = async (req, res) => {
  try {
    const project = await projectService.create(req.body, req.user.user_id, req.tenant.id)
    return R.created(res, { project })
  } catch (err) { return R.error(res, err.message, err.status || 500) }
}

const update = async (req, res) => {
  try {
    const project = await projectService.update(req.params.id, req.body, req.user.user_id, req.tenant.id)
    return R.success(res, { project })
  } catch (err) { return R.error(res, err.message, err.status || 500) }
}

const uploadCover = async (req, res) => {
  try {
    if (!req.file) return R.badRequest(res, 'Nenhum arquivo enviado')

    // Upload genérico ao R2 — cover não é vinculado via files de relacionamento,
    // é armazenado direto na coluna projects.cover_url (campo dedicado).
    const file = await fileService.upload({
      buffer:           req.file.buffer,
      originalFilename: req.file.originalname,
      mimeType:         req.file.mimetype,
      uploadedBy:       req.user.user_id,
      folder:           `projects/${req.params.id}/cover`,
    })

    const url = await fileService.getUrlFromKey(file.object_key)
    const project = await projectService.updateCover(req.params.id, url, req.tenant.id)

    return R.success(res, { project })
  } catch (err) { return R.error(res, err.message, err.status || 500) }
}

const getStatusHistory = async (req, res) => {
  try {
    const history = await projectService.getStatusHistory(req.params.id, req.tenant.id)
    return R.success(res, { history })
  } catch (err) { return R.error(res, err.message, err.status || 500) }
}

const addMember = async (req, res) => {
  try {
    await projectService.addMember(req.params.id, req.body.user_id, req.tenant.id)
    return R.success(res, { message: 'Membro adicionado' })
  } catch (err) { return R.error(res, err.message, err.status || 500) }
}

const removeMember = async (req, res) => {
  try {
    await projectService.removeMember(req.params.id, req.params.userId, req.tenant.id)
    return R.success(res, { message: 'Membro removido' })
  } catch (err) { return R.error(res, err.message, err.status || 500) }
}

module.exports = { getAll, getById, create, update, uploadCover, getStatusHistory, addMember, removeMember }