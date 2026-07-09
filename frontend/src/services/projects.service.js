import api from './api'

export const getProjects       = (params)    => api.get('/projects', { params })
export const getProject        = (id)        => api.get(`/projects/${id}`)
export const createProject     = (data)      => api.post('/projects', data)
export const updateProject     = (id, d)     => api.patch(`/projects/${id}`, d)
export const deleteProject     = (id)        => api.delete(`/projects/${id}`)
export const uploadCover       = (id, f)     => {
  const fd = new FormData(); fd.append('cover', f)
  return api.post(`/projects/${id}/cover`, fd)
}
export const getProjectHistory = (id)        => api.get(`/projects/${id}/history`)
export const addMember         = (id, userId)=> api.post(`/projects/${id}/members`, { user_id: userId })
export const removeMember      = (id, userId)=> api.delete(`/projects/${id}/members/${userId}`)
export const deleteProjectFile = (projectId, fileId) => api.delete(`/projects/${projectId}/files/${fileId}`)

// Etapas
export const getStages     = (projectId)                => api.get(`/projects/${projectId}/stages`)
export const createStage   = (projectId, data)          => api.post(`/projects/${projectId}/stages`, data)
export const updateStage   = (projectId, stageId, data) => api.patch(`/projects/${projectId}/stages/${stageId}`, data)
export const deleteStage   = (projectId, stageId)       => api.delete(`/projects/${projectId}/stages/${stageId}`)
export const reorderStages = (projectId, orderedIds)    =>
  api.patch(`/projects/${projectId}/stages/reorder`, { ordered_ids: orderedIds })

// Fases
export const addPhase      = (projectId, stageId, data) => api.post(`/projects/${projectId}/stages/${stageId}/phases`, data)
export const updatePhase   = (projectId, stageId, phaseId, data) =>
  api.patch(`/projects/${projectId}/stages/${stageId}/phases/${phaseId}`, data)
export const deletePhase   = (projectId, stageId, phaseId)  =>
  api.delete(`/projects/${projectId}/stages/${stageId}/phases/${phaseId}`)
export const reorderPhases = (projectId, stageId, orderedIds) =>
  api.patch(`/projects/${projectId}/stages/${stageId}/phases/reorder`, { ordered_ids: orderedIds })

// Comentários da fase (histórico)
export const addPhaseComment    = (projectId, stageId, phaseId, content) =>
  api.post(`/projects/${projectId}/stages/${stageId}/phases/${phaseId}/comments`, { content })
export const updatePhaseComment = (projectId, stageId, phaseId, commentId, content) =>
  api.patch(`/projects/${projectId}/stages/${stageId}/phases/${phaseId}/comments/${commentId}`, { content })
export const deletePhaseComment = (projectId, stageId, phaseId, commentId) =>
  api.delete(`/projects/${projectId}/stages/${stageId}/phases/${phaseId}/comments/${commentId}`)

// Anexos da fase
export const uploadPhaseAttachment = (projectId, stageId, phaseId, file) => {
  const fd = new FormData(); fd.append('file', file)
  return api.post(`/projects/${projectId}/stages/${stageId}/phases/${phaseId}/attachments`, fd)
}
export const deletePhaseAttachment = (projectId, stageId, phaseId, attachmentId) =>
  api.delete(`/projects/${projectId}/stages/${stageId}/phases/${phaseId}/attachments/${attachmentId}`)