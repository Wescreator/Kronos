import {Bell, Menu, X, LayoutDashboard, FolderKanban, DollarSign, CheckSquare, MessageSquare, Users, Calendar, FileText, Trash2, Newspaper, Calculator, BarChart3} from 'lucide-react'
import { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import useAuthStore from '../../store/authStore'
import useSocketStore from '../../store/socketStore'
import Avatar from '../ui/Avatar'
import ThemeToggle from '../ui/ThemeToggle'
import TimerWidget from '../timer/TimerWidget'
import {getNotifications, markRead, markAllRead, deleteNotification,} from '../../services/notifications.service'
import { formatDateTime } from '../../utils/format'
import { canSeeModule } from '../../utils/permissions'



// ─── Links extraídos diretamente do Sidebar original ──────────────
// Cada link agora carrega seu "module" (chave de VISIBLE_MODULES em
// utils/permissions.js) — usado para filtrar o que aparece conforme o
// role do usuário logado, mantendo topbar e rota (PermissionRoute)
// sempre em sincronia, já que os dois consultam a mesma fonte.
const NAV_LINKS = [
  { to: '/app/dashboard', icon: LayoutDashboard,    label: 'Dashboard',  module: 'dashboard' },
  { to: '/app/agenda',    icon: Calendar,           label: 'Agenda',     module: 'agenda'    },
  { to: '/app/chat',      icon: MessageSquare,      label: 'Chat',       module: 'chat'      },
  { to: '/app/clients',   icon: Users,              label: 'Clientes',   module: 'clients'   }, // ── NOVO MÓDULO ADICIONADO AQUI ──
  { to: '/app/team',      icon: Users,              label: 'Equipe',     module: 'team'      },
  { to: '/app/financial', icon: DollarSign,         label: 'Financeiro', module: 'financial' },
  { to: '/app/budgets',   icon: Calculator,         label: 'Orçamentos', module: 'budgets'   },
  { to: '/app/posts',     icon: Newspaper,          label: 'Posts',      module: 'posts'     },
  { to: '/app/projects',  icon: FolderKanban,       label: 'Projetos',   module: 'projects'  },
  { to: '/app/proposals', icon: FileText,           label: 'Propostas',  module: 'proposals' },
  { to: '/app/tasks',     icon: CheckSquare,        label: 'Tarefas',    module: 'tasks'     },
  { to: '/app/reports',   icon: BarChart3,          label: 'Relatórios', module: 'reports'   }
]

export default function Topbar() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  // Filtra uma única vez por render — reutilizado nos três blocos de
  // navegação abaixo (desktop, tablet e mobile), assim os três ficam
  // sempre idênticos sem repetir a lógica de permissão em cada um.
  const visibleLinks = NAV_LINKS.filter(({ module }) => canSeeModule(user?.role, module))

  // ─── Estados (idênticos ao original + showMobileMenu) ────────────
  const [notifs,          setNotifs]         = useState([])
  const [showNotifs,      setShowNotifs]     = useState(false)
  const [showUser,        setShowUser]       = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)

  // ─── Busca de notificações (lógica original preservada) ──────────
  useEffect(() => {
    getNotifications().then(({ data }) =>
      setNotifs(data.notifications || [])
    )
  }, [])

  // ─── Tempo real: assina o WebSocket compartilhado (mesma conexão
  // usada pelo Chat) e insere notificações novas assim que chegam ──
  useEffect(() => {
    useSocketStore.getState().ensureConnected()

    const unsubscribe = useSocketStore.getState().subscribe((msg) => {
      if (msg.type === 'new_notification' && msg.notification) {
        setNotifs((prev) => {
          if (prev.some((n) => n.id === msg.notification.id)) return prev
          return [msg.notification, ...prev]
        })
      }
    })

    return unsubscribe
  }, [])

  const unread = notifs.filter((n) => !n.is_read).length

  // ─── Marcar todas como lidas (lógica original preservada) ────────
  const handleMarkAll = async () => {
    await markAllRead()
    setNotifs((n) => n.map((x) => ({ ...x, is_read: true })))
  }

  // ─── Clique em uma notificação: marca como lida e navega para o link ──
  const handleNotifClick = async (n) => {
    if (!n.is_read) {
      setNotifs((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)))
      try {
        await markRead(n.id)
      } catch {
        // Falha silenciosa aqui não é crítica: pior caso, aparece como
        // não lida de novo na próxima busca.
      }
    }
    setShowNotifs(false)
    if (n.link) navigate(n.link)
  }

  // ─── Excluir uma notificação (botão de lixeira) ──────────────────
  const handleDeleteNotif = async (e, id) => {
    e.stopPropagation() // não deixa disparar a navegação do item
    setNotifs((prev) => prev.filter((n) => n.id !== id))
    try {
      await deleteNotification(id)
    } catch {
      // Falha silenciosa: pior caso, reaparece na próxima busca
    }
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
        border-b border-line
        bg-surface
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
              bg-hover
              text-sm font-bold text-primary
              border border-line-strong
            "
          >
            K
          </div>
          <span className="text-sm font-semibold tracking-wide text-primary">
            KRONOS
          </span>
        </NavLink>

        {/* ── SEPARADOR ────────────────────────────────────────────── */}
        <div className="hidden lg:block h-5 w-px shrink-0 bg-line-strong" />

        {/* ── NAVEGAÇÃO DESKTOP (lg+) ───────────────────────────────*/}
        <nav className="hidden lg:flex items-center gap-0.5">
          {visibleLinks.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `
                flex items-center gap-2
                rounded-xl px-3 py-2
                text-sm font-medium
                transition-all duration-200
                ${isActive
                  ? 'bg-hover text-primary ring-1 ring-line-strong'
                  : 'text-secondary hover:bg-hover hover:text-primary'
                }
              `}
            >
              <Icon size={16} className="shrink-0" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* ── NAVEGAÇÃO TABLET (md → lg) ────────────────────────────*/}
        <nav className="hidden md:flex lg:hidden items-center gap-0.5">
          {visibleLinks.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              title={label}
              className={({ isActive }) => `
                flex h-9 w-9 items-center justify-center
                rounded-xl
                transition-all duration-200
                ${isActive
                  ? 'bg-hover text-primary ring-1 ring-line-strong'
                  : 'text-secondary hover:bg-hover hover:text-primary'
                }
              `}
            >
              <Icon size={18} />
            </NavLink>
          ))}
        </nav>

        {/* ── DIREITA ──────────────────────────────────────────────── */}
        <div className="flex items-center gap-1.5 ml-auto shrink-0">

          {/* CRONÔMETRO (apontamento de horas) */}
          <TimerWidget />

          {/* TEMA (claro / escuro) */}
          <ThemeToggle />

          {/* NOTIFICAÇÕES */}
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
                text-secondary
                transition-all duration-200
                hover:bg-hover hover:text-primary
              "
            >
              <Bell size={18} />
              {unread > 0 && (
                <span
                  className="
                    absolute top-1.5 right-1.5
                    h-2 w-2 rounded-full bg-danger
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
                  border border-line
                  bg-surface
                  backdrop-blur-xl
                  shadow-[0_20px_50px_rgba(15,23,42,0.12)]
                "
              >
                <div className="flex items-center justify-between border-b border-line p-4">
                  <h3 className="font-semibold text-primary">
                    Notificações
                  </h3>
                  <button
                    onClick={handleMarkAll}
                    className="text-xs text-secondary hover:text-primary"
                  >
                    Marcar todas
                  </button>
                </div>

                <div className="max-h-[420px] overflow-y-auto">
                  {notifs.length === 0 ? (
                    <div className="p-8 text-center text-sm text-muted">
                      Nenhuma notificação
                    </div>
                  ) : (
                    <>
                      {notifs.filter((n) => !n.is_read).length > 0 && (
                        <div className="px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
                          Não lidas
                        </div>
                      )}
                      {notifs
                        .filter((n) => !n.is_read)
                        .map((n) => (
                          <div key={n.id} className="group relative border-b border-line bg-surface-2">
                            <button
                              onClick={() => handleNotifClick(n)}
                              className={`
                                block w-full p-4 pr-9
                                text-left
                                transition-colors
                                hover:bg-hover
                                ${n.link ? 'cursor-pointer' : 'cursor-default'}
                              `}
                            >
                              <p className="text-sm font-medium text-primary">
                                {n.title}
                              </p>
                              {n.body && (
                                <p className="mt-1 text-xs text-secondary">
                                  {n.body}
                                </p>
                              )}
                              <p className="mt-2 text-xs text-muted">
                                {formatDateTime(n.created_at)}
                              </p>
                            </button>
                            <button
                              onClick={(e) => handleDeleteNotif(e, n.id)}
                              title="Excluir notificação"
                              className="
                                absolute right-2 top-3
                                rounded-lg p-1.5
                                text-muted opacity-0
                                transition-all duration-150
                                hover:bg-hover hover:text-secondary
                                group-hover:opacity-100
                              "
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}

                      {notifs.filter((n) => n.is_read).length > 0 && (
                        <div className="px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
                          Lidas
                        </div>
                      )}
                      {notifs
                        .filter((n) => n.is_read)
                        .slice(0, 15)
                        .map((n) => (
                          <div key={n.id} className="group relative border-b border-line">
                            <button
                              onClick={() => handleNotifClick(n)}
                              className={`
                                block w-full p-4 pr-9
                                text-left
                                transition-colors
                                hover:bg-surface-2
                                ${n.link ? 'cursor-pointer' : 'cursor-default'}
                              `}
                            >
                              <p className="text-sm font-medium text-primary">
                                {n.title}
                              </p>
                              {n.body && (
                                <p className="mt-1 text-xs text-secondary">
                                  {n.body}
                                </p>
                              )}
                              <p className="mt-2 text-xs text-muted">
                                {formatDateTime(n.created_at)}
                              </p>
                            </button>
                            <button
                              onClick={(e) => handleDeleteNotif(e, n.id)}
                              title="Excluir notificação"
                              className="
                                absolute right-2 top-3
                                rounded-lg p-1.5
                                text-muted opacity-0
                                transition-all duration-150
                                hover:bg-hover hover:text-secondary
                                group-hover:opacity-100
                              "
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                    </>
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
                hover:bg-hover
              "
            >
              <Avatar
                src={user?.avatar_url}
                name={user?.name || ''}
                size="sm"
              />
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium leading-tight text-primary">
                  {user?.name}
                </p>
                <p className="text-xs leading-tight text-muted">
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
                  border border-line
                  bg-surface
                  backdrop-blur-xl
                  shadow-[0_20px_50px_rgba(15,23,42,0.12)]
                "
              >
                <div className="border-b border-line p-4">
                  <p className="font-semibold text-primary">
                    {user?.name}
                  </p>
                  <p className="text-xs text-muted">
                    {user?.email}
                  </p>
                </div>
                <button
                  onClick={logout}
                  className="
                    w-full px-4 py-3
                    text-left text-sm text-danger
                    transition-colors
                    hover:bg-hover
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
              text-secondary
              transition-all duration-200
              hover:bg-hover hover:text-primary
            "
          >
            {showMobileMenu ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* ── MENU MOBILE ──────────────────────────────────────────────*/}
      {showMobileMenu && (
        <div
          className="
            absolute left-0 right-0 top-16
            z-50
            border-b border-line
            bg-surface
            backdrop-blur-xl
            md:hidden
          "
        >
          {/* Links de navegação mobile */}
          <nav className="px-3 py-3">
            {visibleLinks.map(({ to, icon: Icon, label }) => (
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
                    ? 'bg-hover text-primary ring-1 ring-line'
                    : 'text-secondary hover:bg-hover hover:text-primary'
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