import { Outlet, useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import useAuthStore from '../../store/authStore'
import kronosLogo from '../../assets/kronos-logo.png'

/**
 * Layout mínimo do portal do cliente — sem sidebar de módulos (o cliente
 * só tem uma página: /portal/posts), diferente do AppLayout usado pelos
 * usuários internos.
 */
export default function ClientPortalLayout() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()

  const handleLogout = () => {
    logout()
    navigate('/portal/login', { replace: true })
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <header
        className="flex items-center justify-between px-6 py-3.5 sticky top-0 z-10"
        style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)' }}
      >
        <div className="flex items-center gap-2.5">
          <img src={kronosLogo} alt="Kronos" style={{ width: 28 }} />
          <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Portal do Cliente</span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm font-medium hidden sm:inline" style={{ color: 'var(--text-secondary)' }}>
            {user?.name}
          </span>
          <button
            onClick={handleLogout}
            className="btn-secondary btn-sm"
            title="Sair"
          >
            <LogOut size={13} /> Sair
          </button>
        </div>
      </header>

      <main className="p-4 sm:p-6">
        <Outlet />
      </main>
    </div>
  )
}