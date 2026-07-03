import axios from 'axios'

/**
 * CONFIGURAÇÃO DA URL BASE
 * Em produção: https://kronos-h6m5.onrender.com/api
 * Em desenvolvimento: /api (o proxy do Vite redireciona para localhost:3001/api)
 */
const baseURL = import.meta.env.MODE === 'production' 
  ? `${import.meta.env.VITE_API_URL}/api` 
  : '/api'

const api = axios.create({
  baseURL,
  timeout: 60000,
  withCredentials: true,
})

/* ─── Helpers de storage ─── */
const getAccessToken  = () => localStorage.getItem('accessToken')  || sessionStorage.getItem('accessToken')
const getRefreshToken = () => localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken')

api.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) config.headers.Authorization = `Bearer ${token}`

  const impersonateCompany = sessionStorage.getItem('impersonateCompany')
  if (impersonateCompany) {
    config.headers['X-Impersonate-Company'] = impersonateCompany
  }

  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const refreshToken = getRefreshToken()
        if (!refreshToken) throw new Error('Sem refresh token')

        // Chamada de refresh token usando a URL base correta
        const { data } = await axios.post(`${baseURL}/auth/refresh`, { refreshToken })

        if (localStorage.getItem('refreshToken')) {
          localStorage.setItem('accessToken', data.accessToken)
        } else {
          sessionStorage.setItem('accessToken', data.accessToken)
        }

        original.headers.Authorization = `Bearer ${data.accessToken}`
        return api(original)
      } catch {
        localStorage.clear()
        sessionStorage.clear()
        window.location.href = '/login'
        return Promise.reject(error)
      }
    }

    return Promise.reject(error)
  }
)

export default api