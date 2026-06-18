import { Navigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'

/**
 * ScopeRoute
 *
 * Protege rotas por escopo de usuário.
 *
 * scope="global"  → apenas developer / support
 * scope="company" → qualquer usuário autenticado com empresa
 *
 * Uso:
 *   <Route path="/admin" element={<ScopeRoute scope="global"><AdminLayout /></ScopeRoute>} />
 */
export default function ScopeRoute({ children, scope }) {
  const { user, isAuthenticated } = useAuthStore()

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />
  }

  if (scope === 'global' && user.scope !== 'global') {
    // Usuário de empresa tentando acessar painel global
    return <Navigate to="/app/dashboard" replace />
  }

  if (scope === 'company' && user.scope === 'global' && !user._impersonating) {
    // Developer sem impersonação ativa tentando acessar área de empresa
    return <Navigate to="/admin" replace />
  }

  return children
}