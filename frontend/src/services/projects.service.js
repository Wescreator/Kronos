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

// Etapas e fases
export const getStages    = (projectId)                    => api.get(`/projects/${projectId}/stages`)
export const addPhase     = (projectId, stageId, data)     => api.post(`/projects/${projectId}/stages/${stageId}/phases`, data)
export const updatePhase  = (projectId, stageId, phaseId, data) =>
  api.patch(`/projects/${projectId}/stages/${stageId}/phases/${phaseId}`, data)
export const deletePhase  = (projectId, stageId, phaseId)  =>
  api.delete(`/projects/${projectId}/stages/${stageId}/phases/${phaseId}`)