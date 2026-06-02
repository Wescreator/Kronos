const repo = require('../repositories/financial.repository')
const { paginate, paginatedResponse } = require('../utils/pagination')
const { addMonths, format } = require('date-fns')

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
  return await repo.createExpense({
    title:       data.title,
    description: data.description,
    projectId:   data.project_id  || null,
    categoryId:  data.category_id || null,
    amount:      data.amount,
    dueDate:     data.due_date,
    createdBy:   userId
  })
}

const confirmPayment = async (id, paidDate) => {
  const expense = await repo.confirmPayment(id, paidDate)
  if (!expense) throw { status: 404, message: 'Despesa não encontrada' }
  return expense
}

const updateExpense = async (id, data) => {
  return await repo.updateExpense(id, data)
}

const deleteExpense = async (id) => {
  await repo.deleteExpense(id)
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
  // Suporta tanto o formato antigo (total_amount + installments)
  // quanto o novo (installments como array com valor/data individuais)
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
    // Novo formato: array com { amount, due_date } por parcela
    installmentsList = data.installments_list.map((inst, i) => ({
      no:      i + 1,
      amount:  parseFloat(inst.amount),
      dueDate: inst.due_date
    }))
  } else {
    // Formato antigo: divide total_amount em parcelas iguais
    const count  = data.installments || 1
    const base   = parseFloat((data.total_amount / count).toFixed(2))
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

const confirmReceipt = async (installmentId, receivedDate) => {
  const inst = await repo.confirmReceipt(installmentId, receivedDate)
  if (!inst) throw { status: 404, message: 'Parcela não encontrada' }
  return inst
}

const updateInstallment = async (id, data) => {
  return await repo.updateInstallment(id, data)
}

const getCategories    = async () => repo.findCategories()
const createCategory   = async (data, userId) => repo.createCategory(data.name, data.color, userId)
const updateCategory   = async (id, data)     => repo.updateCategory(id, data.name, data.color)
const deleteCategory   = async (id)           => repo.deleteCategory(id)

const getDashboard = async (query = {}) => {
  const month = query.month ? parseInt(query.month) : null
  const year  = query.year  ? parseInt(query.year)  : null
  const stats    = await repo.getDashboardStats(month, year)
  const cashflow = await repo.getCashflow(year || new Date().getFullYear())
  return { stats, cashflow }
}

const getDRE = async (start, end) => {
  return await repo.getDRE(start, end)
}

const getProjectFinancials = async () => {
  return await repo.getProjectFinancials()
}

module.exports = {
  getExpenses, createExpense, confirmPayment, updateExpense, deleteExpense,
  getRevenues, createRevenue, confirmReceipt, updateInstallment,
  getCategories, createCategory, updateCategory, deleteCategory,
  getDashboard, getDRE, getProjectFinancials
}