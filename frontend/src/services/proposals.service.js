import api from './api'

// Chave de idempotência opcional nas criações — ver hooks/useIdempotencyKey.
const idem = (key) => (key ? { idempotencyKey: key } : {})

export const getProposals    = (params) => api.get('/proposals', { params })
export const getProposal     = (id)     => api.get(`/proposals/${id}`)
export const createProposal  = (data, k)=> api.post('/proposals', data, idem(k))
export const updateProposal  = (id, data) => api.put(`/proposals/${id}`, data)
export const duplicateProposal = (id, k)=> api.post(`/proposals/${id}/duplicate`, null, idem(k))
export const deleteProposal  = (id)     => api.delete(`/proposals/${id}`)