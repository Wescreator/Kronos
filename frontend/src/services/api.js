import axios from 'axios'

// Em desenvolvimento usa proxy do Vite (/api → localhost:3001)
// Em produção usa VITE_API_URL
const baseURL = import.meta.env.PROD
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api'

const api = axios.create({
  baseURL,
  timeout: 15000,
  withCredentials: false,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const refreshToken = localStorage.getItem('refreshToken')
        if (!refreshToken) throw new Error('Sem refresh token')

        const { data } = await axios.post(`${baseURL}/auth/refresh`, { refreshToken })
        localStorage.setItem('accessToken', data.accessToken)
        original.headers.Authorization = `Bearer ${data.accessToken}`
        return api(original)
      } catch {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        window.location.href = '/login'
        return Promise.reject(error)
      }
    }

    return Promise.reject(error)
  }
)

export default api