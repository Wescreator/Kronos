const pool = require('../config/database')

// ── Empresas ──────────────────────────────────────────────────────

const findById = async (id) => {
  const { rows } = await pool.query(
    `SELECT * FROM companies WHERE id = $1`,
    [id]
  )
  return rows[0] || null
}

const findBySlug = async (slug) => {
  const { rows } = await pool.query(
    `SELECT * FROM companies WHERE slug = $1`,
    [slug]
  )
  return rows[0] || null
}

const findAll = async () => {
  const { rows } = await pool.query(
    `SELECT * FROM companies ORDER BY name ASC`
  )
  return rows
}

// ── Vínculo usuário ↔ empresa ───────────────────────────────────

/**
 * Retorna o vínculo ativo de um usuário com uma empresa.
 * Um usuário pode ter múltiplos vínculos no futuro — por ora,
 * retorna o primeiro vínculo ativo encontrado (ordenado por joined_at).
 */
const findActiveCompanyUserByUserId = async (userId) => {
  const { rows } = await pool.query(
    `SELECT cu.*, c.name AS company_name, c.slug AS company_slug,
            c.plan AS company_plan, c.is_active AS company_is_active
     FROM company_users cu
     JOIN companies c ON c.id = cu.company_id
     WHERE cu.user_id = $1 AND cu.is_active = TRUE
     ORDER BY cu.joined_at ASC
     LIMIT 1`,
    [userId]
  )
  return rows[0] || null
}

const findCompanyUser = async (companyId, userId) => {
  const { rows } = await pool.query(
    `SELECT * FROM company_users WHERE company_id = $1 AND user_id = $2`,
    [companyId, userId]
  )
  return rows[0] || null
}

const findUsersByCompany = async (companyId) => {
  const { rows } = await pool.query(
    `SELECT cu.role, cu.is_active, cu.joined_at,
            u.id, u.name, u.email, u.avatar_url, u.position
     FROM company_users cu
     JOIN users u ON u.id = cu.user_id
     WHERE cu.company_id = $1
     ORDER BY u.name ASC`,
    [companyId]
  )
  return rows
}

module.exports = {
  findById,
  findBySlug,
  findAll,
  findActiveCompanyUserByUserId,
  findCompanyUser,
  findUsersByCompany,
}