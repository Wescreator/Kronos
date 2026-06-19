const repo = require('../repositories/financial.repository')
const { paginate, paginatedResponse } = require('../utils/pagination')
const { addMonths, format } = require('date-fns')

const RECURRING_MONTHS_AHEAD = 24

const getExpenses = async (query) => {
  const { page, limit, offset } = paginate(query)
  const { rows, total } = await repo.findExpenses({
    limit, offset,
    status:     query.status,
    categoryId: query.category_id,
    projectId:  query.project_id,
    month:      query.month ? parseInt(query.month) : null,
    year:       query.year  ? parseInt(query.year)  : null,
  })
  return paginatedResponse(rows, total, page, limit)
}

const createExpense = async (data, userId) => {
  const isRecurring = data.is_recurring === true || data.is_recurring === 'true'

  const expense = await repo.createExpense({
    title:             data.title,
    description:       data.description,
    projectId:         data.project_id  || null,
    categoryId:        data.category_id || null,
    amount:            data.amount,
    dueDate:           data.due_date,
    isRecurring:       isRecurring,
    recurringOriginId: null,
    createdBy:         userId
  })

  if (isRecurring) {
    const occurrences = []
    const baseDate = new Date(data.due_date)

    for (let i = 1; i <= RECURRING_MONTHS_AHEAD; i++) {
      const nextDate = addMonths(baseDate, i)
      occurrences.push({
        title:             data.title,
        description:       data.description,
        projectId:         data.project_id  || null,
        categoryId:        data.category_id || null,
        amount:            data.amount,
        dueDate:           format(nextDate, 'yyyy-MM-dd'),
        recurringOriginId: expense.id,
        createdBy:         userId
      })
    }

    await repo.createRecurringOccurrences(occurrences)
  }

  return expense
}

const confirmPayment = async (id, paidDate) => {
  const expense = await repo.confirmPayment(id, paidDate)
  if (!expense) throw { status: 404, message: 'Despesa não encontrada' }
  return expense
}

const updateExpense = async (id, data) => repo.updateExpense(id, data)
const deleteExpense = async (id)       => repo.deleteExpense(id)

/* ─── Análise avançada — leitura pura ─── */
const getExpensesByCategory = async (month, year) => {
  const m = month ? parseInt(month) : new Date().getMonth() + 1
  const y = year  ? parseInt(year)  : new Date().getFullYear()
  return await repo.getExpensesByCategory(m, y)
}

const getForecast = async () => {
  return await repo.getForecast()
}

const getRevenues = async (query) => {
  const { page, limit, offset } = paginate(query)
  const { rows, total } = await repo.findRevenues({
    limit, offset,
    status:    query.status,
    projectId: query.project_id,
    month:     query.month ? parseInt(query.month) : null,
    year:      query.year  ? parseInt(query.year)  : null,
  })
  return paginatedResponse(rows, total, page, limit)
}

const createRevenue = async (data, userId) => {
  const isArrayFormat = Array.isArray(data.installments_list)

  const revenue = await repo.createRevenue({
    title:        data.title,
    client:       data.client,
    projectId:    data.project_id  || null,
    totalAmount:  data.total_amount,
    installments: isArrayFormat ? data.installments_list.length : (data.installments || 1),
    description:  data.description,
    createdBy:    userId
  })

  let installmentsList = []

  if (isArrayFormat) {
    installmentsList = data.installments_list.map((inst, i) => ({
      no:      i + 1,
      amount:  parseFloat(inst.amount),
      dueDate: inst.due_date
    }))
  } else {
    const count    = data.installments || 1
    const base     = parseFloat((data.total_amount / count).toFixed(2))
    const baseDate = new Date(data.due_date)
    for (let i = 0; i < count; i++) {
      installmentsList.push({
        no:      i + 1,
        amount:  i === count - 1 ? data.total_amount - base * (count - 1) : base,
        dueDate: format(addMonths(baseDate, i), 'yyyy-MM-dd')
      })
    }
  }

  await repo.createInstallments(revenue.id, installmentsList)
  return revenue
}

const confirmReceipt    = async (installmentId, receivedDate) => {
  const inst = await repo.confirmReceipt(installmentId, receivedDate)
  if (!inst) throw { status: 404, message: 'Parcela não encontrada' }
  return inst
}
const updateInstallment = async (id, data) => repo.updateInstallment(id, data)

const deleteRevenue = async (id) => {
  const revenue = await repo.findRevenueById(id)
  if (!revenue) throw { status: 404, message: 'Receita não encontrada' }
  await repo.deleteRevenue(id)
}

const getCategories  = async ()             => repo.findCategories()
const createCategory = async (data, userId) => repo.createCategory(data.name, data.color, userId)
const updateCategory = async (id, data)     => repo.updateCategory(id, data.name, data.color)
const deleteCategory = async (id)           => repo.deleteCategory(id)

const getDashboard = async (query = {}) => {
  const today = new Date()
  const month = query.month ? parseInt(query.month) : today.getMonth() + 1
  const year  = query.year  ? parseInt(query.year)  : today.getFullYear()
  const stats    = await repo.getDashboardStats(month, year)
  const cashflow = await repo.getCashflow(year)
  return { stats, cashflow }
}

const getDRE               = async (start, end) => repo.getDRE(start, end)
const getProjectFinancials = async ()            => repo.getProjectFinancials()

module.exports = {getExpenses, createExpense, confirmPayment, updateExpense, deleteExpense,
  getExpensesByCategory, getForecast, getRevenues, createRevenue, confirmReceipt, updateInstallment, deleteRevenue,
  getCategories, createCategory, updateCategory, deleteCategory, getDashboard, getDRE, getProjectFinancials,}