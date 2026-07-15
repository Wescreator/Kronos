import api from './api'

// Relatório de Projeto (documento p/ PDF). Endpoints admin-gated no backend.
export const getProjectReport  = (projectId)       => api.get(`/projects/${projectId}/report`)
export const saveProjectReport = (projectId, data) => api.put(`/projects/${projectId}/report`, data)
