import { create } from 'zustand'

/* ─── Helpers de storage ──────────────────────────────────────────
 * "Lembrar-me" marcado    → localStorage  (persiste ao fechar)
 * "Lembrar-me" desmarcado → sessionStorage (limpa ao fechar)
 */
const getStoredToken = (key) =>
  localStorage.getItem(key) || sessionStorage.getItem(key)

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
  user:            null,
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