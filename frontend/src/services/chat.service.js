import api from './api'

export const getRooms       = ()        => api.get('/chat/rooms')
export const createRoom     = (d)       => api.post('/chat/rooms', d)
export const getMessages    = (id, p)   => api.get(`/chat/rooms/${id}/messages`, { params: p })
export const sendMessage    = (id, d)   => api.post(`/chat/rooms/${id}/messages`, d)