const cron = require('node-cron')
const pool = require('../config/database')
const notificationService = require('../services/notification.service')

const formatCurrency = (value) =>
  Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

const formatDate = (value) => new Date(value).toLocaleDateString('pt-BR')

// Notifica os admins ativos da empresa sobre cada despesa vencida não paga.
// Uma notificação por (usuário, despesa) — não duplica em execuções
// seguintes enquanto a despesa continuar pendente.
const checkOverdueExpenses = async () => {
  const { rows: expenses } = await pool.query(`
    SELECT id, title, amount, due_date, company_id
    FROM expenses
    WHERE status = 'pending' AND due_date < CURRENT_DATE
  `)

  for (const exp of expenses) {
    const { rows: users } = await pool.query(
      `SELECT user_id FROM company_users WHERE company_id = $1 AND is_active = TRUE AND role = 'admin'`,
      [exp.company_id]
    )

    const link = `/app/financial/expenses?highlight=${exp.id}`
    for (const u of users) {
      await notificationService.notifyIfNew({
        companyId: exp.company_id,
        userId: u.user_id,
        type: 'financial_due',
        title: `Despesa vencida: ${exp.title}`,
        body: `${formatCurrency(exp.amount)} — venceu em ${formatDate(exp.due_date)}`,
        link,
      })
    }
  }
}

// Idem, para parcelas de receita vencidas e ainda não confirmadas
// (também restrito aos admins da empresa).
const checkOverdueRevenues = async () => {
  const { rows: installments } = await pool.query(`
    SELECT ri.id, ri.amount, ri.due_date, ri.company_id, r.title, r.client
    FROM revenue_installments ri
    JOIN revenues r ON r.id = ri.revenue_id
    WHERE ri.status = 'pending' AND ri.due_date < CURRENT_DATE
  `)

  for (const inst of installments) {
    const { rows: users } = await pool.query(
      `SELECT user_id FROM company_users WHERE company_id = $1 AND is_active = TRUE AND role = 'admin'`,
      [inst.company_id]
    )

    const link = `/app/financial/revenues?highlight=${inst.id}`
    const label = inst.client ? `${inst.title} — ${inst.client}` : inst.title

    for (const u of users) {
      await notificationService.notifyIfNew({
        companyId: inst.company_id,
        userId: u.user_id,
        type: 'financial_due',
        title: `Recebimento em atraso: ${label}`,
        body: `${formatCurrency(inst.amount)} — venceu em ${formatDate(inst.due_date)}`,
        link,
      })
    }
  }
}

const runCheck = async () => {
  try {
    await checkOverdueExpenses()
    await checkOverdueRevenues()
  } catch (err) {
    console.error('[notification.cron] erro:', err.message)
  }
}

// Roda todo dia às 06:00 (horário do servidor).
const start = () => {
  cron.schedule('0 6 * * *', runCheck)
  console.log('✓ Cron de notificações de vencimento agendado (06:00 diário)')
}

module.exports = { start, runCheck, checkOverdueExpenses, checkOverdueRevenues }