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

/* Escopo da sessão ('company' | 'global' | 'client'), gravado pelo
 * authStore no login. Clientes do portal usam OUTRO endpoint de refresh
 * (/client-portal/auth/refresh) e OUTRA tela de login — o endpoint
 * interno rejeitaria o token deles (procura o id em `users`) e o
 * redirect para /login os tiraria do portal. */
const getStoredScope = () => localStorage.getItem('authScope') || sessionStorage.getItem('authScope')

const refreshEndpoint = () =>
  getStoredScope() === 'client' ? '/client-portal/auth/refresh' : '/auth/refresh'

const loginPath = () =>
  getStoredScope() === 'client' ? '/portal/login' : '/login'

api.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) config.headers.Authorization = `Bearer ${token}`

  const impersonateCompany = sessionStorage.getItem('impersonateCompany')
  if (impersonateCompany) {
    config.headers['X-Impersonate-Company'] = impersonateCompany
  }

  return config
})

/* ─── Refresh single-flight ───
 * Várias requisições podem tomar 401 ao mesmo tempo (ex.: dashboard
 * disparando 3 GETs em paralelo com token expirado). Todas aguardam a
 * MESMA promise de refresh em vez de disparar N chamadas concorrentes —
 * indispensável quando o refresh token passar a ser rotacionado no
 * backend (a 2ª chamada invalidaria a 1ª). */
let refreshPromise = null

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const refreshToken = getRefreshToken()
        if (!refreshToken) throw new Error('Sem refresh token')

        if (!refreshPromise) {
          refreshPromise = axios
            .post(`${baseURL}${refreshEndpoint()}`, { refreshToken })
            .finally(() => { refreshPromise = null })
        }
        const { data } = await refreshPromise

        if (localStorage.getItem('refreshToken')) {
          localStorage.setItem('accessToken', data.accessToken)
        } else {
          sessionStorage.setItem('accessToken', data.accessToken)
        }

        original.headers.Authorization = `Bearer ${data.accessToken}`
        return api(original)
      } catch {
        // Calcula o destino ANTES de limpar o storage (o escopo mora lá).
        const dest = loginPath()
        localStorage.clear()
        sessionStorage.clear()
        window.location.href = dest
        return Promise.reject(error)
      }
    }

    return Promise.reject(error)
  }
)

export default api
