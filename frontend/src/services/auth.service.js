import api from './api'

export const login          = (data)  => api.post('/auth/login', data)
export const register       = (data)  => api.post('/auth/register', data)
// Logout server-side: invalida os refresh tokens ativos (incrementa
// token_version no backend). `config` permite passar o Authorization
// explicitamente, já que o storage é limpo em seguida no authStore.
export const logout         = (config) => api.post('/auth/logout', {}, config)
export const getMe          = ()      => api.get('/auth/me')
export const refresh        = (token) => api.post('/auth/refresh', { refreshToken: token })
export const forgotPassword = (email) => api.post('/auth/forgot-password', { email })
export const resetPassword  = (token, password) => api.post('/auth/reset-password', { token, password })