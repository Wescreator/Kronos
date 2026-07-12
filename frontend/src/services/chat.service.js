import api from './api'

// Chave de idempotência opcional nas criações — ver hooks/useIdempotencyKey.
const idem = (key) => (key ? { idempotencyKey: key } : {})

export const getRooms    = ()        => api.get('/chat/rooms')
export const createRoom  = (d, k)    => api.post('/chat/rooms', d, idem(k))
export const deleteRoom  = (id)      => api.delete(`/chat/rooms/${id}`)
export const getMessages = (id, p)   => api.get(`/chat/rooms/${id}/messages`, { params: p })
export const sendMessage = (id, d, k)=> api.post(`/chat/rooms/${id}/messages`, d, idem(k))