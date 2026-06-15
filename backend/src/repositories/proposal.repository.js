const pool = require('../config/database')

// ── Gerar número de proposta ──────────────────────────────────
const nextProposalNumber = async () => {
  const year = new Date().getFullYear()
  const { rows } = await pool.query(
    'SELECT next_proposal_number($1) AS proposal_number',
    [year]
  )
  return rows[0].proposal_number
}

// ── Buscar todas as propostas ─────────────────────────────────
const findAll = async ({ limit, offset, search }) => {
  const conditions = []
  const params     = []

  if (search) {
    params.push(`%${search}%`)
    conditions.push(
      `(p.proposal_number ILIKE $${params.length}
        OR p.title ILIKE $${params.length}
        OR p.client_name ILIKE $${params.length}
        OR c.name ILIKE $${params.length})`
    )
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  params.push(limit, offset)

  const { rows } = await pool.query(
    `SELECT
       p.id, p.proposal_number, p.title, p.status,
       p.service_object, p.service_deadline, p.valid_until,
       p.created_at, p.updated_at,
       COALESCE(c.name, p.client_name) AS client_name,
       p.client_id,
       u.name AS created_by_name,
       COALESCE(
         (SELECT SUM(ps.amount) FROM proposal_services ps WHERE ps.proposal_id = p.id),
         0
       ) AS total_amount
     FROM proposals p
     LEFT JOIN clients c ON c.id = p.client_id
     LEFT JOIN users   u ON u.id = p.created_by
     ${where}
     ORDER BY p.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  )

  const { rows: cnt } = await pool.query(
    `SELECT COUNT(*) FROM proposals p
     LEFT JOIN clients c ON c.id = p.client_id
     ${where}`,
    params.slice(0, -2)
  )

  return { rows, total: parseInt(cnt[0].count) }
}

// ── Buscar proposta por ID (com todos os relacionamentos) ─────
const findById = async (id) => {
  // Proposta principal
  const { rows: propRows } = await pool.query(
    `SELECT
       p.*,
       COALESCE(c.name, p.client_name) AS client_display_name,
       u.name AS created_by_name
     FROM proposals p
     LEFT JOIN clients c ON c.id = p.client_id
     LEFT JOIN users   u ON u.id = p.created_by
     WHERE p.id = $1`,
    [id]
  )
  if (!propRows[0]) return null
  const proposal = propRows[0]

  // Itens de escopo
  const { rows: scopeRows } = await pool.query(
    'SELECT * FROM proposal_scope_items WHERE proposal_id = $1 ORDER BY order_index',
    [id]
  )

  // Serviços (cálculo técnico)
  const { rows: serviceRows } = await pool.query(
    'SELECT * FROM proposal_services WHERE proposal_id = $1 ORDER BY order_index',
    [id]
  )

  // Condições de pagamento
  const { rows: paymentRows } = await pool.query(
    'SELECT * FROM proposal_payment_terms WHERE proposal_id = $1 ORDER BY order_index',
    [id]
  )

  return {
    ...proposal,
    scope_items:    scopeRows,
    services:       serviceRows,
    payment_terms:  paymentRows,
  }
}

// ── Criar proposta ────────────────────────────────────────────
const create = async ({
  proposalNumber, title, clientId, clientName, serviceObject,
  finalNotes, serviceDeadline, validUntil, paymentMessage, createdBy
}) => {
  const { rows } = await pool.query(
    `INSERT INTO proposals
       (proposal_number, title, client_id, client_name, service_object,
        final_notes, service_deadline, valid_until, payment_message, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING *`,
    [
      proposalNumber, title, clientId || null, clientName || null,
      serviceObject, finalNotes || null, serviceDeadline || null,
      validUntil || null, paymentMessage || null, createdBy
    ]
  )
  return rows[0]
}

// ── Atualizar proposta ────────────────────────────────────────
const update = async (id, fields) => {
  const keys   = Object.keys(fields)
  const values = Object.values(fields)
  const sets   = keys.map((k, i) => `${k} = $${i + 1}`).join(', ')
  values.push(id)

  const { rows } = await pool.query(
    `UPDATE proposals SET ${sets}, updated_at = NOW()
     WHERE id = $${values.length} RETURNING *`,
    values
  )
  return rows[0]
}

// ── Excluir proposta (cascateia pelos ON DELETE CASCADE) ──────
const remove = async (id) => {
  await pool.query('DELETE FROM proposals WHERE id = $1', [id])
}

// ── SCOPE ITEMS ───────────────────────────────────────────────
const replaceScopeItems = async (proposalId, items) => {
  await pool.query('DELETE FROM proposal_scope_items WHERE proposal_id = $1', [proposalId])
  for (let i = 0; i < items.length; i++) {
    await pool.query(
      'INSERT INTO proposal_scope_items (proposal_id, description, order_index) VALUES ($1,$2,$3)',
      [proposalId, items[i].description, i]
    )
  }
}

// ── SERVICES ──────────────────────────────────────────────────
const replaceServices = async (proposalId, services) => {
  await pool.query('DELETE FROM proposal_services WHERE proposal_id = $1', [proposalId])
  for (let i = 0; i < services.length; i++) {
    await pool.query(
      `INSERT INTO proposal_services (proposal_id, description, amount, deadline_days, order_index)
       VALUES ($1,$2,$3,$4,$5)`,
      [proposalId, services[i].description, services[i].amount || 0, services[i].deadline_days || 0, i]
    )
  }
}

// ── PAYMENT TERMS ─────────────────────────────────────────────
const replacePaymentTerms = async (proposalId, terms) => {
  await pool.query('DELETE FROM proposal_payment_terms WHERE proposal_id = $1', [proposalId])
  for (let i = 0; i < terms.length; i++) {
    await pool.query(
      'INSERT INTO proposal_payment_terms (proposal_id, description, amount, order_index) VALUES ($1,$2,$3,$4)',
      [proposalId, terms[i].description, terms[i].amount || 0, i]
    )
  }
}

module.exports = {
  nextProposalNumber,
  findAll, findById,
  create, update, remove,
  replaceScopeItems, replaceServices, replacePaymentTerms,
}