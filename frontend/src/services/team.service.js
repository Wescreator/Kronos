import api from './api'

export const getUsers   = (p)    => api.get('/users', { params: p })
export const getUser    = (id)   => api.get(`/users/${id}`)
export const updateUser = (id,d) => api.patch(`/users/${id}`, d)
export const uploadAvatar = (id, file) => {
  const fd = new FormData(); fd.append('avatar', file)
  return api.post(`/users/${id}/avatar`, fd)
}