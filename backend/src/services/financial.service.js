const repo = require('../repositories/financial.repository')
const { paginate, paginatedResponse } = require('../utils/pagination')
const { addMonths, format } = require('date-fns')

const getExpenses = async (query) => {
  const { page, limit, offset } = paginate(query)
  const { rows, total } = await repo.findExpenses({
    limit, offset,
    status:     query.status,
    categoryId: query.category_id,
    projectId:  query.project_id
  })
  return paginatedResponse(rows, total, page, limit)
}

const createExpense = async (data, userId) => {
  return await repo.createExpense({
    title:       data.title,
    description: data.description,
    projectId:   data.project_id   || null,
    categoryId:  data.category_id  || null,
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
  const fields = {}
  const allowed = ['title','description','project_id','category_id','amount','due_date','status']
  for (const key of allowed) {
    if (data[key] !== undefined) fields[key] = data[key]
  }
  return await repo.updateExpense(id, fields)
}

const deleteExpense = async (id) => {
  await repo.deleteExpense(id)
}

const getRevenues = async (query) => {
  const { page, limit, offset } = paginate(query)
  const { rows, total } = await repo.findRevenues({
    limit, offset,
    status:    query.status,
    projectId: query.project_id
  })
  return paginatedResponse(rows, total, page, limit)
}

const createRevenue = async (data, userId) => {
  const revenue = await repo.createRevenue({
    title:        data.title,
    client:       data.client,
    projectId:    data.project_id  || null,
    totalAmount:  data.total_amount,
    installments: data.installments || 1,
    description:  data.description,
    createdBy:    userId
  })

  const installmentAmount = parseFloat((data.total_amount / data.installments).toFixed(2))
  const baseDate = new Date(data.due_date)
  const installmentsList = []

  for (let i = 0; i < data.installments; i++) {
    installmentsList.push({
      no:      i + 1,
      amount:  i === data.installments - 1
               ? data.total_amount - installmentAmount * (data.installments - 1)
               : installmentAmount,
      dueDate: format(addMonths(baseDate, i), 'yyyy-MM-dd')
    })
  }

  await repo.createInstallments(revenue.id, installmentsList)
  return revenue
}

const confirmReceipt = async (installmentId, receivedDate) => {
  const inst = await repo.confirmReceipt(installmentId, receivedDate)
  if (!inst) throw { status: 404, message: 'Parcela não encontrada' }
  return inst
}

const getCategories = async () => repo.findCategories()

const createCategory = async (data, userId) => {
  return await repo.createCategory(data.name, data.color, userId)
}

const updateCategory = async (id, data) => {
  return await repo.updateCategory(id, data.name, data.color)
}

const deleteCategory = async (id) => {
  await repo.deleteCategory(id)
}

const getDashboard = async () => {
  const stats = await repo.getDashboardStats()
  const year  = new Date().getFullYear()
  const cashflow = await repo.getCashflow(year)
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
  getRevenues, createRevenue, confirmReceipt,
  getCategories, createCategory, updateCategory, deleteCategory,
  getDashboard, getDRE, getProjectFinancials
}