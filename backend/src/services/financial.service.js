const repo = require('../repositories/financial.repository')
const AppError = require('../utils/AppError')
const notificationService = require('./notification.service')
const { paginate, paginatedResponse } = require('../utils/pagination')
const { addMonths, format } = require('date-fns')

const RECURRING_MONTHS_AHEAD = 24

const getExpenses = async (query, companyId) => {
  const { page, limit, offset } = paginate(query)
  const { rows, total } = await repo.findExpenses({
    companyId,
    limit, offset,
    status:     query.status,
    categoryId: query.category_id,
    projectId:  query.project_id,
    month:      query.month ? parseInt(query.month) : null,
    year:       query.year  ? parseInt(query.year)  : null,
  })
  return paginatedResponse(rows, total, page, limit)
}

const createExpense = async (data, userId, companyId) => {
  const isRecurring = data.is_recurring === true || data.is_recurring === 'true'

  const expense = await repo.createExpense({
    companyId,
    title:             data.title,
    description:       data.description,
    projectId:         data.project_id  || null,
    categoryId:        data.category_id || null,
    amount:            data.amount,
    dueDate:           data.due_date,
    isRecurring:       isRecurring,
    recurringOriginId: null,
    createdBy:         userId,
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
        createdBy:         userId,
      })
    }

    await repo.createRecurringOccurrences(companyId, occurrences)
  }

  return expense
}

const confirmPayment = async (id, paidDate, companyId) => {
  const expense = await repo.confirmPayment(companyId, id, paidDate)
  if (!expense) throw new AppError(404, 'Despesa não encontrada')
  // Remove eventual notificação de "vencido" gerada pelo cron para este item
  await notificationService.resolveEntity(companyId, 'financial_due', `/app/financial/expenses?highlight=${id}`)
  return expense
}

const updateExpense = async (id, data, companyId) => repo.updateExpense(companyId, id, data)
const deleteExpense = async (id, companyId)       => repo.deleteExpense(companyId, id)

/* ─── Análise avançada — leitura pura ─── */
const getExpensesByCategory = async (month, year, companyId) => {
  const m = month ? parseInt(month) : new Date().getMonth() + 1
  const y = year  ? parseInt(year)  : new Date().getFullYear()
  return await repo.getExpensesByCategory(companyId, m, y)
}

const getForecast = async (companyId) => {
  return await repo.getForecast(companyId)
}

const getRevenues = async (query, companyId) => {
  const { page, limit, offset } = paginate(query)
  const { rows, total } = await repo.findRevenues({
    companyId,
    limit, offset,
    status:    query.status,
    projectId: query.project_id,
    month:     query.month ? parseInt(query.month) : null,
    year:      query.year  ? parseInt(query.year)  : null,
  })
  return paginatedResponse(rows, total, page, limit)
}

const createRevenue = async (data, userId, companyId) => {
  const isArrayFormat = Array.isArray(data.installments_list)

  const revenue = await repo.createRevenue({
    companyId,
    title:        data.title,
    client:       data.client,
    projectId:    data.project_id  || null,
    totalAmount:  data.total_amount,
    installments: isArrayFormat ? data.installments_list.length : (data.installments || 1),
    description:  data.description,
    createdBy:    userId,
  })

  let installmentsList = []

  if (isArrayFormat) {
    installmentsList = data.installments_list.map((inst, i) => ({
      no:      i + 1,
      amount:  parseFloat(inst.amount),
      dueDate: inst.due_date,
    }))
  } else {
    const count    = data.installments || 1
    const base     = parseFloat((data.total_amount / count).toFixed(2))
    const baseDate = new Date(data.due_date)
    for (let i = 0; i < count; i++) {
      installmentsList.push({
        no:      i + 1,
        amount:  i === count - 1 ? data.total_amount - base * (count - 1) : base,
        dueDate: format(addMonths(baseDate, i), 'yyyy-MM-dd'),
      })
    }
  }

  await repo.createInstallments(companyId, revenue.id, installmentsList)
  return revenue
}

const confirmReceipt = async (installmentId, receivedDate, companyId) => {
  const inst = await repo.confirmReceipt(companyId, installmentId, receivedDate)
  if (!inst) throw new AppError(404, 'Parcela não encontrada')
  // Remove eventual notificação de "em atraso" gerada pelo cron para este item
  await notificationService.resolveEntity(companyId, 'financial_due', `/app/financial/revenues?highlight=${installmentId}`)
  return inst
}
const updateInstallment = async (id, data, companyId) => repo.updateInstallment(companyId, id, data)

const deleteRevenue = async (id, companyId) => {
  const revenue = await repo.findRevenueById(companyId, id)
  if (!revenue) throw new AppError(404, 'Receita não encontrada')
  await repo.deleteRevenue(companyId, id)
}

const getCategories  = async (companyId)             => repo.findCategories(companyId)
const createCategory = async (data, userId, companyId) => repo.createCategory(companyId, data.name, data.color, userId)
const updateCategory = async (id, data, companyId)     => repo.updateCategory(companyId, id, data.name, data.color)
const deleteCategory = async (id, companyId)           => repo.deleteCategory(companyId, id)

const getDashboard = async (query = {}, companyId) => {
  const today = new Date()
  const month = query.month ? parseInt(query.month) : today.getMonth() + 1
  const year  = query.year  ? parseInt(query.year)  : today.getFullYear()
  const stats    = await repo.getDashboardStats(companyId, month, year)
  const cashflow = await repo.getCashflow(companyId, year)
  return { stats, cashflow }
}

const getDRE               = async (start, end, companyId) => repo.getDRE(companyId, start, end)
const getProjectFinancials = async (companyId)              => repo.getProjectFinancials(companyId)

module.exports = {
  getExpenses, createExpense, confirmPayment, updateExpense, deleteExpense,
  getExpensesByCategory, getForecast,
  getRevenues, createRevenue, confirmReceipt, updateInstallment, deleteRevenue,
  getCategories, createCategory, updateCategory, deleteCategory,
  getDashboard, getDRE, getProjectFinancials,
}