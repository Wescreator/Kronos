import api from './api'

// O backend responde com envelope plano: { success, events } / { success, event }.
export const getEventsByMonth = async (year, month) => {
  const { data } = await api.get('/calendar/month', {
    params: { year, month }
  })
  return data.events ?? []
}

export const getEventsByWeek = async (startOfWeek, endOfWeek) => {
  const { data } = await api.get('/calendar/week', {
    params: { startOfWeek, endOfWeek }
  })
  return data.events ?? []
}

export const getAgendaEvents = async (fromDate) => {
  const { data } = await api.get('/calendar/agenda', {
    params: { fromDate }
  })
  return data.events ?? []
}

export const getEventById = async (id) => {
  const { data } = await api.get(`/calendar/${id}`)
  return data.event ?? data
}

// `idempotencyKey` (opcional) — ver hooks/useIdempotencyKey.
export const createEvent = async (payload, idempotencyKey) => {
  const { data } = await api.post('/calendar', payload, idempotencyKey ? { idempotencyKey } : {})
  return data.event ?? data
}

export const updateEvent = async (id, payload) => {
  const { data } = await api.patch(`/calendar/${id}`, payload)
  return data.event ?? data
}

export const deleteEvent = async (id) => {
  const { data } = await api.delete(`/calendar/${id}`)
  return data
}