const pool = require('../config/database')

const nextBudgetNumber = async (companyId) => {
  const year = new Date().getFullYear()
  const { rows } = await pool.query(
    `SELECT COUNT(*) + 1 AS seq FROM budgets
     WHERE company_id = $1 AND EXTRACT(YEAR FROM created_at) = $2`,
    [companyId, year]
  )
  const seq = String(rows[0].seq).padStart(4, '0')
  return `ORC-${year}-${seq}`
}

const findAll = async ({ companyId, limit, offset, search, status }) => {
  const conditions = ['b.company_id = $1']
  const params = [companyId]

  if (status) {
    params.push(status)
    conditions.push(`b.status = $${params.length}`)
  }
  if (search) {
    params.push(`%${search}%`)
    conditions.push(
      `(b.budget_number ILIKE $${params.length}
        OR b.title ILIKE $${params.length}
        OR b.client_name ILIKE $${params.length})`
    )
  }

  const where = `WHERE ${conditions.join(' AND ')}`
  params.push(limit, offset)

  const { rows } = await pool.query(
    `SELECT
       b.id, b.budget_number, b.title, b.status, b.client_name, b.client_id,
       b.project_area, b.created_at, b.updated_at,
       u.name AS created_by_name,
       COALESCE(
         (SELECT SUM(bi.line_total) FROM budget_items bi WHERE bi.budget_id = b.id),
         0
       ) + b.fixed_fees_total AS total_amount
     FROM budgets b
     LEFT JOIN users u ON u.id = b.created_by
     ${where}
     ORDER BY b.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  )

  const { rows: cnt } = await pool.query(
    `SELECT COUNT(*) FROM budgets b ${where}`,
    params.slice(0, -2)
  )

  return { rows, total: parseInt(cnt[0].count) }
}

const findById = async (id, companyId) => {
  const { rows: budgetRows } = await pool.query(
    `SELECT
       b.*,
       cl.name AS client_display_name,
       u.name AS created_by_name,
       c.name AS company_name,
       c.logo_url AS company_logo_url,
       c.responsible_name, c.responsible_role
     FROM budgets b
     LEFT JOIN users u ON u.id = b.created_by
     LEFT JOIN clients_leads cl ON cl.id = b.client_id
     LEFT JOIN companies c ON c.id = b.company_id
     WHERE b.id = $1 AND b.company_id = $2`,
    [id, companyId]
  )
  if (!budgetRows[0]) return null

  // NOVO — bt.id AS budget_title_id: permite ao front pré-selecionar o
  // Título correto ao reabrir um orçamento em rascunho para edição
  // (antes só vinha o nível, e o seletor de título ficava vazio).
  const { rows: items } = await pool.query(
    `SELECT bi.*, bl.label AS level_label, bt.id AS budget_title_id, bt.label AS title_label
     FROM budget_items bi
     LEFT JOIN budget_levels bl ON bl.id = bi.budget_level_id
     LEFT JOIN budget_titles bt ON bt.id = bl.budget_title_id
     WHERE bi.budget_id = $1
     ORDER BY bi.order_index`,
    [id]
  )

  const { rows: snapshots } = await pool.query(
    `SELECT id, version, total_amount, created_at
     FROM budget_snapshots WHERE budget_id = $1 ORDER BY version DESC`,
    [id]
  )

  return { ...budgetRows[0], items, snapshots }
}

const create = async ({
  companyId, budgetNumber, title, clientId, clientName,
  projectArea, fixedFeesTotal, finalNotes, createdBy,
}) => {
  const { rows } = await pool.query(
    `INSERT INTO budgets
       (company_id, budget_number, title, client_id, client_name,
        project_area, fixed_fees_total, final_notes, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING *`,
    [
      companyId, budgetNumber, title, clientId || null, clientName || null,
      projectArea || 0, fixedFeesTotal || 0, finalNotes || null, createdBy,
    ]
  )
  return rows[0]
}

const update = async (id, companyId, fields) => {
  const keys = Object.keys(fields)
  if (!keys.length) return findById(id, companyId)
  const values = Object.values(fields)
  const sets = keys.map((k, i) => `${k} = $${i + 1}`).join(', ')
  values.push(id, companyId)

  const { rows } = await pool.query(
    `UPDATE budgets SET ${sets}, updated_at = NOW()
     WHERE id = $${values.length - 1} AND company_id = $${values.length} RETURNING *`,
    values
  )
  return rows[0]
}

const remove = async (id, companyId) => {
  await pool.query('DELETE FROM budgets WHERE id = $1 AND company_id = $2', [id, companyId])
}

// ── Itens: substitui tudo (mesmo padrão de replaceScopeItems em proposals) ──
const replaceItems = async (budgetId, companyId, items) => {
  await pool.query('DELETE FROM budget_items WHERE budget_id = $1', [budgetId])
  const inserted = []
  for (let i = 0; i < items.length; i++) {
    const it = items[i]
    const { rows } = await pool.query(
      `INSERT INTO budget_items
         (budget_id, company_id, custom_label, budget_level_id,
          area_used, rate_snapshot_value, rate_type, line_total, order_index)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [
        budgetId, companyId, it.customLabel, it.budgetLevelId || null,
        it.areaUsed ?? null, it.rateSnapshotValue ?? null, it.rateType || null,
        it.lineTotal || 0, i,
      ]
    )
    inserted.push(rows[0])
  }
  return inserted
}

// ── Snapshot imutável ────────────────────────────────────────────────
const createSnapshot = async (budgetId, companyId, { payload, totalAmount, createdBy }) => {
  const { rows: last } = await pool.query(
    'SELECT COALESCE(MAX(version), 0) AS max_version FROM budget_snapshots WHERE budget_id = $1',
    [budgetId]
  )
  const version = Number(last[0].max_version) + 1

  const { rows } = await pool.query(
    `INSERT INTO budget_snapshots (budget_id, company_id, version, payload, total_amount, created_by)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [budgetId, companyId, version, JSON.stringify(payload), totalAmount, createdBy]
  )
  return rows[0]
}

const getLatestSnapshot = async (budgetId, companyId) => {
  const { rows } = await pool.query(
    `SELECT * FROM budget_snapshots
     WHERE budget_id = $1 AND company_id = $2
     ORDER BY version DESC LIMIT 1`,
    [budgetId, companyId]
  )
  return rows[0] || null
}

// NOVO — busca um snapshot específico por versão (histórico de versões)
const getSnapshotByVersion = async (budgetId, companyId, version) => {
  const { rows } = await pool.query(
    `SELECT * FROM budget_snapshots
     WHERE budget_id = $1 AND company_id = $2 AND version = $3`,
    [budgetId, companyId, version]
  )
  return rows[0] || null
}

module.exports = {
  nextBudgetNumber,
  findAll, findById,
  create, update, remove,
  replaceItems,
  createSnapshot, getLatestSnapshot, getSnapshotByVersion,
}