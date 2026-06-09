import axios from 'axios'

const baseURL = import.meta.env.PROD
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api'

console.log('[API] baseURL:', baseURL)
console.log('[API] PROD:', import.meta.env.PROD)
console.log('[API] VITE_API_URL:', import.meta.env.VITE_API_URL)

const api = axios.create({
  baseURL,
  timeout: 60000,
  withCredentials: false,
})

/* ─── Helper: lê token de qualquer storage ─── */
const getAccessToken  = () => localStorage.getItem('accessToken')  || sessionStorage.getItem('accessToken')
const getRefreshToken = () => localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken')

api.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config

    console.error('[API Error]', {
      url:    original?.url,
      status: error.response?.status,
      data:   error.response?.data,
    })

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const refreshToken = getRefreshToken()
        if (!refreshToken) throw new Error('Sem refresh token')

        const { data } = await axios.post(`${baseURL}/auth/refresh`, { refreshToken })

        // Salva no mesmo storage que já estava sendo usado
        if (localStorage.getItem('refreshToken')) {
          localStorage.setItem('accessToken', data.accessToken)
        } else {
          sessionStorage.setItem('accessToken', data.accessToken)
        }

        original.headers.Authorization = `Bearer ${data.accessToken}`
        return api(original)
      } catch {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        sessionStorage.removeItem('accessToken')
        sessionStorage.removeItem('refreshToken')
        window.location.href = '/login'
        return Promise.reject(error)
      }
    }

    return Promise.reject(error)
  }
)

export default api