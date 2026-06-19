const financialService = require('../services/financial.service')
const R = require('../utils/response')

const getDashboard = async (req, res) => {
  try { return R.success(res, await financialService.getDashboard(req.query)) }
  catch (err) { return R.error(res, err.message, err.status || 500) }
}

const getDRE = async (req, res) => {
  try {
    const { start, end } = req.query
    if (!start || !end) return R.badRequest(res, 'Informe start e end (YYYY-MM-DD)')
    return R.success(res, { dre: await financialService.getDRE(start, end) })
  } catch (err) { return R.error(res, err.message, err.status || 500) }
}

const getProjectFinancials = async (req, res) => {
  try { return R.success(res, { projects: await financialService.getProjectFinancials() }) }
  catch (err) { return R.error(res, err.message, err.status || 500) }
}

const getExpenses = async (req, res) => {
  try { return R.success(res, await financialService.getExpenses(req.query)) }
  catch (err) { return R.error(res, err.message, err.status || 500) }
}

const createExpense = async (req, res) => {
  try { return R.created(res, { expense: await financialService.createExpense(req.body, req.user.user_id) }) }
  catch (err) { return R.error(res, err.message, err.status || 500) }
}

const confirmPayment = async (req, res) => {
  try { return R.success(res, { expense: await financialService.confirmPayment(req.params.id, req.body.paid_date) }) }
  catch (err) { return R.error(res, err.message, err.status || 500) }
}

const updateExpense = async (req, res) => {
  try { return R.success(res, { expense: await financialService.updateExpense(req.params.id, req.body) }) }
  catch (err) { return R.error(res, err.message, err.status || 500) }
}

const deleteExpense = async (req, res) => {
  try { await financialService.deleteExpense(req.params.id); return R.success(res, { message: 'Despesa excluída' }) }
  catch (err) { return R.error(res, err.message, err.status || 500) }
}

const getExpensesByCategory = async (req, res) => {
  try {
    const { month, year } = req.query
    return R.success(res, { categories: await financialService.getExpensesByCategory(month, year) })
  } catch (err) { return R.error(res, err.message, err.status || 500) }
}

const getForecast = async (req, res) => {
  try { return R.success(res, await financialService.getForecast()) }
  catch (err) { return R.error(res, err.message, err.status || 500) }
}

const getRevenues = async (req, res) => {
  try { return R.success(res, await financialService.getRevenues(req.query)) }
  catch (err) { return R.error(res, err.message, err.status || 500) }
}

const createRevenue = async (req, res) => {
  try { return R.created(res, { revenue: await financialService.createRevenue(req.body, req.user.user_id) }) }
  catch (err) { return R.error(res, err.message, err.status || 500) }
}

const deleteRevenue = async (req, res) => {
  try { await financialService.deleteRevenue(req.params.id); return R.success(res, { message: 'Receita excluída' }) }
  catch (err) { return R.error(res, err.message, err.status || 500) }
}

const confirmReceipt = async (req, res) => {
  try { return R.success(res, { installment: await financialService.confirmReceipt(req.params.id, req.body.received_date) }) }
  catch (err) { return R.error(res, err.message, err.status || 500) }
}

const updateInstallment = async (req, res) => {
  try { return R.success(res, { installment: await financialService.updateInstallment(req.params.id, req.body) }) }
  catch (err) { return R.error(res, err.message, err.status || 500) }
}

const getCategories  = async (req, res) => {
  try { return R.success(res, { categories: await financialService.getCategories() }) }
  catch (err) { return R.error(res, err.message, err.status || 500) }
}

const createCategory = async (req, res) => {
  try { return R.created(res, { category: await financialService.createCategory(req.body, req.user.user_id) }) }
  catch (err) { return R.error(res, err.message, err.status || 500) }
}

const updateCategory = async (req, res) => {
  try { return R.success(res, { category: await financialService.updateCategory(req.params.id, req.body) }) }
  catch (err) { return R.error(res, err.message, err.status || 500) }
}

const deleteCategory = async (req, res) => {
  try { await financialService.deleteCategory(req.params.id); return R.success(res, { message: 'Categoria excluída' }) }
  catch (err) { return R.error(res, err.message, err.status || 500) }
}

module.exports = {
  getDashboard, getDRE, getProjectFinancials,
  getExpenses, createExpense, confirmPayment, updateExpense, deleteExpense,
  getExpensesByCategory, getForecast,
  getRevenues, createRevenue, deleteRevenue, confirmReceipt, updateInstallment,
  getCategories, createCategory, updateCategory, deleteCategory,
}