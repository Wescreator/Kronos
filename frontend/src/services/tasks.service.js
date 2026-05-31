import api from './api'

export const getTasks        = (params) => api.get('/tasks', { params })
export const getTask         = (id)     => api.get(`/tasks/${id}`)
export const createTask      = (data)   => api.post('/tasks', data)
export const updateTask      = (id, d)  => api.patch(`/tasks/${id}`, d)
export const getTasksDashboard = ()     => api.get('/tasks/dashboard')
export const addTaskComment  = (id, data) => {
  const fd = new FormData()
  fd.append('content', data.content)
  if (data.file) fd.append('file', data.file)
  return api.post(`/tasks/${id}/comments`, fd)
}