import api from './api'

export const getFinancialDashboard  = ()       => api.get('/financial/dashboard')
export const getDRE                 = (p)      => api.get('/financial/dre', { params: p })
export const getProjectFinancials   = ()       => api.get('/financial/projects')

export const getExpenses    = (p)    => api.get('/financial/expenses',   { params: p })
export const createExpense  = (d)    => api.post('/financial/expenses',  d)
export const updateExpense  = (id,d) => api.patch(`/financial/expenses/${id}`, d)
export const deleteExpense  = (id)   => api.delete(`/financial/expenses/${id}`)
export const confirmPayment = (id,d) => api.patch(`/financial/expenses/${id}/pay`, d)

export const getRevenues     = (p)   => api.get('/financial/revenues',   { params: p })
export const createRevenue   = (d)   => api.post('/financial/revenues',  d)
export const confirmReceipt  = (id,d)=> api.patch(`/financial/revenues/installments/${id}/receive`, d)

export const getCategories   = ()    => api.get('/financial/categories')
export const createCategory  = (d)   => api.post('/financial/categories',  d)
export const updateCategory  = (id,d)=> api.patch(`/financial/categories/${id}`, d)
export const deleteCategory  = (id)  => api.delete(`/financial/categories/${id}`)
export const deleteRevenue = (id) => api.delete(`/financial/revenues/${id}`)