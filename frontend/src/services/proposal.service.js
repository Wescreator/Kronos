import api from './api'

export const getProposals    = (params) => api.get('/proposals', { params })
export const getProposal     = (id)     => api.get(`/proposals/${id}`)
export const createProposal  = (data)   => api.post('/proposals', data)
export const updateProposal  = (id, data) => api.put(`/proposals/${id}`, data)
export const duplicateProposal = (id)   => api.post(`/proposals/${id}/duplicate`)
export const deleteProposal  = (id)     => api.delete(`/proposals/${id}`)