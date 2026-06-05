import api from './api'

export const login          = (data)  => api.post('/auth/login', data)
export const register       = (data)  => api.post('/auth/register', data)
export const getMe          = ()      => api.get('/auth/me')
export const refresh        = (token) => api.post('/auth/refresh', { refreshToken: token })
export const forgotPassword = (email) => api.post('/auth/forgot-password', { email })
export const resetPassword  = (token, password) => api.post('/auth/reset-password', { token, password })