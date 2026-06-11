import {
  Bell,
  Menu,
  X,
  Search,
  LayoutDashboard,
  FolderKanban,
  DollarSign,
  CheckSquare,
  MessageSquare,
  Users,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import useAuthStore from '../../store/authStore'
import Avatar from '../ui/Avatar'
import {
  getNotifications,
  markAllRead,
} from '../../services/notifications.service'
import { formatDateTime } from '../../utils/format'

// ─── Links extraídos diretamente do Sidebar original ──────────────
const NAV_LINKS = [
  { to: '/app/dashboard', icon: LayoutDashboard, label: 'Dashboard'  },
  { to: '/app/agenda',    icon: Calendar,        label: 'Agenda' },
  { to: '/app/projects',  icon: FolderKanban,    label: 'Projetos'   },
  { to: '/app/financial', icon: DollarSign,       label: 'Financeiro' },
  { to: '/app/tasks',     icon: CheckSquare,      label: 'Tarefas'    },
  { to: '/app/chat',      icon: MessageSquare,    label: 'Chat'       },
  { to: '/app/team',      icon: Users,            label: 'Equipe'     },
]

export default function Topbar() {
  const { user, logout } = useAuthStore()

  // ─── Estados (idênticos ao original + showMobileMenu) ────────────
  const [notifs,         setNotifs]         = useState([])
  const [showNotifs,     setShowNotifs]     = useState(false)
  const [showUser,       setShowUser]       = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)

  // ─── Busca de notificações (lógica original preservada) ──────────
  useEffect(() => {
    getNotifications().then(({ data }) =>
      setNotifs(data.notifications || [])
    )
  }, [])

  const unread = notifs.filter((n) => !n.is_read).length

  // ─── Marcar todas como lidas (lógica original preservada) ────────
  const handleMarkAll = async () => {
    await markAllRead()
    setNotifs((n) => n.map((x) => ({ ...x, is_read: true })))
  }

  // ─── Fecha todos os dropdowns ────────────────────────────────────
  const closeAll = () => {
    setShowNotifs(false)
    setShowUser(false)
    setShowMobileMenu(false)
  }

  return (
    <header
      className="
        fixed top-0 left-0 right-0
        z-50 h-16
        border-b border-white/5
        bg-[#050816]/70
        backdrop-blur-xl
      "
    >
      <div className="flex h-full items-center gap-3 px-4 lg:px-6">

        {/* ── LOGO ─────────────────────────────────────────────────── */}
        <NavLink
          to="/app/dashboard"
          onClick={closeAll}
          className="
            flex shrink-0 items-center gap-2.5
            rounded-xl px-1 py-1
            transition-opacity duration-200
            hover:opacity-80
          "
        >
          <div
            className="
              flex h-8 w-8 items-center justify-center
              rounded-xl
              bg-violet-500/15
              text-sm font-bold text-violet-300
              shadow-[0_0_20px_rgba(124,92,252,0.20)]
            "
          >
            K
          </div>
          <span className="text-sm font-semibold tracking-wide text-white">
            KRONOS
          </span>
        </NavLink>

        {/* ── SEPARADOR ────────────────────────────────────────────── */}
        <div className="hidden lg:block h-5 w-px shrink-0 bg-white/10" />

        {/* ── NAVEGAÇÃO DESKTOP (lg+) ───────────────────────────────
            Ícone + label, indicador ativo com ring violet           */}
        <nav className="hidden lg:flex items-center gap-0.5">
          {NAV_LINKS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `
                flex items-center gap-2
                rounded-xl px-3 py-2
                text-sm font-medium
                transition-all duration-200
                ${isActive
                  ? 'bg-violet-500/10 text-white ring-1 ring-violet-500/25 shadow-[0_0_20px_rgba(124,92,252,0.08)]'
                  : 'text-white/55 hover:bg-white/[0.04] hover:text-white'
                }
              `}
            >
              <Icon size={16} className="shrink-0" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* ── NAVEGAÇÃO TABLET (md → lg) ────────────────────────────
            Apenas ícones com tooltip nativo (title)                 */}
        <nav className="hidden md:flex lg:hidden items-center gap-0.5">
          {NAV_LINKS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              title={label}
              className={({ isActive }) => `
                flex h-9 w-9 items-center justify-center
                rounded-xl
                transition-all duration-200
                ${isActive
                  ? 'bg-violet-500/10 text-violet-300 ring-1 ring-violet-500/25'
                  : 'text-white/50 hover:bg-white/[0.04] hover:text-white'
                }
              `}
            >
              <Icon size={18} />
            </NavLink>
          ))}
        </nav>

        {/* ── BUSCA (md+) ───────────────────────────────────────────
            HTML idêntico ao original, apenas reposicionado          */}
        <div className="hidden md:flex flex-1 justify-end">
          <div
            className="
              flex h-9 w-full max-w-xs items-center gap-3
              rounded-xl
              border border-white/5
              bg-white/[0.03]
              px-3
            "
          >
            <Search size={15} className="shrink-0 text-white/40" />
            <input
              placeholder="Buscar projetos, tarefas, membros..."
              className="
                flex-1 min-w-0
                bg-transparent
                text-sm text-white
                placeholder:text-white/35
                outline-none
              "
            />
            <span
              className="
                shrink-0
                rounded-md
                border border-white/10
                bg-white/[0.03]
                px-1.5 py-0.5
                text-xs text-white/40
              "
            >
              ⌘K
            </span>
          </div>
        </div>

        {/* ── DIREITA ──────────────────────────────────────────────── */}
        <div className="flex items-center gap-1.5 ml-auto md:ml-0 shrink-0">

          {/* NOTIFICAÇÕES — lógica 100% original preservada */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotifs(!showNotifs)
                setShowUser(false)
                setShowMobileMenu(false)
              }}
              className="
                relative flex h-9 w-9 items-center justify-center
                rounded-xl
                text-white/60
                transition-all duration-200
                hover:bg-white/[0.04] hover:text-white
              "
            >
              <Bell size={18} />
              {unread > 0 && (
                <span
                  className="
                    absolute top-1.5 right-1.5
                    h-2 w-2 rounded-full bg-rose-500
                  "
                />
              )}
            </button>

            {showNotifs && (
              <div
                className="
                  absolute right-0 top-12
                  w-[380px]
                  overflow-hidden rounded-3xl
                  border border-white/5
                  bg-[#0D152B]/95
                  backdrop-blur-xl
                  shadow-[0_20px_50px_rgba(0,0,0,0.45)]
                "
              >
                <div className="flex items-center justify-between border-b border-white/5 p-4">
                  <h3 className="font-semibold text-white">
                    Notificações
                  </h3>
                  <button
                    onClick={handleMarkAll}
                    className="text-xs text-violet-300 hover:text-violet-200"
                  >
                    Marcar todas
                  </button>
                </div>

                <div className="max-h-[420px] overflow-y-auto">
                  {notifs.length === 0 ? (
                    <div className="p-8 text-center text-sm text-white/40">
                      Nenhuma notificação
                    </div>
                  ) : (
                    notifs.slice(0, 15).map((n) => (
                      <div
                        key={n.id}
                        className={`
                          border-b border-white/5 p-4
                          transition-colors
                          hover:bg-white/[0.03]
                          ${!n.is_read ? 'bg-violet-500/[0.05]' : ''}
                        `}
                      >
                        <p className="text-sm font-medium text-white">
                          {n.title}
                        </p>
                        {n.body && (
                          <p className="mt-1 text-xs text-white/55">
                            {n.body}
                          </p>
                        )}
                        <p className="mt-2 text-xs text-white/35">
                          {formatDateTime(n.created_at)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* PERFIL — lógica 100% original preservada */}
          <div className="relative">
            <button
              onClick={() => {
                setShowUser(!showUser)
                setShowNotifs(false)
                setShowMobileMenu(false)
              }}
              className="
                flex items-center gap-2
                rounded-2xl px-2 py-1.5
                transition-all duration-200
                hover:bg-white/[0.04]
              "
            >
              <Avatar
                src={user?.avatar_url}
                name={user?.name || ''}
                size="sm"
              />
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium leading-tight text-white">
                  {user?.name}
                </p>
                <p className="text-xs leading-tight text-white/40">
                  {user?.email}
                </p>
              </div>
            </button>

            {showUser && (
              <div
                className="
                  absolute right-0 top-12
                  w-60
                  overflow-hidden rounded-3xl
                  border border-white/5
                  bg-[#0D152B]/95
                  backdrop-blur-xl
                  shadow-[0_20px_50px_rgba(0,0,0,0.45)]
                "
              >
                <div className="border-b border-white/5 p-4">
                  <p className="font-semibold text-white">
                    {user?.name}
                  </p>
                  <p className="text-xs text-white/45">
                    {user?.email}
                  </p>
                </div>
                <button
                  onClick={logout}
                  className="
                    w-full px-4 py-3
                    text-left text-sm text-rose-400
                    transition-colors
                    hover:bg-rose-500/10
                  "
                >
                  Sair da conta
                </button>
              </div>
            )}
          </div>

          {/* HAMBURGUER — apenas mobile (<md) */}
          <button
            onClick={() => {
              setShowMobileMenu(!showMobileMenu)
              setShowNotifs(false)
              setShowUser(false)
            }}
            className="
              flex md:hidden h-9 w-9 items-center justify-center
              rounded-xl
              text-white/60
              transition-all duration-200
              hover:bg-white/[0.04] hover:text-white
            "
          >
            {showMobileMenu ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* ── MENU MOBILE ──────────────────────────────────────────────
          Dropdown abaixo do header, visível apenas em <md           */}
      {showMobileMenu && (
        <div
          className="
            absolute left-0 right-0 top-16
            z-50
            border-b border-white/5
            bg-[#050816]/95
            backdrop-blur-xl
            md:hidden
          "
        >
          {/* Busca mobile */}
          <div className="border-b border-white/5 px-4 py-3">
            <div
              className="
                flex h-10 items-center gap-3
                rounded-xl
                border border-white/5
                bg-white/[0.03]
                px-3
              "
            >
              <Search size={15} className="shrink-0 text-white/40" />
              <input
                placeholder="Buscar projetos, tarefas, membros..."
                className="
                  flex-1 bg-transparent
                  text-sm text-white
                  placeholder:text-white/35
                  outline-none
                "
              />
            </div>
          </div>

          {/* Links de navegação mobile */}
          <nav className="px-3 py-3">
            {NAV_LINKS.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setShowMobileMenu(false)}
                className={({ isActive }) => `
                  mb-1 flex items-center gap-3
                  rounded-xl px-4 py-3
                  text-sm font-medium
                  transition-all duration-200
                  ${isActive
                    ? 'bg-violet-500/10 text-white ring-1 ring-violet-500/25'
                    : 'text-white/60 hover:bg-white/[0.04] hover:text-white'
                  }
                `}
              >
                <Icon size={18} className="shrink-0" />
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      )}
    </header>
  )
}