import api from './api'

export const getProjects      = (params) => api.get('/projects', { params })
export const getProject       = (id)     => api.get(`/projects/${id}`)
export const createProject    = (data)   => api.post('/projects', data)
export const updateProject    = (id, d)  => api.patch(`/projects/${id}`, d)
export const uploadCover      = (id, f)  => {
  const fd = new FormData(); fd.append('cover', f)
  return api.post(`/projects/${id}/cover`, fd)
}
export const getProjectHistory = (id)   => api.get(`/projects/${id}/history`)
export const addMember         = (id, userId) => api.post(`/projects/${id}/members`, { user_id: userId })
export const removeMember      = (id, userId) => api.delete(`/projects/${id}/members/${userId}`)