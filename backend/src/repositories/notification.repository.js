const pool = require('../config/database')

const create = async ({ companyId, userId, type, title, body, link }) => {
  const { rows } = await pool.query(
    `INSERT INTO notifications (company_id, user_id, type, title, body, link)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING *`,
    [companyId, userId, type, title, body || null, link || null]
  )
  return rows[0]
}

// Usado apenas pelo cron financeiro: evita recriar a mesma notificação de
// vencido todo dia enquanto o item continuar em aberto.
const existsForEntity = async ({ companyId, userId, type, link }) => {
  const { rows } = await pool.query(
    `SELECT id FROM notifications
      WHERE company_id = $1 AND user_id = $2 AND type = $3 AND link = $4
      LIMIT 1`,
    [companyId, userId, type, link]
  )
  return rows.length > 0
}

// Remove a(s) notificação(ões) de vencido quando o item é resolvido
// (despesa paga / parcela recebida). Afeta todos os usuários que a
// receberam, pois a resolução é um estado global do item, não do usuário.
// Escopado por company_id como todo DELETE multi-tenant — o link contém
// um UUID e colisão entre empresas é improvável, mas nenhuma query de
// escrita deve ficar sem o filtro de tenant.
const removeForEntity = async (companyId, type, link) => {
  await pool.query(
    `DELETE FROM notifications WHERE company_id = $1 AND type = $2 AND link = $3`,
    [companyId, type, link]
  )
}

const findByUser = async (userId, limit = 50) => {
  const { rows } = await pool.query(
    `SELECT * FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2`,
    [userId, limit]
  )
  return rows
}

const markRead = async (id, userId) => {
  await pool.query(
    `UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2`,
    [id, userId]
  )
}

const markAllRead = async (userId) => {
  await pool.query(
    `UPDATE notifications SET is_read = TRUE WHERE user_id = $1`,
    [userId]
  )
}

// Exclusão feita pelo próprio usuário (botão de lixeira no dropdown) —
// sempre escopada por user_id, para garantir que ninguém apague
// notificação de outra pessoa.
const remove = async (id, userId) => {
  const { rowCount } = await pool.query(
    `DELETE FROM notifications WHERE id = $1 AND user_id = $2`,
    [id, userId]
  )
  return rowCount > 0
}

const removeAllForUser = async (userId) => {
  await pool.query(`DELETE FROM notifications WHERE user_id = $1`, [userId])
}

module.exports = {
  create,
  existsForEntity,
  removeForEntity,
  findByUser,
  markRead,
  markAllRead,
  remove,
  removeAllForUser,
}