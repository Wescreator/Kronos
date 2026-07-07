const postRepo = require('../repositories/post.repository')
const fileService = require('./file.service')
const notificationService = require('./notification.service')
const { paginate, paginatedResponse } = require('../utils/pagination')

const ADMIN_ROLES = ['developer', 'owner', 'admin']
const isAdmin = (role) => ADMIN_ROLES.includes(role)

const notFoundError = (message = 'Postagem não encontrada.') => {
  const error = new Error(message)
  error.status = 404
  return error
}

const forbiddenError = (message = 'Você não tem permissão para esta ação.') => {
  const error = new Error(message)
  error.status = 403
  return error
}

const validationError = (message) => {
  const error = new Error(message)
  error.status = 400
  return error
}

// Um post pode ser gerenciado (editado/excluído/receber novos anexos) por
// quem o criou ou por admin/owner/developer da empresa — regra confirmada
// explicitamente: vale para a empresa inteira, sem checar vínculo do admin
// com o projeto do post.
const canManagePost = (post, requester) =>
  isAdmin(requester.role) || post.created_by === requester.user_id

// ═══════════════════════════════════════════════════════════════════════
// Feed
// ═══════════════════════════════════════════════════════════════════════

/**
 * @param query      { project_id, page, limit }
 * @param requester  req.user decodificado do JWT (scope 'company' ou 'client')
 * @param companyId  req.tenant.id
 */
const getFeed = async (query, requester, companyId) => {
  const { page, limit, offset } = paginate(query)

  if (requester.scope === 'client') {
    const accessibleProjectIds = await postRepo.findClientAccessibleProjectIds(requester.user_id, companyId)

    if (accessibleProjectIds.length === 0) {
      return paginatedResponse([], 0, page, limit)
    }

    // Cliente pode opcionalmente filtrar por um projeto específico, desde
    // que esse projeto esteja entre os que ele tem acesso.
    if (query.project_id) {
      if (!accessibleProjectIds.includes(query.project_id)) {
        throw forbiddenError('Você não tem acesso a este projeto.')
      }
      const { rows, total } = await postRepo.findFeed({ companyId, projectId: query.project_id, limit, offset })
      return paginatedResponse(rows, total, page, limit)
    }

    const { rows, total } = await postRepo.findFeed({ companyId, projectIds: accessibleProjectIds, limit, offset })
    return paginatedResponse(rows, total, page, limit)
  }

  // Escopo empresa: vê tudo, com filtro opcional de projeto.
  const { rows, total } = await postRepo.findFeed({ companyId, projectId: query.project_id || null, limit, offset })
  return paginatedResponse(rows, total, page, limit)
}

const getPostById = async (id, requester, companyId) => {
  const post = await postRepo.findById(id, companyId)
  if (!post) throw notFoundError()

  if (requester.scope === 'client') {
    const hasAccess = await postRepo.clientHasProjectAccess(requester.user_id, post.project_id, companyId)
    if (!hasAccess) throw forbiddenError('Você não tem acesso a este projeto.')
  }

  const [attachments, comments] = await Promise.all([
    postRepo.findAttachments(id),
    postRepo.findComments(id),
  ])

  // Anexos de cada comentário — poucos comentários por post tipicamente,
  // então N+1 aqui é aceitável (mesmo padrão simples usado em task.repository
  // para assignees não agregados por comentário).
  for (const comment of comments) {
    comment.attachments = await postRepo.findCommentAttachments(comment.id)
  }

  return { ...post, attachments, comments }
}

// ═══════════════════════════════════════════════════════════════════════
// Criar / Editar / Excluir Post
// ═══════════════════════════════════════════════════════════════════════

/**
 * @param data  { project_id, content }
 * @param files array de arquivos (req.files, memoryStorage) — opcional
 */
const createPost = async (data, files, requester, companyId) => {
  if (requester.scope !== 'company') {
    throw forbiddenError('Apenas usuários da empresa podem criar postagens.')
  }
  if (!data.project_id) {
    throw validationError('O campo "project_id" é obrigatório — toda postagem precisa referenciar um projeto.')
  }
  const hasContent = typeof data.content === 'string' && data.content.trim().length > 0
  const hasFiles = Array.isArray(files) && files.length > 0
  if (!hasContent && !hasFiles) {
    throw validationError('Informe um texto ou anexe ao menos um arquivo.')
  }

  const post = await postRepo.create({
    companyId,
    projectId: data.project_id,
    createdBy: requester.user_id,
    content: hasContent ? data.content.trim() : null,
  })

  if (hasFiles) {
    await uploadAttachments(post.id, companyId, requester.user_id, files)
  }

  // Notifica os membros do projeto (exceto quem criou o post).
  const memberIds = await postRepo.findProjectMemberIds(data.project_id)
  const recipients = memberIds.filter(uid => uid !== requester.user_id)
  for (const uid of recipients) {
    await notificationService.notify({
      companyId,
      userId: uid,
      type: 'post_created',
      title: 'Nova postagem no projeto',
      body: hasContent ? data.content.trim().slice(0, 140) : 'Nova postagem com anexo(s)',
      link: `/app/posts?highlight=${post.id}`,
    })
  }

  return await getPostById(post.id, requester, companyId)
}

const updatePost = async (id, data, requester, companyId) => {
  const post = await postRepo.findById(id, companyId)
  if (!post) throw notFoundError()
  if (!canManagePost(post, requester)) {
    throw forbiddenError('Apenas o autor da postagem ou um administrador pode editá-la.')
  }

  const fields = {}
  if (data.content !== undefined) {
    const trimmed = typeof data.content === 'string' ? data.content.trim() : ''
    fields.content = trimmed || null
  }

  if (Object.keys(fields).length) {
    await postRepo.update(id, companyId, fields)
  }

  return await getPostById(id, requester, companyId)
}

const deletePost = async (id, requester, companyId) => {
  const post = await postRepo.findById(id, companyId)
  if (!post) throw notFoundError()
  if (!canManagePost(post, requester)) {
    throw forbiddenError('Apenas o autor da postagem ou um administrador pode excluí-la.')
  }

  // Coleta as chaves do R2 (post + comentários) ANTES de excluir — o
  // CASCADE do banco remove as linhas, mas não os objetos no bucket.
  const objectKeys = await postRepo.findAllObjectKeysForPost(id)
  for (const key of objectKeys) {
    await fileService.remove(key)
  }

  await postRepo.remove(id, companyId)
}

// ═══════════════════════════════════════════════════════════════════════
// Anexos de Post
// ═══════════════════════════════════════════════════════════════════════

const uploadAttachments = async (postId, companyId, uploadedBy, files) => {
  const created = []
  for (const file of files) {
    const { object_key, url } = await fileService.upload({
      buffer: file.buffer,
      originalFilename: file.originalname,
      mimeType: file.mimetype,
      folder: `posts/${postId}`,
    })
    const attachment = await postRepo.addAttachment({
      postId,
      companyId,
      uploadedBy,
      fileName: file.originalname,
      fileSize: file.buffer?.length || 0,
      mimeType: file.mimetype,
      objectKey: object_key,
      url,
    })
    created.push(attachment)
  }
  return created
}

const addAttachments = async (postId, files, requester, companyId) => {
  const post = await postRepo.findById(postId, companyId)
  if (!post) throw notFoundError()
  if (!canManagePost(post, requester)) {
    throw forbiddenError('Apenas o autor da postagem ou um administrador pode anexar arquivos.')
  }
  if (!Array.isArray(files) || files.length === 0) {
    throw validationError('Nenhum arquivo enviado.')
  }

  await uploadAttachments(postId, companyId, requester.user_id, files)
  return await postRepo.findAttachments(postId)
}

const removeAttachment = async (attachmentId, requester, companyId) => {
  const attachment = await postRepo.findAttachmentById(attachmentId)
  if (!attachment || attachment.company_id !== companyId) throw notFoundError('Anexo não encontrado.')

  const post = await postRepo.findById(attachment.post_id, companyId)
  if (!post) throw notFoundError()
  if (!canManagePost(post, requester)) {
    throw forbiddenError('Apenas o autor da postagem ou um administrador pode remover anexos.')
  }

  await fileService.remove(attachment.object_key)
  await postRepo.removeAttachment(attachmentId)
}

// ═══════════════════════════════════════════════════════════════════════
// Comentários
// ═══════════════════════════════════════════════════════════════════════

/**
 * @param data  { content }
 * @param files array de arquivos (opcional)
 */
const addComment = async (postId, data, files, requester, companyId) => {
  const post = await postRepo.findById(postId, companyId)
  if (!post) throw notFoundError()

  if (requester.scope === 'client') {
    const hasAccess = await postRepo.clientHasProjectAccess(requester.user_id, post.project_id, companyId)
    if (!hasAccess) throw forbiddenError('Você não tem acesso a este projeto.')
  }

  const hasContent = typeof data.content === 'string' && data.content.trim().length > 0
  const hasFiles = Array.isArray(files) && files.length > 0
  if (!hasContent && !hasFiles) {
    throw validationError('Informe um texto ou anexe ao menos um arquivo.')
  }

  const comment = await postRepo.addComment({
    postId,
    companyId,
    userId: requester.scope === 'company' ? requester.user_id : null,
    clientLeadId: requester.scope === 'client' ? requester.user_id : null,
    content: hasContent ? data.content.trim() : null,
  })

  if (hasFiles) {
    for (const file of files) {
      const { object_key, url } = await fileService.upload({
        buffer: file.buffer,
        originalFilename: file.originalname,
        mimeType: file.mimetype,
        folder: `comments/${comment.id}`,
      })
      await postRepo.addCommentAttachment({
        commentId: comment.id,
        companyId,
        fileName: file.originalname,
        fileSize: file.buffer?.length || 0,
        mimeType: file.mimetype,
        objectKey: object_key,
        url,
      })
    }
  }

  await notifyNewComment(post, comment, requester, companyId)

  const attachments = await postRepo.findCommentAttachments(comment.id)
  return { ...comment, attachments }
}

// Notifica o criador do post e os admins da empresa — nunca o cliente,
// mesmo que o comentário seja de um usuário interno.
const notifyNewComment = async (post, comment, requester, companyId) => {
  const notifyIds = new Set()

  if (post.created_by !== requester.user_id || requester.scope === 'client') {
    notifyIds.add(post.created_by)
  }

  const adminIds = await postRepo.findCompanyAdminIds(companyId)
  for (const adminId of adminIds) {
    if (requester.scope === 'company' && adminId === requester.user_id) continue
    notifyIds.add(adminId)
  }

  const preview = comment.content ? comment.content.slice(0, 140) : 'Novo anexo em comentário'

  for (const uid of notifyIds) {
    await notificationService.notify({
      companyId,
      userId: uid,
      type: 'post_comment',
      title: 'Novo comentário em uma postagem',
      body: preview,
      link: `/app/posts?highlight=${post.id}`,
    })
  }
}

/**
 * Exclusão de comentário — regra não especificada explicitamente no
 * escopo original (que definiu permissões apenas para o Post). Por
 * segurança, assumi: admin/owner/developer da empresa OU o próprio autor
 * do comentário (apenas se for usuário interno — cliente não pode excluir
 * o próprio comentário nesta primeira versão). CONFIRMAR com Wesley.
 */
const removeComment = async (commentId, requester, companyId) => {
  const comment = await postRepo.findCommentById(commentId)
  if (!comment || comment.company_id !== companyId) throw notFoundError('Comentário não encontrado.')

  if (requester.scope !== 'company') {
    throw forbiddenError('Apenas usuários da empresa podem excluir comentários.')
  }
  const isOwnComment = comment.user_id === requester.user_id
  if (!isAdmin(requester.role) && !isOwnComment) {
    throw forbiddenError('Você não tem permissão para excluir este comentário.')
  }

  const attachments = await postRepo.findCommentAttachments(commentId)
  for (const att of attachments) {
    await fileService.remove(att.object_key)
  }

  await postRepo.removeComment(commentId)
}

module.exports = {
  getFeed,
  getPostById,
  createPost,
  updatePost,
  deletePost,
  addAttachments,
  removeAttachment,
  addComment,
  removeComment,
}