import { Navigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'
import { canSeeModule } from '../utils/permissions'

/**
 * PermissionRoute
 *
 * Bloqueia acesso direto por URL a módulos que o role do usuário não
 * enxerga (mesma regra de VISIBLE_MODULES em utils/permissions.js —
 * fica sempre em sincronia com o que o topbar mostra, pois os dois
 * consultam a mesma fonte: canSeeModule()).
 *
 * Isso existe porque esconder o link no topbar, sozinho, não impede
 * alguém de digitar a URL direto na barra de endereço.
 *
 * Uso:
 *   <Route path="dashboard" element={<PermissionRoute module="dashboard"><DashboardPage /></PermissionRoute>} />
 */
export default function PermissionRoute({ children, module }) {
  const { user } = useAuthStore()

  // 'projects' é visível a todos os roles de empresa (ALL_ROLES em
  // VISIBLE_MODULES) — fallback seguro que nunca gera loop de redirect,
  // diferente de mandar de volta pro próprio módulo restrito.
  if (!canSeeModule(user?.role, module)) {
    return <Navigate to="/app/projects" replace />
  }

  return children
}