import api from './api'

// ── Orçamentos ──────────────────────────────────────────────────
export const getBudgets       = (params) => api.get('/budgets', { params })
export const getBudget        = (id)     => api.get(`/budgets/${id}`)
export const createBudget     = (data)   => api.post('/budgets', data)
export const updateBudget     = (id, data) => api.put(`/budgets/${id}`, data)
export const deleteBudget     = (id)     => api.delete(`/budgets/${id}`)

// ── Motor de cálculo (preview em tempo real) ─────────────────────
export const calculateBudgetPreview = (data) => api.post('/budgets/calculate-preview', data)

// ── Ciclo de vida ────────────────────────────────────────────────
export const finalizeBudget         = (id) => api.post(`/budgets/${id}/finalize`)
export const checkBudgetDivergence  = (id) => api.get(`/budgets/${id}/divergence`)
export const applyCurrentRates      = (id) => api.post(`/budgets/${id}/apply-current-rates`)
export const recalculateBudget      = (id) => api.post(`/budgets/${id}/recalculate`)
export const getBudgetLatestSnapshot = (id) => api.get(`/budgets/${id}/snapshot/latest`)

// ── Configuração (Títulos / Níveis / Taxas) ──────────────────────
export const getBudgetConfigStructure = () => api.get('/budget-config')
export const createBudgetTitle = (data)     => api.post('/budget-config/titles', data)
export const updateBudgetTitle = (id, data) => api.put(`/budget-config/titles/${id}`, data)
export const deleteBudgetTitle = (id)       => api.delete(`/budget-config/titles/${id}`)
export const createBudgetLevel = (data)     => api.post('/budget-config/levels', data)
export const updateBudgetLevel = (id, data) => api.put(`/budget-config/levels/${id}`, data)
export const deleteBudgetLevel = (id)       => api.delete(`/budget-config/levels/${id}`)
export const setBudgetLevelRate = (id, data) => api.put(`/budget-config/levels/${id}/rate`, data)