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

/**
 * Cria a notificação SÓ se ainda não existir uma igual — usado exclusivamente
 * pelo cron financeiro, que reprocessa o mesmo item vencido todos os dias.
 *
 * Atômico: quem garante a unicidade é o índice parcial
 * `notifications_financial_due_uniq` (WHERE type = 'financial_due'), não um
 * SELECT prévio. O check-then-insert anterior tinha uma janela de corrida que
 * duplicaria as notificações no dia em que o Render rodasse 2 instâncias do
 * cron simultaneamente.
 *
 * O índice é PARCIAL de propósito: um UNIQUE amplo quebraria notify(), já que
 * no chat todas as mensagens de uma sala compartilham o mesmo link.
 *
 * @returns a notificação criada, ou null se já existia (nada a notificar).
 */
const createIfNew = async ({ companyId, userId, type, title, body, link }) => {
  const { rows } = await pool.query(
    `INSERT INTO notifications (company_id, user_id, type, title, body, link)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (company_id, user_id, type, link)
       WHERE type = 'financial_due'
       DO NOTHING
     RETURNING *`,
    [companyId, userId, type, title, body || null, link || null]
  )
  return rows[0] || null
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
  createIfNew,
  removeForEntity,
  findByUser,
  markRead,
  markAllRead,
  remove,
  removeAllForUser,
}