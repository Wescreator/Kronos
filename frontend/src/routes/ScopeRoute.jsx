import { Navigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'

/**
 * ScopeRoute
 *
 * Protege rotas por escopo de usuário.
 *
 * scope="global"  → apenas developer / support
 * scope="company" → usuário interno com empresa
 * scope="client"  → cliente do portal (acesso restrito ao feed de
 *                    postagens do(s) projeto(s) vinculado(s))
 *
 * Uso:
 *   <Route path="/admin" element={<ScopeRoute scope="global"><AdminLayout /></ScopeRoute>} />
 *   <Route path="/portal" element={<ScopeRoute scope="client"><ClientPortalLayout /></ScopeRoute>} />
 */
export default function ScopeRoute({ children, scope }) {
  const { user, isAuthenticated } = useAuthStore()

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />
  }

  // Para onde mandar quem não pertence a este escopo, de acordo com o
  // escopo real do usuário logado — evita loops de redirect entre as
  // três árvores de rota (/admin, /app, /portal).
  const homeForScope = () => {
    if (user.scope === 'global') return '/admin'
    if (user.scope === 'client') return '/portal/posts'
    return '/app/dashboard'
  }

  if (scope === 'global' && user.scope !== 'global') {
    return <Navigate to={homeForScope()} replace />
  }

  if (scope === 'company') {
    // Developer sem impersonação ativa tentando acessar área de empresa
    if (user.scope === 'global' && !user._impersonating) {
      return <Navigate to="/admin" replace />
    }
    // Cliente do portal nunca acessa a área interna da empresa
    if (user.scope === 'client') {
      return <Navigate to="/portal/posts" replace />
    }
  }

  if (scope === 'client' && user.scope !== 'client') {
    return <Navigate to={homeForScope()} replace />
  }

  return children
}