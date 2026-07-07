const pool = require('../config/database')

// ═══════════════════════════════════════════════════════════════════════
// Posts
// ═══════════════════════════════════════════════════════════════════════

/**
 * Feed de postagens.
 *
 * - Escopo empresa (usuário interno): passa `projectId` (opcional, filtro
 *   manual) ou nenhum dos dois (vê tudo da empresa).
 * - Escopo cliente (portal): passa `projectIds` (array dos projetos aos
 *   quais o cliente tem acesso via client_project_access). Nunca os dois
 *   ao mesmo tempo — quem decide isso é o service.
 */
const findFeed = async ({ companyId, projectIds, projectId, limit, offset }) => {
  const conditions = ['p.company_id = $1']
  const params = [companyId]

  if (projectIds) {
    params.push(projectIds)
    conditions.push(`p.project_id = ANY($${params.length}::uuid[])`)
  } else if (projectId) {
    params.push(projectId)
    conditions.push(`p.project_id = $${params.length}`)
  }

  const where = `WHERE ${conditions.join(' AND ')}`
  const countParams = [...params]
  params.push(limit, offset)

  const { rows } = await pool.query(
    `SELECT p.*,
            pr.title AS project_title,
            u.name   AS created_by_name,
            u.avatar_url,
            (SELECT COUNT(*) FROM post_attachments pa WHERE pa.post_id = p.id) AS attachment_count,
            (SELECT COUNT(*) FROM post_comments pc WHERE pc.post_id = p.id)    AS comment_count
     FROM posts p
     JOIN projects pr ON pr.id = p.project_id
     JOIN users u     ON u.id = p.created_by
     ${where}
     ORDER BY p.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  )

  const { rows: cnt } = await pool.query(
    `SELECT COUNT(*) FROM posts p ${where}`,
    countParams
  )

  return { rows, total: parseInt(cnt[0].count) }
}

const findById = async (id, companyId) => {
  const { rows } = await pool.query(
    `SELECT p.*,
            pr.title AS project_title,
            u.name   AS created_by_name,
            u.avatar_url
     FROM posts p
     JOIN projects pr ON pr.id = p.project_id
     JOIN users u     ON u.id = p.created_by
     WHERE p.id = $1 AND p.company_id = $2`,
    [id, companyId]
  )
  return rows[0] || null
}

const create = async ({ companyId, projectId, createdBy, content }) => {
  const { rows } = await pool.query(
    `INSERT INTO posts (company_id, project_id, created_by, content)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [companyId, projectId, createdBy, content || null]
  )
  return rows[0]
}

const update = async (id, companyId, fields) => {
  const keys   = Object.keys(fields)
  const values = Object.values(fields)
  const sets   = keys.map((k, i) => `${k} = $${i + 1}`).join(', ')
  values.push(id, companyId)

  const { rows } = await pool.query(
    `UPDATE posts SET ${sets}, updated_at = NOW()
     WHERE id = $${values.length - 1} AND company_id = $${values.length} RETURNING *`,
    values
  )
  return rows[0]
}

const remove = async (id, companyId) => {
  const { rows } = await pool.query(
    `DELETE FROM posts WHERE id = $1 AND company_id = $2 RETURNING id`,
    [id, companyId]
  )
  return rows[0]
}

// ═══════════════════════════════════════════════════════════════════════
// Anexos de Post
// ═══════════════════════════════════════════════════════════════════════

const findAttachments = async (postId) => {
  const { rows } = await pool.query(
    `SELECT * FROM post_attachments WHERE post_id = $1 ORDER BY created_at ASC`,
    [postId]
  )
  return rows
}

const findAttachmentById = async (id) => {
  const { rows } = await pool.query(`SELECT * FROM post_attachments WHERE id = $1`, [id])
  return rows[0] || null
}

const addAttachment = async ({ postId, companyId, uploadedBy, fileName, fileSize, mimeType, objectKey, url }) => {
  const { rows } = await pool.query(
    `INSERT INTO post_attachments (post_id, company_id, uploaded_by, file_name, file_size, mime_type, object_key, url)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [postId, companyId, uploadedBy, fileName, fileSize || 0, mimeType, objectKey, url]
  )
  return rows[0]
}

const removeAttachment = async (id) => {
  await pool.query(`DELETE FROM post_attachments WHERE id = $1`, [id])
}

// ═══════════════════════════════════════════════════════════════════════
// Comentários
// ═══════════════════════════════════════════════════════════════════════

const findComments = async (postId) => {
  const { rows } = await pool.query(
    `SELECT pc.*,
            u.name       AS user_name,
            u.avatar_url AS user_avatar_url,
            cl.name      AS client_name
     FROM post_comments pc
     LEFT JOIN users        u  ON u.id  = pc.user_id
     LEFT JOIN clients_leads cl ON cl.id = pc.client_lead_id
     WHERE pc.post_id = $1
     ORDER BY pc.created_at ASC`,
    [postId]
  )
  return rows
}

const findCommentById = async (id) => {
  const { rows } = await pool.query(`SELECT * FROM post_comments WHERE id = $1`, [id])
  return rows[0] || null
}

const addComment = async ({ postId, companyId, userId, clientLeadId, content }) => {
  const { rows } = await pool.query(
    `INSERT INTO post_comments (post_id, company_id, user_id, client_lead_id, content)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [postId, companyId, userId || null, clientLeadId || null, content || null]
  )
  return rows[0]
}

const removeComment = async (id) => {
  await pool.query(`DELETE FROM post_comments WHERE id = $1`, [id])
}

// ═══════════════════════════════════════════════════════════════════════
// Anexos de Comentário
// ═══════════════════════════════════════════════════════════════════════

const findCommentAttachments = async (commentId) => {
  const { rows } = await pool.query(
    `SELECT * FROM comment_attachments WHERE comment_id = $1 ORDER BY created_at ASC`,
    [commentId]
  )
  return rows
}

const addCommentAttachment = async ({ commentId, companyId, fileName, fileSize, mimeType, objectKey, url }) => {
  const { rows } = await pool.query(
    `INSERT INTO comment_attachments (comment_id, company_id, file_name, file_size, mime_type, object_key, url)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [commentId, companyId, fileName, fileSize || 0, mimeType, objectKey, url]
  )
  return rows[0]
}

// Busca todos os object_keys (posts + comentários) de um post — usado
// para limpar o R2 antes de excluir o post (o CASCADE do banco só apaga
// as linhas, não os objetos no bucket).
const findAllObjectKeysForPost = async (postId) => {
  const { rows } = await pool.query(
    `SELECT object_key FROM post_attachments WHERE post_id = $1
     UNION ALL
     SELECT ca.object_key FROM comment_attachments ca
     JOIN post_comments pc ON pc.id = ca.comment_id
     WHERE pc.post_id = $1`,
    [postId]
  )
  return rows.map(r => r.object_key)
}

// ═══════════════════════════════════════════════════════════════════════
// Suporte a permissões e notificações
// ═══════════════════════════════════════════════════════════════════════

const findProjectMemberIds = async (projectId) => {
  const { rows } = await pool.query(
    `SELECT user_id FROM project_members WHERE project_id = $1`,
    [projectId]
  )
  return rows.map(r => r.user_id)
}

const findCompanyAdminIds = async (companyId) => {
  const { rows } = await pool.query(
    `SELECT user_id FROM company_users
     WHERE company_id = $1 AND role IN ('owner','admin') AND is_active = true`,
    [companyId]
  )
  return rows.map(r => r.user_id)
}

const findClientAccessibleProjectIds = async (clientLeadId, companyId) => {
  const { rows } = await pool.query(
    `SELECT project_id FROM client_project_access
     WHERE client_lead_id = $1 AND company_id = $2`,
    [clientLeadId, companyId]
  )
  return rows.map(r => r.project_id)
}

const clientHasProjectAccess = async (clientLeadId, projectId, companyId) => {
  const { rows } = await pool.query(
    `SELECT 1 FROM client_project_access
     WHERE client_lead_id = $1 AND project_id = $2 AND company_id = $3`,
    [clientLeadId, projectId, companyId]
  )
  return rows.length > 0
}

module.exports = {
  findFeed,
  findById,
  create,
  update,
  remove,
  findAttachments,
  findAttachmentById,
  addAttachment,
  removeAttachment,
  findComments,
  findCommentById,
  addComment,
  removeComment,
  findCommentAttachments,
  addCommentAttachment,
  findAllObjectKeysForPost,
  findProjectMemberIds,
  findCompanyAdminIds,
  findClientAccessibleProjectIds,
  clientHasProjectAccess,
}