import { create } from 'zustand'

const useAuthStore = create((set) => ({
  user:            null,
  accessToken:     localStorage.getItem('accessToken')  || null,
  refreshToken:    localStorage.getItem('refreshToken') || null,
  isAuthenticated: !!localStorage.getItem('accessToken'),

  setAuth: (user, accessToken, refreshToken) => {
    // Limpa tudo antes de salvar o novo login
    localStorage.clear()
    localStorage.setItem('accessToken',  accessToken)
    localStorage.setItem('refreshToken', refreshToken)
    set({
      user,
      accessToken,
      refreshToken,
      isAuthenticated: true
    })
  },

  setUser: (user) => set({ user }),

  logout: () => {
    localStorage.clear()
    set({
      user:            null,
      accessToken:     null,
      refreshToken:    null,
      isAuthenticated: false
    })
  },

  updateToken: (accessToken) => {
    localStorage.setItem('accessToken', accessToken)
    set({ accessToken })
  }
}))

export default useAuthStore