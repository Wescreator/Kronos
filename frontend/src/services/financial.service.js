import api from './api'

export const getFinancialDashboard = (p)    => api.get('/financial/dashboard', { params: p })
export const getDRE                = (p)    => api.get('/financial/dre', { params: p })
export const getProjectFinancials  = ()     => api.get('/financial/projects')

// Análise avançada — leitura pura (novos)
export const getExpensesByCategory = (p)    => api.get('/financial/expenses-by-category', { params: p })
export const getFinancialForecast  = ()     => api.get('/financial/forecast')

export const getExpenses    = (p)    => api.get('/financial/expenses',   { params: p })
export const createExpense  = (d)    => api.post('/financial/expenses',  d)
export const updateExpense  = (id,d) => api.patch(`/financial/expenses/${id}`, d)
export const deleteExpense  = (id)   => api.delete(`/financial/expenses/${id}`)
export const confirmPayment = (id,d) => api.patch(`/financial/expenses/${id}/pay`, d)

export const getRevenues        = (p)    => api.get('/financial/revenues',   { params: p })
export const createRevenue      = (d)    => api.post('/financial/revenues',  d)
export const confirmReceipt     = (id,d) => api.patch(`/financial/revenues/installments/${id}/receive`, d)
export const updateInstallment  = (id,d) => api.patch(`/financial/revenues/installments/${id}`, d)
export const deleteRevenue      = (id)   => api.delete(`/financial/revenues/${id}`)

export const getCategories  = ()     => api.get('/financial/categories')
export const createCategory = (d)    => api.post('/financial/categories',  d)
export const updateCategory = (id,d) => api.patch(`/financial/categories/${id}`, d)
export const deleteCategory = (id)   => api.delete(`/financial/categories/${id}`)