import api from './api'

/* As funções de CRIAÇÃO aceitam uma chave de idempotência opcional (2º arg).
 * Ela vem do hook useIdempotencyKey — uma chave por intenção do usuário — e o
 * backend a usa para reconhecer repetições da MESMA requisição (duplo clique,
 * outra aba, retry) sem criar um segundo registro. Sem a chave, o
 * comportamento é o antigo: cada requisição cria um registro. */
const idem = (key) => (key ? { idempotencyKey: key } : {})

export const getFinancialDashboard = (p)    => api.get('/financial/dashboard', { params: p })
export const getDRE                = (p)    => api.get('/financial/dre', { params: p })
export const getProjectFinancials  = ()     => api.get('/financial/projects')

// Análise avançada — leitura pura (novos)
export const getExpensesByCategory = (p)    => api.get('/financial/expenses-by-category', { params: p })
export const getFinancialForecast  = ()     => api.get('/financial/forecast')

export const getExpenses    = (p)    => api.get('/financial/expenses',   { params: p })
export const createExpense  = (d, k) => api.post('/financial/expenses',  d, idem(k))
export const updateExpense  = (id,d) => api.patch(`/financial/expenses/${id}`, d)
export const deleteExpense  = (id)   => api.delete(`/financial/expenses/${id}`)
export const confirmPayment = (id,d) => api.patch(`/financial/expenses/${id}/pay`, d)

export const getRevenues        = (p)    => api.get('/financial/revenues',   { params: p })
export const createRevenue      = (d, k) => api.post('/financial/revenues',  d, idem(k))
export const confirmReceipt     = (id,d) => api.patch(`/financial/revenues/installments/${id}/receive`, d)
export const updateInstallment  = (id,d) => api.patch(`/financial/revenues/installments/${id}`, d)
export const deleteRevenue      = (id)   => api.delete(`/financial/revenues/${id}`)

export const getCategories  = ()     => api.get('/financial/categories')
export const createCategory = (d, k) => api.post('/financial/categories',  d, idem(k))
export const updateCategory = (id,d) => api.patch(`/financial/categories/${id}`, d)
export const deleteCategory = (id)   => api.delete(`/financial/categories/${id}`)