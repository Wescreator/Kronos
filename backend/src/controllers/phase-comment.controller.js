const commentRepo = require('../repositories/phase-comment.repository')
const stageRepo   = require('../repositories/stage.repository')
const { assertProjectAccess, canManageResource } = require('../utils/authz')
const R = require('../utils/response')

const asyncHandler = fn => (req, res) =>
  Promise.resolve(fn(req, res)).catch(err => R.error(res, err.message, err.status || 500))

const addComment = asyncHandler(async (req, res) => {
  const { phaseId } = req.params
  const { content } = req.body
  if (!content?.trim()) return R.badRequest(res, 'Comentário não pode ser vazio')

  const owner = await stageRepo.findPhaseOwner(phaseId)
  if (!owner || owner.company_id !== req.tenant.id) return R.notFound(res, 'Fase não encontrada')

  await assertProjectAccess(owner.project_id, req)

  const comment = await commentRepo.create({
    phaseId, companyId: req.tenant.id, userId: req.user.user_id, content: content.trim(),
  })
  return R.created(res, { comment: { ...comment, author_name: req.user.name } })
})

const updateComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params
  const { content } = req.body
  if (!content?.trim()) return R.badRequest(res, 'Comentário não pode ser vazio')

  const owner = await commentRepo.findOwner(commentId)
  if (!owner || owner.company_id !== req.tenant.id) return R.notFound(res, 'Comentário não encontrado')

  if (!canManageResource(owner.author_id, req)) {
    return R.forbidden(res, 'Apenas o autor, administradores ou o proprietário podem editar este comentário')
  }

  const comment = await commentRepo.update(commentId, content.trim())
  return R.success(res, { comment })
})

const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params

  const owner = await commentRepo.findOwner(commentId)
  if (!owner || owner.company_id !== req.tenant.id) return R.notFound(res, 'Comentário não encontrado')

  if (!canManageResource(owner.author_id, req)) {
    return R.forbidden(res, 'Apenas o autor, administradores ou o proprietário podem excluir este comentário')
  }

  await commentRepo.remove(commentId)
  return R.success(res, { message: 'Comentário removido' })
})

module.exports = { addComment, updateComment, deleteComment }