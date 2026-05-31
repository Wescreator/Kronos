const pool = require('../config/database')

// ── DESPESAS ──────────────────────────────────

const findExpenses = async ({ limit, offset, status, categoryId, projectId }) => {
  const conditions = []
  const params     = []

  if (status)     { params.push(status);     conditions.push(`e.status = $${params.length}`) }
  if (categoryId) { params.push(categoryId); conditions.push(`e.category_id = $${params.length}`) }
  if (projectId)  { params.push(projectId);  conditions.push(`e.project_id = $${params.length}`) }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  params.push(limit, offset)

  const { rows } = await pool.query(
    `SELECT e.*, ec.name AS category_name, ec.color AS category_color,
            p.title AS project_title, u.name AS created_by_name
     FROM expenses e
     LEFT JOIN expense_categories ec ON ec.id = e.category_id
     LEFT JOIN projects p            ON p.id  = e.project_id
     LEFT JOIN users u               ON u.id  = e.created_by
     ${where}
     ORDER BY e.due_date ASC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  )

  const { rows: cnt } = await pool.query(
    `SELECT COUNT(*) FROM expenses e ${where}`, params.slice(0, -2)
  )

  return { rows, total: parseInt(cnt[0].count) }
}

const createExpense = async ({ title, description, projectId, categoryId, amount, dueDate, createdBy }) => {
  const { rows } = await pool.query(
    `INSERT INTO expenses (title, description, project_id, category_id, amount, due_date, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [title, description, projectId, categoryId, amount, dueDate, createdBy]
  )
  return rows[0]
}

const confirmPayment = async (id, paidDate) => {
  const { rows } = await pool.query(
    `UPDATE expenses SET status = 'paid', paid_date = $1, updated_at = NOW()
     WHERE id = $2 RETURNING *`,
    [paidDate, id]
  )
  return rows[0]
}

const updateExpense = async (id, fields) => {
  const keys   = Object.keys(fields)
  const values = Object.values(fields)
  const sets   = keys.map((k, i) => `${k} = $${i + 1}`).join(', ')
  values.push(id)
  const { rows } = await pool.query(
    `UPDATE expenses SET ${sets}, updated_at = NOW() WHERE id = $${values.length} RETURNING *`, values
  )
  return rows[0]
}

const deleteExpense = async (id) => {
  await pool.query('DELETE FROM expenses WHERE id = $1', [id])
}

// ── RECEITAS ──────────────────────────────────

const findRevenues = async ({ limit, offset, status, projectId }) => {
  const conditions = []
  const params     = []

  if (status)    { params.push(status);    conditions.push(`ri.status = $${params.length}`) }
  if (projectId) { params.push(projectId); conditions.push(`r.project_id = $${params.length}`) }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  params.push(limit, offset)

  const { rows } = await pool.query(
    `SELECT r.*, ri.id AS installment_id, ri.installment_no, ri.amount AS installment_amount,
            ri.due_date AS installment_due, ri.received_date, ri.status AS installment_status,
            p.title AS project_title, u.name AS created_by_name
     FROM revenues r
     JOIN revenue_installments ri ON ri.revenue_id = r.id
     LEFT JOIN projects p         ON p.id = r.project_id
     LEFT JOIN users u            ON u.id = r.created_by
     ${where}
     ORDER BY ri.due_date ASC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  )

  const { rows: cnt } = await pool.query(
    `SELECT COUNT(*) FROM revenues r
     JOIN revenue_installments ri ON ri.revenue_id = r.id ${where}`,
    params.slice(0, -2)
  )

  return { rows, total: parseInt(cnt[0].count) }
}

const createRevenue = async ({ title, client, projectId, totalAmount, installments, description, createdBy }) => {
  const { rows } = await pool.query(
    `INSERT INTO revenues (title, client, project_id, total_amount, installments, description, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [title, client, projectId, totalAmount, installments, description, createdBy]
  )
  return rows[0]
}

const createInstallments = async (revenueId, installmentsList) => {
  for (const inst of installmentsList) {
    await pool.query(
      `INSERT INTO revenue_installments (revenue_id, installment_no, amount, due_date)
       VALUES ($1,$2,$3,$4)`,
      [revenueId, inst.no, inst.amount, inst.dueDate]
    )
  }
}

const confirmReceipt = async (installmentId, receivedDate) => {
  const { rows } = await pool.query(
    `UPDATE revenue_installments
     SET status = 'received', received_date = $1, updated_at = NOW()
     WHERE id = $2 RETURNING *`,
    [receivedDate, installmentId]
  )
  return rows[0]
}

// ── CATEGORIAS ────────────────────────────────

const findCategories = async () => {
  const { rows } = await pool.query(
    'SELECT * FROM expense_categories ORDER BY name'
  )
  return rows
}

const createCategory = async (name, color, createdBy) => {
  const { rows } = await pool.query(
    'INSERT INTO expense_categories (name, color, created_by) VALUES ($1,$2,$3) RETURNING *',
    [name, color, createdBy]
  )
  return rows[0]
}

const updateCategory = async (id, name, color) => {
  const { rows } = await pool.query(
    'UPDATE expense_categories SET name=$1, color=$2 WHERE id=$3 RETURNING *',
    [name, color, id]
  )
  return rows[0]
}

const deleteCategory = async (id) => {
  await pool.query('DELETE FROM expense_categories WHERE id = $1', [id])
}

// ── DASHBOARD E RELATÓRIOS ────────────────────

const getDashboardStats = async () => {
  const { rows } = await pool.query(`
    SELECT
      (SELECT COALESCE(SUM(amount),0) FROM expenses
       WHERE status = 'paid'
       AND DATE_TRUNC('month', paid_date) = DATE_TRUNC('month', NOW()))
        AS expenses_month,

      (SELECT COALESCE(SUM(amount),0) FROM revenue_installments
       WHERE status = 'received'
       AND DATE_TRUNC('month', received_date) = DATE_TRUNC('month', NOW()))
        AS revenue_month,

      (SELECT COALESCE(SUM(amount),0) FROM expenses WHERE status = 'pending')
        AS expenses_pending,

      (SELECT COALESCE(SUM(amount),0) FROM revenue_installments WHERE status = 'pending')
        AS revenue_pending,

      (SELECT COALESCE(SUM(amount),0) FROM expenses
       WHERE status = 'pending' AND due_date < NOW())
        AS expenses_overdue,

      (SELECT COALESCE(SUM(amount),0) FROM revenue_installments
       WHERE status = 'pending' AND due_date < NOW())
        AS revenue_overdue
  `)
  return rows[0]
}

const getCashflow = async (year) => {
  const { rows } = await pool.query(`
    SELECT
      m.month,
      COALESCE(e.total, 0) AS expenses,
      COALESCE(r.total, 0) AS revenues,
      COALESCE(r.total, 0) - COALESCE(e.total, 0) AS profit
    FROM generate_series(1, 12) AS m(month)
    LEFT JOIN (
      SELECT EXTRACT(MONTH FROM paid_date)::int AS month, SUM(amount) AS total
      FROM expenses
      WHERE status = 'paid' AND EXTRACT(YEAR FROM paid_date) = $1
      GROUP BY 1
    ) e ON e.month = m.month
    LEFT JOIN (
      SELECT EXTRACT(MONTH FROM received_date)::int AS month, SUM(amount) AS total
      FROM revenue_installments
      WHERE status = 'received' AND EXTRACT(YEAR FROM received_date) = $1
      GROUP BY 1
    ) r ON r.month = m.month
    ORDER BY m.month
  `, [year])
  return rows
}

const getDRE = async (startDate, endDate) => {
  const { rows } = await pool.query(`
    SELECT
      (SELECT COALESCE(SUM(ri.amount),0)
       FROM revenue_installments ri
       WHERE ri.status = 'received'
       AND ri.received_date BETWEEN $1 AND $2) AS gross_revenue,

      (SELECT COALESCE(SUM(e.amount),0)
       FROM expenses e
       WHERE e.status = 'paid'
       AND e.paid_date BETWEEN $1 AND $2) AS total_costs
  `, [startDate, endDate])

  const r = rows[0]
  r.net_profit = parseFloat(r.gross_revenue) - parseFloat(r.total_costs)
  return r
}

const getProjectFinancials = async () => {
  const { rows } = await pool.query(`
    SELECT
      p.id, p.title, p.budget,
      COALESCE(SUM(DISTINCT e.amount) FILTER (WHERE e.status = 'paid'), 0)      AS costs,
      COALESCE(SUM(DISTINCT ri.amount) FILTER (WHERE ri.status = 'received'), 0) AS revenues
    FROM projects p
    LEFT JOIN expenses e             ON e.project_id = p.id
    LEFT JOIN revenues rv            ON rv.project_id = p.id
    LEFT JOIN revenue_installments ri ON ri.revenue_id = rv.id
    GROUP BY p.id, p.title, p.budget
    ORDER BY p.title
  `)
  return rows.map(r => ({
    ...r,
    margin: r.revenues > 0 ? ((r.revenues - r.costs) / r.revenues * 100).toFixed(1) : 0,
    profit: r.revenues - r.costs
  }))
}

module.exports = {
  findExpenses, createExpense, confirmPayment, updateExpense, deleteExpense,
  findRevenues, createRevenue, createInstallments, confirmReceipt,
  findCategories, createCategory, updateCategory, deleteCategory,
  getDashboardStats, getCashflow, getDRE, getProjectFinancials
}