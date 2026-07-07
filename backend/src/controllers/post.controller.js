const postService = require('../services/post.service')
const R = require('../utils/response')

// req.user vem do JWT decodificado (authenticate). Presente tanto para
// scope 'company' quanto 'client': { user_id, company_id, scope, role }.
// Para cliente, role é null e user_id é o id do clients_leads.

const getFeed = async (req, res) => {
  try {
    return R.success(res, await postService.getFeed(req.query, req.user, req.tenant.id))
  } catch (err) {
    return R.error(res, err.message, err.status || 500)
  }
}

const getById = async (req, res) => {
  try {
    const post = await postService.getPostById(req.params.id, req.user, req.tenant.id)
    return R.success(res, { post })
  } catch (err) {
    return R.error(res, err.message, err.status || 500)
  }
}

const create = async (req, res) => {
  try {
    const post = await postService.createPost(req.body, req.files, req.user, req.tenant.id)
    return R.created(res, { post })
  } catch (err) {
    return R.error(res, err.message, err.status || 500)
  }
}

const update = async (req, res) => {
  try {
    const post = await postService.updatePost(req.params.id, req.body, req.user, req.tenant.id)
    return R.success(res, { post })
  } catch (err) {
    return R.error(res, err.message, err.status || 500)
  }
}

const remove = async (req, res) => {
  try {
    await postService.deletePost(req.params.id, req.user, req.tenant.id)
    return R.success(res, { message: 'Postagem excluída com sucesso' })
  } catch (err) {
    return R.error(res, err.message, err.status || 500)
  }
}

const addAttachments = async (req, res) => {
  try {
    const attachments = await postService.addAttachments(req.params.id, req.files, req.user, req.tenant.id)
    return R.created(res, { attachments })
  } catch (err) {
    return R.error(res, err.message, err.status || 500)
  }
}

const removeAttachment = async (req, res) => {
  try {
    await postService.removeAttachment(req.params.attachmentId, req.user, req.tenant.id)
    return R.success(res, { message: 'Anexo removido com sucesso' })
  } catch (err) {
    return R.error(res, err.message, err.status || 500)
  }
}

const addComment = async (req, res) => {
  try {
    const comment = await postService.addComment(req.params.id, req.body, req.files, req.user, req.tenant.id)
    return R.created(res, { comment })
  } catch (err) {
    return R.error(res, err.message, err.status || 500)
  }
}

const removeComment = async (req, res) => {
  try {
    await postService.removeComment(req.params.commentId, req.user, req.tenant.id)
    return R.success(res, { message: 'Comentário excluído com sucesso' })
  } catch (err) {
    return R.error(res, err.message, err.status || 500)
  }
}

module.exports = {
  getFeed,
  getById,
  create,
  update,
  remove,
  addAttachments,
  removeAttachment,
  addComment,
  removeComment,
}