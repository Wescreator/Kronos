import { create } from 'zustand'

/* ─── Helpers de storage ───
 * "Lembre-me" marcado  → localStorage  (persiste ao fechar o navegador)
 * "Lembre-me" desmarcado → sessionStorage (limpa ao fechar o navegador)
 */
const getStoredToken = (key) =>
  localStorage.getItem(key) || sessionStorage.getItem(key)

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
    // Limpa ambos antes de gravar — evita tokens órfãos
    localStorage.clear()
    sessionStorage.clear()

    const storage = remember ? localStorage : sessionStorage
    storage.setItem('accessToken',  accessToken)
    storage.setItem('refreshToken', refreshToken)

    set({
      user,
      accessToken,
      refreshToken,
      isAuthenticated: true,
    })
  },

  setUser: (user) => set({ user }),

  logout: () => {
    localStorage.clear()
    sessionStorage.clear()
    set({
      user:            null,
      accessToken:     null,
      refreshToken:    null,
      isAuthenticated: false,
    })
  },

  updateToken: (accessToken) => {
    // Atualiza no storage onde o token atual está gravado
    if (localStorage.getItem('accessToken')) {
      localStorage.setItem('accessToken', accessToken)
    } else {
      sessionStorage.setItem('accessToken', accessToken)
    }
    set({ accessToken })
  },
}))

export default useAuthStore