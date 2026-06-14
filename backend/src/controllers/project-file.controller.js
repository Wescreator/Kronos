const driveService = require('../services/drive.service')
const fileRepo     = require('../repositories/project-file.repository')
const projectRepo  = require('../repositories/project.repository')
const R            = require('../utils/response')

const uploadFile = async (req, res) => {
  try {
    if (!req.file) return R.badRequest(res, 'Nenhum arquivo enviado')

    const projectId = req.params.id
    const project   = await projectRepo.findById(projectId)

    if (!project)              return R.error(res, 'Projeto não encontrado', 404)
    if (!project.drive_folder_id) return R.error(res, 'Projeto não possui pasta no Google Drive. Contate o administrador.', 500)

    console.log(`[FileUpload] Projeto: ${projectId} | Pasta Drive: ${project.drive_folder_id}`)
    console.log(`[FileUpload] Arquivo: "${req.file.originalname}" | Tamanho: ${req.file.size} bytes | MIME: ${req.file.mimetype}`)

    // Upload para o Google Drive — usa buffer (memoryStorage)
    const driveFile = await driveService.uploadFile(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      project.drive_folder_id
    )

    // Upload só é considerado concluído após persistência no banco
    const file = await fileRepo.create({
      projectId,
      uploadedBy:   req.user.id,
      fileName:     req.file.originalname,
      fileSize:     req.file.size,
      mimeType:     req.file.mimetype,
      driveFileId:  driveFile.id,
      driveUrl:     driveFile.url,
    })

    console.log(`[FileUpload] Sucesso. DB ID: ${file.id} | Drive ID: ${driveFile.id}`)

    return R.created(res, { file })
  } catch (err) {
    console.error('[FileUpload] Erro:', err.message)
    return R.error(res, err.message, err.status || 500)
  }
}

const listFiles = async (req, res) => {
  try {
    const files = await fileRepo.findByProject(req.params.id)
    return R.success(res, { files })
  } catch (err) {
    return R.error(res, err.message, err.status || 500)
  }
}

module.exports = { uploadFile, listFiles }