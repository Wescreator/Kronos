const pool = require('../config/database')

const findByPhaseIds = async (phaseIds) => {
  if (!phaseIds.length) return []
  const { rows } = await pool.query(
    `SELECT pc.*, u.name AS author_name
       FROM phase_comments pc
       INNER JOIN users u ON u.id = pc.user_id
      WHERE pc.phase_id = ANY($1::uuid[])
      ORDER BY pc.created_at ASC`,
    [phaseIds]
  )
  return rows
}

const create = async ({ phaseId, companyId, userId, content }) => {
  const { rows } = await pool.query(
    `INSERT INTO phase_comments (phase_id, company_id, user_id, content)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [phaseId, companyId, userId, content]
  )
  return rows[0]
}

const update = async (commentId, content) => {
  const { rows } = await pool.query(
    `UPDATE phase_comments SET content = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [content, commentId]
  )
  return rows[0]
}

const remove = async (commentId) => {
  await pool.query(`DELETE FROM phase_comments WHERE id = $1`, [commentId])
}

// Escopo via projects.company_id, mesmo padrão de findPhaseOwner
const findOwner = async (commentId) => {
  const { rows } = await pool.query(
    `SELECT c.id, c.user_id AS author_id, p.id AS project_id, p.company_id
       FROM phase_comments c
       JOIN project_phases pph ON pph.id = c.phase_id
       JOIN project_stages ps  ON ps.id = pph.project_stage_id
       JOIN projects p         ON p.id = ps.project_id
      WHERE c.id = $1`,
    [commentId]
  )
  return rows[0] || null
}

module.exports = { findByPhaseIds, create, update, remove, findOwner }