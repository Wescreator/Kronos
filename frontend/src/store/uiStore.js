import { create } from 'zustand'
import { getActiveTheme, persistTheme, applyTheme, resolveTheme, applyUserTheme } from '../utils/theme'
import useAuthStore from './authStore'

const useUIStore = create((set, get) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebar: (open) => set({ sidebarOpen: open }),

  /* ── Tema ── por usuário; padrão claro ── */
  theme: getActiveTheme(),

  setTheme: (theme) => {
    persistTheme(theme, useAuthStore.getState().user?.user_id)
    applyTheme(theme)
    set({ theme })
  },

  // Alterna claro <-> escuro e salva na preferência do usuário logado.
  toggleTheme: () => {
    const next = resolveTheme(get().theme) === 'dark' ? 'light' : 'dark'
    persistTheme(next, useAuthStore.getState().user?.user_id)
    applyTheme(next)
    set({ theme: next })
  },

  // Carrega e aplica o tema do usuário (chamado quando ele loga / sessão é restaurada).
  syncUserTheme: (userId) => {
    set({ theme: applyUserTheme(userId) })
  },
}))

export default useUIStore
