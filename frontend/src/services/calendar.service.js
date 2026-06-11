// frontend/services/calendar.service.js

import api from './api'

export const getEventsByMonth = (year, month) =>
  api.get('/calendar/month', {
    params: { year, month }
  })

export const getEventsByWeek = (startOfWeek, endOfWeek) =>
  api.get('/calendar/week', {
    params: { startOfWeek, endOfWeek }
  })

export const getAgendaEvents = (fromDate) =>
  api.get('/calendar/agenda', {
    params: { fromDate }
  })

export const getEventById = (id) =>
  api.get(`/calendar/${id}`)

export const createEvent = (data) =>
  api.post('/calendar', data)

export const updateEvent = (id, data) =>
  api.patch(`/calendar/${id}`, data)

export const deleteEvent = (id) =>
  api.delete(`/calendar/${id}`)