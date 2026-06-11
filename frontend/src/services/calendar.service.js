import api from './api'

export const getEventsByMonth = async (year, month) => {
  const { data } = await api.get('/calendar/month', {
    params: { year, month }
  })
  return data
}

export const getEventsByWeek = async (startOfWeek, endOfWeek) => {
  const { data } = await api.get('/calendar/week', {
    params: { startOfWeek, endOfWeek }
  })
  return data
}

export const getAgendaEvents = async (fromDate) => {
  const { data } = await api.get('/calendar/agenda', {
    params: { fromDate }
  })
  return data
}

export const getEventById = async (id) => {
  const { data } = await api.get(`/calendar/${id}`)
  return data
}

export const createEvent = async (payload) => {
  const { data } = await api.post('/calendar', payload)
  return data
}

export const updateEvent = async (id, payload) => {
  const { data } = await api.patch(`/calendar/${id}`, payload)
  return data
}

export const deleteEvent = async (id) => {
  const { data } = await api.delete(`/calendar/${id}`)
  return data
}