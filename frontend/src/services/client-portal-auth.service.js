import api from './api'

// Login do cliente no portal — endpoint público separado do login interno
// (services/auth.service.js não é tocado por este arquivo).
export const clientPortalLogin = ({ email, password }) =>
  api.post('/client-portal/auth/login', { email, password })

export const clientPortalRefresh = (refreshToken) =>
  api.post('/client-portal/auth/refresh', { refreshToken })