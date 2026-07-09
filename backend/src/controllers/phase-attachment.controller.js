const attachmentRepo = require('../repositories/phase-attachment.repository')
const stageRepo      = require('../repositories/stage.repository')
const fileService    = require('../services/file.service')
const { assertProjectAccess, canManageResource } = require('../utils/authz')
const R = require('../utils/response')

const asyncHandler = fn => (req, res) =>
  Promise.resolve(fn(req, res)).catch(err => R.error(res, err.message, err.status || 500))

const uploadAttachment = asyncHandler(async (req, res) => {
  const { phaseId } = req.params
  if (!req.file) return R.badRequest(res, 'Nenhum arquivo enviado')

  const owner = await stageRepo.findPhaseOwner(phaseId)
  if (!owner || owner.company_id !== req.tenant.id) return R.notFound(res, 'Fase não encontrada')

  await assertProjectAccess(owner.project_id, req)

  // Reaproveita fileService.upload(), o mesmo usado para a capa do projeto —
  // sobe ao R2 e devolve object_key/url, sem gravar em project_files (que é
  // exclusivo dos anexos de projeto).
  const uploaded = await fileService.upload({
    buffer: req.file.buffer,
    originalFilename: req.file.originalname,
    mimeType: req.file.mimetype,
    folder: `phases/${phaseId}`,
  })

  const attachment = await attachmentRepo.create({
    phaseId,
    companyId: req.tenant.id,
    uploadedBy: req.user.user_id,
    fileName: req.file.originalname,
    fileSize: req.file.buffer?.length || 0,
    mimeType: req.file.mimetype,
    objectKey: uploaded.object_key,
    url: uploaded.url,
  })

  return R.created(res, { attachment: { ...attachment, uploaded_by_name: req.user.name } })
})

const deleteAttachment = asyncHandler(async (req, res) => {
  const { attachmentId } = req.params

  const owner = await attachmentRepo.findOwner(attachmentId)
  if (!owner || owner.company_id !== req.tenant.id) return R.notFound(res, 'Anexo não encontrado')

  if (!canManageResource(owner.uploaded_by, req)) {
    return R.forbidden(res, 'Apenas quem anexou, administradores ou o proprietário podem excluir este arquivo')
  }

  await fileService.remove(owner.object_key)
  await attachmentRepo.remove(attachmentId)

  return R.success(res, { message: 'Anexo removido' })
})

module.exports = { uploadAttachment, deleteAttachment }