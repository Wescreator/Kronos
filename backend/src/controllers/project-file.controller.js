const fileService    = require('../services/file.service')
const projectService = require('../services/project.service')
const R = require('../utils/response')

const uploadFile = async (req, res) => {
  try {
    if (!req.file) return R.badRequest(res, 'Nenhum arquivo enviado')

    const projectId = req.params.id

    // Garante que o projeto existe e pertence ao tenant antes de aceitar o upload
    await projectService.getById(projectId, req.tenant.id)

    const file = await fileService.uploadForProject({
      buffer:           req.file.buffer,
      originalFilename: req.file.originalname,
      mimeType:         req.file.mimetype,
      uploadedBy:       req.user.user_id,
      projectId,
    })

    const url = await fileService.getUrlFromKey(file.object_key)

    return R.created(res, { file: { ...file, url } })
  } catch (err) {
    return R.error(res, err.message, err.status || 500)
  }
}

const listFiles = async (req, res) => {
  try {
    const projectId = req.params.id

    // Garante que o projeto existe e pertence ao tenant antes de listar
    await projectService.getById(projectId, req.tenant.id)

    const files = await fileService.listByProject(projectId)
    return R.success(res, { files })
  } catch (err) {
    return R.error(res, err.message, err.status || 500)
  }
}

module.exports = { uploadFile, listFiles }