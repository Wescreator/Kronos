const pool = require('../config/database')

// ── DESPESAS ──────────────────────────────────────────────────────

const findExpenses = async ({
  companyId,
  limit,
  offset,
  status,
  categoryId,
  projectId,
  month,
  year
}) => {
  const conditions = ['e.company_id = $1']
  const params = [companyId]

  if (status) {
    params.push(status)
    conditions.push(`e.status = $${params.length}`)
  }

  if (categoryId) {
    params.push(categoryId)
    conditions.push(`e.category_id = $${params.length}`)
  }

  if (projectId) {
    params.push(projectId)
    conditions.push(`e.project_id = $${params.length}`)
  }

  if (month && year) {
    params.push(year)
    const pYear = params.length

    params.push(month)
    const pMonth = params.length

    conditions.push(`(
      (
        EXTRACT(YEAR FROM e.due_date) = $${pYear}
        AND EXTRACT(MONTH FROM e.due_date) = $${pMonth}
      )
      OR (
        e.status = 'pending'
        AND e.due_date < DATE_TRUNC('month', MAKE_DATE($${pYear}::int, $${pMonth}::int, 1))
      )
    )`)
  }

  const where = `WHERE ${conditions.join(' AND ')}`

  params.push(limit, offset)

  const { rows } = await pool.query(
    `SELECT
        e.*,
        ec.name AS category_name,
        ec.color AS category_color,
        p.title AS project_title,
        u.name AS created_by_name
     FROM expenses e
     LEFT JOIN expense_categories ec
        ON ec.id = e.category_id
       AND ec.company_id = e.company_id
     LEFT JOIN projects p
        ON p.id = e.project_id
       AND p.company_id = e.company_id
     LEFT JOIN users u
        ON u.id = e.created_by
     ${where}
     ORDER BY e.due_date ASC
     LIMIT $${params.length - 1}
     OFFSET $${params.length}`,
    params
  )

  const { rows: cnt } = await pool.query(
    `SELECT COUNT(*)
       FROM expenses e
       ${where}`,
    params.slice(0, -2)
  )

  return {
    rows,
    total: Number(cnt[0].count)
  }
}

const INSERT_EXPENSE_SQL = `
  INSERT INTO expenses (
      company_id,
      title,
      description,
      project_id,
      category_id,
      amount,
      due_date,
      competence_month,
      is_recurring,
      recurring_origin_id,
      created_by
   )
   VALUES (
      $1,$2,$3,$4,$5,$6,$7,
      DATE_TRUNC('month',$7::date)::date,
      $8,$9,$10
   )
   RETURNING *`

/**
 * Cria a despesa e, quando recorrente, TODAS as ocorrências futuras numa
 * ÚNICA transação.
 *
 * Antes eram 1 + 24 INSERTs soltos: se o loop falhasse na 13ª iteração
 * (timeout de pool, queda de conexão), a despesa-mãe ficava gravada com
 * ocorrências pela metade, sem rollback e sem reprocessamento — um estado
 * inconsistente e invisível para o usuário. Agora é tudo-ou-nada.
 *
 * `occurrenceDates` são apenas as datas de vencimento; os demais campos da
 * ocorrência são idênticos aos da despesa-mãe.
 */
const createExpenseWithOccurrences = async ({
  companyId,
  title,
  description,
  projectId,
  categoryId,
  amount,
  dueDate,
  isRecurring,
  createdBy,
  occurrenceDates = []
}) => {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const { rows } = await client.query(INSERT_EXPENSE_SQL, [
      companyId,
      title,
      description,
      projectId,
      categoryId,
      amount,
      dueDate,
      isRecurring || false,
      null,          // recurring_origin_id: a despesa-mãe não tem origem
      createdBy
    ])

    const expense = rows[0]

    for (const occurrenceDate of occurrenceDates) {
      await client.query(INSERT_EXPENSE_SQL, [
        companyId,
        title,
        description,
        projectId,
        categoryId,
        amount,
        occurrenceDate,
        true,          // ocorrência de uma recorrência
        expense.id,    // recurring_origin_id → aponta para a despesa-mãe
        createdBy
      ])
    }

    await client.query('COMMIT')
    return expense
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

const confirmPayment = async (companyId, id, paidDate) => {
  const { rows } = await pool.query(
    `UPDATE expenses
        SET status='paid',
            paid_date=$1,
            updated_at=NOW()
      WHERE id=$2
        AND company_id=$3
      RETURNING *`,
    [paidDate, id, companyId]
  )

  return rows[0]
}

const updateExpense = async (companyId, id, fields) => {
  const allowed = ['title', 'description', 'project_id', 'category_id', 'amount', 'due_date', 'status']

  const keys = []
  const values = []

  for (const key of allowed) {
    if (fields[key] !== undefined) {
      keys.push(key)
      values.push(fields[key])
    }
  }

  if (!keys.length) return null

  const extraSets = keys.includes('due_date')
    ? `, competence_month = DATE_TRUNC('month', $${keys.indexOf('due_date') + 1}::date)::date`
    : ''

  const sets = keys
    .map((k, i) => `${k} = $${i + 1}`)
    .join(', ')

  values.push(id)
  values.push(companyId)

  const { rows } = await pool.query(
    `UPDATE expenses
        SET ${sets}${extraSets},
            updated_at = NOW()
      WHERE id = $${values.length - 1}
        AND company_id = $${values.length}
      RETURNING *`,
    values
  )

  return rows[0]
}

const deleteExpense = async (companyId, id) => {
  await pool.query(
    `DELETE FROM expenses
      WHERE id = $1
        AND company_id = $2`,
    [id, companyId]
  )
}

/* ─── Despesas pagas agrupadas por categoria ───────────────────── */

const getExpensesByCategory = async (companyId, month, year) => {
  const { rows } = await pool.query(`
    SELECT
      COALESCE(ec.name,'Sem categoria') AS category_name,
      COALESCE(ec.color,'#6B7280') AS category_color,
      SUM(e.amount)::numeric AS total
    FROM expenses e
    LEFT JOIN expense_categories ec
      ON ec.id = e.category_id
     AND ec.company_id = e.company_id
    WHERE e.company_id = $1
      AND e.status = 'paid'
      AND e.paid_date IS NOT NULL
      AND EXTRACT(YEAR FROM e.paid_date) = $2
      AND EXTRACT(MONTH FROM e.paid_date) = $3
    GROUP BY ec.id, ec.name, ec.color
    ORDER BY total DESC
  `, [companyId, year, month])

  return rows
}

/* ─── Forecast ─────────────────────────────────────────────────── */

const getForecast = async (companyId) => {
  const { rows: expenses } = await pool.query(`
    SELECT
      EXTRACT(YEAR FROM due_date)::int AS year,
      EXTRACT(MONTH FROM due_date)::int AS month,
      SUM(amount)::numeric AS total
    FROM expenses
    WHERE company_id = $1
      AND status = 'pending'
      AND due_date >= DATE_TRUNC('month', NOW())
    GROUP BY
      EXTRACT(YEAR FROM due_date),
      EXTRACT(MONTH FROM due_date)
    ORDER BY year, month
    LIMIT 12
  `, [companyId])

  const { rows: revenues } = await pool.query(`
    SELECT
      EXTRACT(YEAR FROM due_date)::int AS year,
      EXTRACT(MONTH FROM due_date)::int AS month,
      SUM(amount)::numeric AS total
    FROM revenue_installments
    WHERE company_id = $1
      AND status = 'pending'
      AND due_date >= DATE_TRUNC('month', NOW())
    GROUP BY
      EXTRACT(YEAR FROM due_date),
      EXTRACT(MONTH FROM due_date)
    ORDER BY year, month
    LIMIT 12
  `, [companyId])

  return { expenses, revenues }
}

// ── RECEITAS ──────────────────────────────────────────────────────

const findRevenues = async ({
  companyId,
  limit,
  offset,
  status,
  projectId,
  month,
  year
}) => {
  const conditions = ['r.company_id = $1', 'ri.company_id = $1']
  const params = [companyId]

  if (projectId) {
    params.push(projectId)
    conditions.push(`r.project_id = $${params.length}`)
  }

  if (status) {
    params.push(status)
    conditions.push(`ri.status = $${params.length}`)
  }

  if (month && year) {
    params.push(year)
    const pYear = params.length

    params.push(month)
    const pMonth = params.length

    conditions.push(`(
      (
        EXTRACT(YEAR FROM ri.due_date) = $${pYear}
        AND EXTRACT(MONTH FROM ri.due_date) = $${pMonth}
      )
      OR (
        ri.status = 'pending'
        AND ri.due_date < DATE_TRUNC('month', MAKE_DATE($${pYear}::int, $${pMonth}::int, 1))
      )
    )`)
  }

  const where = `WHERE ${conditions.join(' AND ')}`

  params.push(limit, offset)

  const { rows } = await pool.query(
    `SELECT
        r.id,
        r.title,
        r.client,
        r.project_id,
        r.total_amount,
        r.installments,
        r.description,
        r.created_by,
        r.created_at,
        r.updated_at,

        ri.id             AS installment_id,
        ri.installment_no,
        ri.amount         AS installment_amount,
        ri.due_date       AS installment_due,
        ri.received_date,
        ri.status         AS installment_status,
        ri.note,

        p.title           AS project_title,
        u.name            AS created_by_name

      FROM revenues r

      JOIN revenue_installments ri
        ON ri.revenue_id = r.id
       AND ri.company_id = r.company_id

      LEFT JOIN projects p
        ON p.id = r.project_id
       AND p.company_id = r.company_id

      LEFT JOIN users u
        ON u.id = r.created_by

      ${where}

      ORDER BY ri.due_date ASC
      LIMIT $${params.length - 1}
      OFFSET $${params.length}`,
    params
  )

  const { rows: cnt } = await pool.query(
    `SELECT COUNT(*)
      FROM revenues r
      JOIN revenue_installments ri
        ON ri.revenue_id = r.id
       AND ri.company_id = r.company_id
      ${where}`,
    params.slice(0, -2)
  )

  return {
    rows,
    total: Number(cnt[0].count)
  }
}

const findRevenueById = async (companyId, id) => {
  const { rows } = await pool.query(
    `SELECT * FROM revenues WHERE id = $1 AND company_id = $2`,
    [id, companyId]
  )
  return rows[0] || null
}

/**
 * Cria a receita e TODAS as suas parcelas numa ÚNICA transação.
 *
 * Antes eram INSERTs soltos: uma falha entre a receita e as parcelas deixava
 * uma receita SEM nenhuma parcela. Como findRevenues faz JOIN com
 * revenue_installments, essa receita órfã simplesmente sumia da listagem —
 * existia no banco, contaminava relatórios que leem `revenues` direto, e era
 * invisível/inexcluível pela UI. Agora é tudo-ou-nada.
 */
const createRevenueWithInstallments = async ({
  companyId,
  title,
  client: clientName,
  projectId,
  totalAmount,
  installments,
  description,
  createdBy,
  installmentsList = []
}) => {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const { rows } = await client.query(
      `INSERT INTO revenues (
          company_id,
          title,
          client,
          project_id,
          total_amount,
          installments,
          description,
          created_by
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING *`,
      [
        companyId,
        title,
        clientName,
        projectId,
        totalAmount,
        installments,
        description,
        createdBy
      ]
    )

    const revenue = rows[0]

    for (const inst of installmentsList) {
      await client.query(
        `INSERT INTO revenue_installments (
            company_id,
            revenue_id,
            installment_no,
            amount,
            due_date,
            competence_month
        )
        VALUES (
            $1,$2,$3,$4,$5,
            DATE_TRUNC('month',$5::date)::date
        )`,
        [companyId, revenue.id, inst.no, inst.amount, inst.dueDate]
      )
    }

    await client.query('COMMIT')
    return revenue
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

const updateInstallment = async (companyId, id, fields) => {
  const allowed = ['amount', 'due_date', 'status', 'note']

  const keys = []
  const values = []

  for (const key of allowed) {
    if (fields[key] !== undefined) {
      keys.push(key)
      values.push(fields[key])
    }
  }

  if (!keys.length) return null

  const sets = keys
    .map((k, i) => `${k} = $${i + 1}`)
    .join(', ')

  values.push(id)
  values.push(companyId)

  const { rows } = await pool.query(
    `UPDATE revenue_installments
        SET ${sets},
            updated_at = NOW()
      WHERE id = $${values.length - 1}
        AND company_id = $${values.length}
      RETURNING *`,
    values
  )

  return rows[0]
}

const confirmReceipt = async (companyId, installmentId, receivedDate) => {
  const { rows } = await pool.query(
    `UPDATE revenue_installments
        SET status = 'received',
            received_date = $1,
            updated_at = NOW()
      WHERE id = $2
        AND company_id = $3
      RETURNING *`,
    [receivedDate, installmentId, companyId]
  )

  return rows[0]
}

const deleteRevenue = async (companyId, id) => {
  await pool.query(
    `DELETE FROM revenue_installments WHERE revenue_id = $1 AND company_id = $2`,
    [id, companyId]
  )
  await pool.query(
    `DELETE FROM revenues WHERE id = $1 AND company_id = $2`,
    [id, companyId]
  )
}

// ── CATEGORIAS ────────────────────────────────────────────────────

const findCategories = async (companyId) => {
  const { rows } = await pool.query(
    `SELECT * FROM expense_categories WHERE company_id = $1 ORDER BY name`,
    [companyId]
  )
  return rows
}

const createCategory = async (companyId, name, color, createdBy) => {
  const { rows } = await pool.query(
    `INSERT INTO expense_categories (company_id, name, color, created_by)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [companyId, name, color, createdBy]
  )
  return rows[0]
}

const updateCategory = async (companyId, id, name, color) => {
  const { rows } = await pool.query(
    `UPDATE expense_categories
        SET name = $1, color = $2
      WHERE id = $3 AND company_id = $4
      RETURNING *`,
    [name, color, id, companyId]
  )
  return rows[0]
}

const deleteCategory = async (companyId, id) => {
  await pool.query(
    `DELETE FROM expense_categories WHERE id = $1 AND company_id = $2`,
    [id, companyId]
  )
}

// ── DASHBOARD ─────────────────────────────────────────────────────

const getDashboardStats = async (companyId, month, year) => {
  const m = month || new Date().getMonth() + 1
  const y = year  || new Date().getFullYear()

  const { rows } = await pool.query(`
    SELECT
      (SELECT COALESCE(SUM(amount),0) FROM expenses
       WHERE company_id=$3 AND status='paid'
         AND EXTRACT(YEAR FROM paid_date)=$1
         AND EXTRACT(MONTH FROM paid_date)=$2) AS expenses_month,

      (SELECT COALESCE(SUM(amount),0) FROM revenue_installments
       WHERE company_id=$3 AND status='received'
         AND EXTRACT(YEAR FROM received_date)=$1
         AND EXTRACT(MONTH FROM received_date)=$2) AS revenue_month,

      (SELECT COALESCE(SUM(amount),0) FROM expenses
       WHERE company_id=$3 AND status='pending'
         AND EXTRACT(YEAR FROM due_date)=$1
         AND EXTRACT(MONTH FROM due_date)=$2) AS expenses_pending,

      (SELECT COALESCE(SUM(amount),0) FROM revenue_installments
       WHERE company_id=$3 AND status='pending'
         AND EXTRACT(YEAR FROM due_date)=$1
         AND EXTRACT(MONTH FROM due_date)=$2) AS revenue_pending,

      (SELECT COALESCE(SUM(amount),0) FROM expenses
       WHERE company_id=$3 AND status='pending'
         AND due_date < CURRENT_DATE) AS expenses_overdue,

      (SELECT COALESCE(SUM(amount),0) FROM revenue_installments
       WHERE company_id=$3 AND status='pending'
         AND due_date < CURRENT_DATE) AS revenue_overdue
  `, [y, m, companyId])

  return rows[0]
}

const getCashflow = async (companyId, year) => {
  const { rows } = await pool.query(`
    SELECT
      m.month,
      COALESCE(e.total,0) AS expenses,
      COALESCE(r.total,0) AS revenues,
      COALESCE(r.total,0) - COALESCE(e.total,0) AS profit
    FROM generate_series(1,12) AS m(month)
    LEFT JOIN (
      SELECT EXTRACT(MONTH FROM paid_date)::int AS month, SUM(amount) AS total
      FROM expenses
      WHERE company_id=$2 AND status='paid'
        AND EXTRACT(YEAR FROM paid_date)=$1
      GROUP BY 1
    ) e ON e.month = m.month
    LEFT JOIN (
      SELECT EXTRACT(MONTH FROM received_date)::int AS month, SUM(amount) AS total
      FROM revenue_installments
      WHERE company_id=$2 AND status='received'
        AND EXTRACT(YEAR FROM received_date)=$1
      GROUP BY 1
    ) r ON r.month = m.month
    ORDER BY m.month
  `, [year, companyId])

  return rows
}

const getDRE = async (companyId, startDate, endDate) => {
  const { rows } = await pool.query(`
    SELECT
      (SELECT COALESCE(SUM(ri.amount),0)
       FROM revenue_installments ri
       WHERE ri.company_id=$3 AND ri.status='received'
         AND ri.received_date BETWEEN $1 AND $2) AS gross_revenue,
      (SELECT COALESCE(SUM(e.amount),0)
       FROM expenses e
       WHERE e.company_id=$3 AND e.status='paid'
         AND e.paid_date BETWEEN $1 AND $2) AS total_costs
  `, [startDate, endDate, companyId])

  const r = rows[0]
  r.net_profit = Number(r.gross_revenue) - Number(r.total_costs)
  return r
}

const getProjectFinancials = async (companyId) => {
  // Custos e receitas são agregados em subqueries SEPARADAS por projeto antes
  // do JOIN. Um único FROM com os dois LEFT JOIN (expenses × revenue_installments)
  // produz um produto cartesiano: cada despesa é repetida por parcela e vice-versa.
  // O código antigo mascarava isso com SUM(DISTINCT amount), que colapsava
  // despesas/parcelas de MESMO valor — subestimando o custo/receita do projeto.
  // Pré-agregar elimina a duplicação e dá o total correto sem DISTINCT.
  const { rows } = await pool.query(`
    SELECT
      p.id, p.title, p.budget,
      COALESCE(e.costs, 0)    AS costs,
      COALESCE(r.revenues, 0) AS revenues
    FROM projects p
    LEFT JOIN (
      SELECT project_id, SUM(amount) AS costs
      FROM expenses
      WHERE company_id=$1 AND status='paid'
      GROUP BY project_id
    ) e ON e.project_id = p.id
    LEFT JOIN (
      SELECT rv.project_id, SUM(ri.amount) AS revenues
      FROM revenues rv
      JOIN revenue_installments ri
        ON ri.revenue_id = rv.id AND ri.company_id = rv.company_id
      WHERE rv.company_id=$1 AND ri.status='received'
      GROUP BY rv.project_id
    ) r ON r.project_id = p.id
    WHERE p.company_id=$1
    ORDER BY p.title
  `, [companyId])

  return rows.map(r => ({
    ...r,
    margin: Number(r.revenues) > 0
      ? (((Number(r.revenues) - Number(r.costs)) / Number(r.revenues)) * 100).toFixed(1)
      : 0,
    profit: Number(r.revenues) - Number(r.costs)
  }))
}

module.exports = {
  findExpenses,
  createExpenseWithOccurrences,
  confirmPayment,
  updateExpense,
  deleteExpense,
  getExpensesByCategory,
  getForecast,

  findRevenues,
  findRevenueById,
  createRevenueWithInstallments,
  updateInstallment,
  confirmReceipt,
  deleteRevenue,

  findCategories,
  createCategory,
  updateCategory,
  deleteCategory,

  getDashboardStats,
  getCashflow,
  getDRE,
  getProjectFinancials,
}