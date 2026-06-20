const pool = require('../config/database')

const findByEmail = async (email) => {
  const { rows } = await pool.query(
    'SELECT * FROM users WHERE email = $1 AND is_active = TRUE',
    [email]
  )
  return rows[0] || null
}

const findById = async (id) => {
  const { rows } = await pool.query(
    `SELECT id, name, email, role, position, phone, avatar_url, admitted_at,
            is_active, last_login_at, created_at
     FROM users WHERE id = $1`,
    [id]
  )
  return rows[0] || null
}

// Lista membros da empresa (via company_users). Usuarios globais
// (developer/support), que nao tem vinculo em company_users, ficam de
// fora automaticamente.
const findAll = async ({ companyId, limit, offset, search }) => {
  const conditions = ['cu.company_id = $1', 'cu.is_active = TRUE']
  const params     = [companyId]

  if (search) {
    params.push(`%${search}%`)
    conditions.push(`(u.name ILIKE $${params.length} OR u.email ILIKE $${params.length})`)
  }

  const where = conditions.join(' AND ')

  params.push(limit, offset)
  const { rows } = await pool.query(
    `SELECT u.id, u.name, u.email, cu.role, u.position, u.phone, u.avatar_url, u.admitted_at, u.created_at
     FROM company_users cu
     JOIN users u ON u.id = cu.user_id
     WHERE ${where}
     ORDER BY u.name ASC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  )

  const { rows: cnt } = await pool.query(
    `SELECT COUNT(*) FROM company_users cu JOIN users u ON u.id = cu.user_id WHERE ${where}`,
    params.slice(0, -2)
  )

  return { rows, total: parseInt(cnt[0].count) }
}

const create = async ({ name, email, passwordHash, role, position, phone, admittedAt }) => {
  const { rows } = await pool.query(
    `INSERT INTO users (name, email, password_hash, role, position, phone, admitted_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, name, email, role, position, created_at`,
    [name, email, passwordHash, role, position, phone, admittedAt]
  )
  return rows[0]
}

const update = async (id, fields) => {
  const keys   = Object.keys(fields)
  const values = Object.values(fields)
  const sets   = keys.map((k, i) => `${k} = $${i + 1}`).join(', ')
  values.push(id)

  const { rows } = await pool.query(
    `UPDATE users SET ${sets}, updated_at = NOW()
     WHERE id = $${values.length}
     RETURNING id, name, email, role, position, phone, avatar_url, admitted_at`,
    values
  )
  return rows[0]
}

const updateLastLogin = async (id) => {
  await pool.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [id])
}

/* ─── Recuperação de senha ─── */

const findByResetToken = async (token) => {
  const { rows } = await pool.query(
    `SELECT id, name, email, reset_token_expires_at
     FROM users
     WHERE reset_token = $1 AND is_active = TRUE`,
    [token]
  )
  return rows[0] || null
}

const setResetToken = async (id, token, expiresAt) => {
  await pool.query(
    `UPDATE users
     SET reset_token = $1, reset_token_expires_at = $2, updated_at = NOW()
     WHERE id = $3`,
    [token, expiresAt, id]
  )
}

const clearResetToken = async (id) => {
  await pool.query(
    `UPDATE users
     SET reset_token = NULL, reset_token_expires_at = NULL, updated_at = NOW()
     WHERE id = $1`,
    [id]
  )
}

const updatePassword = async (id, passwordHash) => {
  await pool.query(
    `UPDATE users
     SET password_hash = $1, updated_at = NOW()
     WHERE id = $2`,
    [passwordHash, id]
  )
}

module.exports = {
  findByEmail,
  findById,
  findAll,
  create,
  update,
  updateLastLogin,
  // Recuperação de senha
  findByResetToken,
  setResetToken,
  clearResetToken,
  updatePassword,
}