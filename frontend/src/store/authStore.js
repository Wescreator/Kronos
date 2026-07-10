import { create } from 'zustand'

/* ─── Helpers de storage ──────────────────────────────────────────
 * "Lembrar-me" marcado    → localStorage  (persiste ao fechar)
 * "Lembrar-me" desmarcado → sessionStorage (limpa ao fechar)
 */
const getStoredToken = (key) =>
  localStorage.getItem(key) || sessionStorage.getItem(key)

/* Rehidratação do usuário do PORTAL após F5: o fluxo interno recupera o
 * usuário via GET /auth/me (useAuth.js), mas esse endpoint não existe
 * para o escopo 'client' — sem isso, um F5 no portal derrubava o cliente
 * para a tela de login mesmo com tokens válidos. Guardamos o objeto de
 * usuário do portal no mesmo storage dos tokens e o restauramos aqui.
 * Usuários internos continuam vindo do /auth/me (dados sempre frescos). */
const getStoredPortalUser = () => {
  if (getStoredToken('authScope') !== 'client') return null
  try {
    return JSON.parse(getStoredToken('portalUser')) || null
  } catch {
    return null
  }
}

/* ─── Normalização do usuário ─────────────────────────────────────
 * Compatível com formato antigo (id, role) e novo multi-tenant
 * (user_id, scope, company_id, role).
 */
const normalizeUser = (user) => ({
  ...user,
  user_id:    user.user_id    || user.id    || null,
  scope:      user.scope      || 'company',
  company_id: user.company_id || null,
  role:       user.role       || 'employee',
})

const useAuthStore = create((set) => ({
  user:            getStoredPortalUser(),
  accessToken:     getStoredToken('accessToken')  || null,
  refreshToken:    getStoredToken('refreshToken') || null,
  isAuthenticated: !!getStoredToken('accessToken'),

  /**
   * @param {object}  user
   * @param {string}  accessToken
   * @param {string}  refreshToken
   * @param {boolean} remember — true = localStorage, false = sessionStorage
   */
  setAuth: (user, accessToken, refreshToken, remember = false) => {
    localStorage.clear()
    sessionStorage.clear()

    const storage = remember ? localStorage : sessionStorage
    storage.setItem('accessToken',  accessToken)
    storage.setItem('refreshToken', refreshToken)

    // O interceptor do axios (services/api.js) usa o escopo para escolher
    // o endpoint de refresh e a tela de login corretos (interno x portal).
    storage.setItem('authScope', user?.scope || 'company')
    if (user?.scope === 'client') {
      storage.setItem('portalUser', JSON.stringify(user))
    }

    set({
      user:            normalizeUser(user),
      accessToken,
      refreshToken,
      isAuthenticated: true,
    })
  },

  setUser: (user) => set((state) => ({
    user: normalizeUser({ ...state.user, ...user }),
  })),

  logout: () => {
    // Import dinâmico para evitar dependência circular estática
    // (socketStore importa useAuthStore para ler token/userId).
    import('./socketStore').then((m) => m.default.getState().disconnect())

    localStorage.clear()
    sessionStorage.clear()
    sessionStorage.removeItem('impersonateCompany')
    set({
      user:            null,
      accessToken:     null,
      refreshToken:    null,
      isAuthenticated: false,
    })
  },

  updateToken: (accessToken) => {
    if (localStorage.getItem('accessToken')) {
      localStorage.setItem('accessToken', accessToken)
    } else {
      sessionStorage.setItem('accessToken', accessToken)
    }
    set({ accessToken })
  },

  /* ── Developer: impersonar empresa ──────────────────────────────
   * Grava o company_id no sessionStorage para o interceptor do
   * axios injetar X-Impersonate-Company nas requisições.
   */
  startImpersonation: (companyId) => {
    sessionStorage.setItem('impersonateCompany', companyId)
    set((state) => ({
      user: { ...state.user, _impersonating: companyId },
    }))
  },

  stopImpersonation: () => {
    sessionStorage.removeItem('impersonateCompany')
    set((state) => {
      const user = { ...state.user }
      delete user._impersonating
      return { user }
    })
  },
}))

export default useAuthStore