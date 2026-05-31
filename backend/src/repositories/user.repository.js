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

const findAll = async ({ limit, offset, search }) => {
  const conditions = ['is_active = TRUE']
  const params     = []

  if (search) {
    params.push(`%${search}%`)
    conditions.push(`(name ILIKE $${params.length} OR email ILIKE $${params.length})`)
  }

  const where = conditions.join(' AND ')

  params.push(limit, offset)
  const { rows } = await pool.query(
    `SELECT id, name, email, role, position, phone, avatar_url, admitted_at, created_at
     FROM users WHERE ${where}
     ORDER BY name ASC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  )

  const { rows: cnt } = await pool.query(
    `SELECT COUNT(*) FROM users WHERE ${where}`,
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

module.exports = { findByEmail, findById, findAll, create, update, updateLastLogin }