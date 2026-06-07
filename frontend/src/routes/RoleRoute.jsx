import { Navigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'
import { can } from '../utils/permissions'

export default function RoleRoute({
  module,
  action = 'view',
  roles = [],
  children,
}) {
  const { user, isAuthenticated } = useAuthStore()

  // Segurança extra
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  const role = user?.role

  let allowed = false

  // Caso seja utilizado por roles explícitas
  if (roles.length > 0) {
    allowed = roles.includes(role)
  }

  // Caso utilize o sistema centralizado de permissões
  else if (module) {
    allowed = can(role, module, action)
  }

  if (!allowed) {
    return <Navigate to="/app/projects" replace />
  }

  return children
}