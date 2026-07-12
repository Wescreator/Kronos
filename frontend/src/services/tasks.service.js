import api from './api'

// Chave de idempotência opcional nas criações — ver hooks/useIdempotencyKey.
const idem = (key) => (key ? { idempotencyKey: key } : {})

export const getTasks        = (params) => api.get('/tasks', { params })
export const getTask         = (id)     => api.get(`/tasks/${id}`)
export const createTask      = (data, k)=> api.post('/tasks', data, idem(k))
export const updateTask      = (id, d)  => api.patch(`/tasks/${id}`, d)
export const deleteTask      = (id)     => api.delete(`/tasks/${id}`)
export const getTasksDashboard = ()     => api.get('/tasks/dashboard')
export const addTaskComment  = (id, data, k) => {
  const fd = new FormData()
  fd.append('content', data.content)
  if (data.file) fd.append('file', data.file)
  return api.post(`/tasks/${id}/comments`, fd, idem(k))
}