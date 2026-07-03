const pool = require('../config/database')

// Buscar os posts de um projeto específico (O cliente só verá o dele)
const findByProject = async (projectId, companyId) => {
  const { rows } = await pool.query(
    `SELECT p.*, u.name as author_name, u.avatar_url as author_avatar, u.role as author_role
     FROM posts p
     INNER JOIN users u ON u.id = p.user_id
     WHERE p.project_id = $1 AND p.company_id = $2
     ORDER BY p.created_at DESC`,
    [projectId, companyId]
  )
  return rows
}

const findPostById = async (id, companyId) => {
  const { rows } = await pool.query(
    `SELECT * FROM posts WHERE id = $1 AND company_id = $2`,
    [id, companyId]
  )
  return rows[0] || null
}

const createPost = async (companyId, projectId, userId, data) => {
  const { rows } = await pool.query(
    `INSERT INTO posts (company_id, project_id, user_id, content, attachments)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [companyId, projectId, userId, data.content, JSON.stringify(data.attachments || [])]
  )
  return rows[0]
}

const deletePost = async (id, companyId) => {
  await pool.query(`DELETE FROM posts WHERE id = $1 AND company_id = $2`, [id, companyId])
  return true
}

// ───────── COMENTÁRIOS ─────────

const findCommentsByPost = async (postId, companyId) => {
  const { rows } = await pool.query(
    `SELECT c.*, u.name as user_name, u.avatar_url as user_avatar, u.role as user_role
     FROM comments c
     INNER JOIN users u ON u.id = c.user_id
     WHERE c.post_id = $1 AND c.company_id = $2
     ORDER BY c.created_at ASC`,
    [postId, companyId]
  )
  return rows
}

const createComment = async (companyId, postId, userId, content) => {
  const { rows } = await pool.query(
    `INSERT INTO comments (company_id, post_id, user_id, content)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [companyId, postId, userId, content]
  )
  return rows[0]
}

module.exports = {
  findByProject,
  findPostById,
  createPost,
  deletePost,
  findCommentsByPost,
  createComment
}