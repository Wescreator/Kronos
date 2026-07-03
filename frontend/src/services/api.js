import axios from 'axios'

// Em produção, usamos diretamente a URL do servidor. 
// Em desenvolvimento, usamos o proxy (deixamos a string vazia para o axios usar a URL relativa)
const baseURL = import.meta.env.MODE === 'production' 
  ? import.meta.env.VITE_API_URL 
  : ''

if (import.meta.env.DEV) {
  console.log('[API] Modo:', import.meta.env.MODE)
  console.log('[API] baseURL definida:', baseURL)
}

const api = axios.create({
  baseURL, // Agora aponta diretamente para o seu Render em produção
  timeout: 60000,
  withCredentials: true, // Alterado para true para permitir envio de cookies/auth entre domínios
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

        // Ajuste aqui: garantir que o refresh token chame a URL correta
        // Se estiver em produção, ele usará a baseURL (Render). 
        // Se estiver em dev, o proxy cuidará disso.
        const { data } = await axios.post(`${baseURL}/api/auth/refresh`, { refreshToken })

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