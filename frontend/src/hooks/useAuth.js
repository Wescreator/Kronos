import { useEffect } from 'react'
import useAuthStore from '../store/authStore'
import { getMe } from '../services/auth.service'

export function useAuth() {
  const store = useAuthStore()

  useEffect(() => {
    if (store.isAuthenticated && !store.user) {
      getMe().then(({ data }) => store.setUser(data.user)).catch(() => store.logout())
    }
  }, [])

  return store
}