import axios from 'axios'

const baseURL = import.meta.env.PROD
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api'

if (import.meta.env.DEV) {
  console.log('[API] baseURL:', baseURL)
  console.log('[API] VITE_API_URL:', import.meta.env.VITE_API_URL)
}

const api = axios.create({
  baseURL,
  timeout: 60000,
  withCredentials: false,
})

/* ─── Helpers de storage ─── */
const getAccessToken  = () => localStorage.getItem('accessToken')  || sessionStorage.getItem('accessToken')
const getRefreshToken = () => localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken')

api.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) config.headers.Authorization = `Bearer ${token}`

  /* ── Developer: impersonação de empresa ──────────────────────────
   * Quando o developer impersona uma empresa, o company_id fica
   * gravado no sessionStorage e é injetado como header em cada
   * requisição. O TenantMiddleware no backend usa este valor.
   */
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

    if (import.meta.env.DEV) {
      console.error('[API Error]', {
        url:    original?.url,
        status: error.response?.status,
        data:   error.response?.data,
      })
    }

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const refreshToken = getRefreshToken()
        if (!refreshToken) throw new Error('Sem refresh token')

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