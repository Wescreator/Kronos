/**
 * Writers da gravação final da importação (Fase 4) — um por módulo, todos
 * executando DENTRO da transação aberta pelo confirmImport (tudo ou nada).
 *
 * Recebem as linhas selecionadas (ok + duplicatas com decisão import/update)
 * já convertidas (mapped_data canônico do importValueConverter) e replicam a
 * semântica dos módulos de destino:
 *   - despesas: linha "paga" entra confirmada (status='paid' + paid_date),
 *     igual ao botão manual PATCH /expenses/:id/pay; categoria por nome é
 *     criada se não existir (decisão da spec)
 *   - receitas: cada group_key vira UMA receita com N parcelas
 *   - clientes: cpf_cnpj normalizado; "atualizar" sobrescreve APENAS campos
 *     preenchidos (spec 7.3), no padrão whitelist do client.repository
 */

/* ─── helpers ─── */

// UPDATE dinâmico seguro: colunas vêm SEMPRE deste mapa fixo (nunca do
// payload) e só campos preenchidos entram no SET (célula vazia não apaga).
const buildPartialUpdate = (mapped, columnMap) => {
  const sets = []
  const values = []
  for (const [field, column] of Object.entries(columnMap)) {
    const value = mapped[field]
    if (value === null || value === undefined) continue
    values.push(value)
    sets.push(`${column} = $${values.length}`)
  }
  return { sets, values }
}

/* ─── DESPESAS ─── */

const EXPENSE_UPDATE_COLUMNS = {
  title: 'title',
  description: 'description',
  amount: 'amount',
  due_date: 'due_date',
  competence_month: 'competence_month',
}

// Categoria por nome (case-insensitive), criada se não existir — cache por
// execução para não repetir SELECT/INSERT em planilhas grandes.
const makeCategoryResolver = (client, companyId, userId) => {
  let cache = null
  return async (name) => {
    if (cache === null) {
      const { rows } = await client.query(
        'SELECT id, name FROM expense_categories WHERE company_id = $1',
        [companyId]
      )
      cache = new Map(rows.map(r => [r.name.trim().toLowerCase(), r.id]))
    }
    const key = name.trim().toLowerCase()
    if (cache.has(key)) return cache.get(key)

    const { rows } = await client.query(
      `INSERT INTO expense_categories (company_id, name, created_by)
       VALUES ($1, $2, $3)
       ON CONFLICT (company_id, name) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [companyId, name.trim(), userId]
    )
    cache.set(key, rows[0].id)
    return rows[0].id
  }
}

const writeExpenses = async (client, { rows, companyId, userId }) => {
  const resolveCategory = makeCategoryResolver(client, companyId, userId)
  let created = 0
  let updated = 0

  for (const row of rows) {
    const m = row.mapped_data
    const categoryId = m.category ? await resolveCategory(m.category) : null
    // pago quando a coluna de status disse 'paid' OU quando veio data de
    // pagamento; sem data explícita, paid_date = due_date (decisão da spec)
    const isPaid = m.status === 'paid' || m.paid_date != null
    const paidDate = isPaid ? (m.paid_date || m.due_date) : null

    if (row.duplicate_action === 'update') {
      const { sets, values } = buildPartialUpdate(m, EXPENSE_UPDATE_COLUMNS)
      if (categoryId) { values.push(categoryId); sets.push(`category_id = $${values.length}`) }
      if (isPaid) {
        values.push(paidDate)
        sets.push(`status = 'paid'`, `paid_date = $${values.length}`)
      }
      sets.push('updated_at = NOW()')
      values.push(row.duplicate_match_id, companyId)
      await client.query(
        `UPDATE expenses SET ${sets.join(', ')}
          WHERE id = $${values.length - 1} AND company_id = $${values.length}`,
        values
      )
      updated++
    } else {
      await client.query(
        `INSERT INTO expenses
           (company_id, title, description, amount, due_date, status, paid_date, competence_month, category_id, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [companyId, m.title, m.description || null, m.amount, m.due_date,
         isPaid ? 'paid' : 'pending', paidDate, m.competence_month || null, categoryId, userId]
      )
      created++
    }
  }
  return { created, updated }
}

/* ─── RECEITAS ─── */

const writeRevenues = async (client, { rows, companyId, userId }) => {
  // um group_key = uma receita com N parcelas (spec 7.1); linhas de grupos
  // parcialmente puladas importam só as parcelas selecionadas
  const groups = new Map()
  for (const row of rows) {
    const key = row.group_key || row.id
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(row)
  }

  let created = 0
  for (const groupRows of groups.values()) {
    const sorted = [...groupRows].sort((a, b) =>
      String(a.mapped_data.due_date).localeCompare(String(b.mapped_data.due_date))
    )
    const first = sorted[0].mapped_data
    const total = sorted.reduce((sum, r) => sum + Number(r.mapped_data.amount), 0)

    const { rows: revRows } = await client.query(
      `INSERT INTO revenues (company_id, title, client, total_amount, installments, description, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [companyId, first.title, first.client || null, Math.round(total * 100) / 100,
       sorted.length, first.description || null, userId]
    )
    const revenueId = revRows[0].id

    for (let i = 0; i < sorted.length; i++) {
      const m = sorted[i].mapped_data
      const isReceived = m.status === 'paid' || m.received_date != null
      await client.query(
        `INSERT INTO revenue_installments
           (company_id, revenue_id, installment_no, amount, due_date, status, received_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [companyId, revenueId, i + 1, m.amount, m.due_date,
         isReceived ? 'received' : 'pending', isReceived ? (m.received_date || m.due_date) : null]
      )
    }
    created++
  }
  return { created, updated: 0 }
}

/* ─── CLIENTES ─── */

const CLIENT_UPDATE_COLUMNS = {
  name: 'name',
  email: 'email',
  phone: 'phone',
  cpf_cnpj: 'cpf_cnpj',
  status: 'status',
  situacao: 'situacao',
  financeiro: 'financeiro',
}

const writeClients = async (client, { rows, companyId }) => {
  let created = 0
  let updated = 0

  for (const row of rows) {
    const m = row.mapped_data
    if (row.duplicate_action === 'update') {
      const { sets, values } = buildPartialUpdate(m, CLIENT_UPDATE_COLUMNS)
      if (sets.length === 0) continue
      sets.push('updated_at = NOW()')
      values.push(row.duplicate_match_id, companyId)
      await client.query(
        `UPDATE clients_leads SET ${sets.join(', ')}
          WHERE id = $${values.length - 1} AND company_id = $${values.length}`,
        values
      )
      updated++
    } else {
      await client.query(
        `INSERT INTO clients_leads (company_id, name, email, phone, cpf_cnpj, status, situacao, financeiro)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [companyId, m.name, m.email || null, m.phone || null, m.cpf_cnpj || null,
         m.status || 'lead', m.situacao || null, m.financeiro || null]
      )
      created++
    }
  }
  return { created, updated }
}

const WRITERS = {
  financeiro_despesas: writeExpenses,
  financeiro_receitas: writeRevenues,
  clientes: writeClients,
}

module.exports = { WRITERS }
