import { Bell, Menu, Search, ChevronDown } from 'lucide-react'
import { useState, useEffect } from 'react'
import useAuthStore from '../../store/authStore'
import useUIStore from '../../store/uiStore'
import Avatar from '../ui/Avatar'
import {
  getNotifications,
  markAllRead,
} from '../../services/notifications.service'
import { formatDateTime } from '../../utils/format'

export default function Topbar() {
  const { user, logout } = useAuthStore()
  const { toggleSidebar } = useUIStore()

  const [notifs, setNotifs] = useState([])
  const [showNotifs, setShowNotifs] = useState(false)
  const [showUser, setShowUser] = useState(false)

  useEffect(() => {
    getNotifications().then(({ data }) =>
      setNotifs(data.notifications || [])
    )
  }, [])

  const unread = notifs.filter((n) => !n.is_read).length

  const handleMarkAll = async () => {
    await markAllRead()

    setNotifs((n) =>
      n.map((x) => ({
        ...x,
        is_read: true,
      }))
    )
  }

  return (
    <header
      className="
        fixed
        top-0
        left-0
        right-0
        z-50
        h-16
        border-b
        border-white/5
        bg-[#050816]/70
        backdrop-blur-xl
      "
    >
      <div className="flex h-full items-center justify-between px-4 lg:px-6">
        {/* ESQUERDA */}
        <div className="flex items-center gap-4">
          <button
            onClick={toggleSidebar}
            className="
              flex h-10 w-10 items-center justify-center
              rounded-xl
              text-white/70
              transition-all
              duration-200
              hover:bg-white/[0.03]
              hover:text-white
            "
          >
            <Menu size={20} />
          </button>

          {/* Workspace */}
          <div className="hidden lg:flex items-center gap-2">
            <div
              className="
                flex h-10 w-10 items-center justify-center
                rounded-xl
                bg-violet-500/15
                text-violet-300
              "
            >
              K
            </div>

            <div>
              <p className="text-xs text-white/40">
                Workspace
              </p>

              <div className="flex items-center gap-1">
                <span className="text-sm font-semibold text-white">
                  KRONOS
                </span>

                <ChevronDown
                  size={14}
                  className="text-white/40"
                />
              </div>
            </div>
          </div>
        </div>

        {/* CENTRO */}
        <div className="hidden md:flex flex-1 justify-center px-8">
          <div
            className="
              flex
              h-[52px]
              w-full
              max-w-xl
              items-center
              gap-3
              rounded-2xl
              border
              border-white/5
              bg-white/[0.03]
              px-4
            "
          >
            <Search
              size={18}
              className="text-white/40"
            />

            <input
              placeholder="Buscar projetos, tarefas, membros..."
              className="
                flex-1
                bg-transparent
                text-sm
                text-white
                placeholder:text-white/35
                outline-none
              "
            />

            <span
              className="
                rounded-lg
                border
                border-white/10
                bg-white/[0.03]
                px-2
                py-1
                text-xs
                text-white/40
              "
            >
              ⌘K
            </span>
          </div>
        </div>

        {/* DIREITA */}
        <div className="flex items-center gap-3">
          {/* Notificações */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotifs(!showNotifs)
                setShowUser(false)
              }}
              className="
                relative
                flex
                h-10
                w-10
                items-center
                justify-center
                rounded-xl
                text-white/70
                transition-all
                duration-200
                hover:bg-white/[0.03]
                hover:text-white
              "
            >
              <Bell size={20} />

              {unread > 0 && (
                <span
                  className="
                    absolute
                    top-2
                    right-2
                    h-2
                    w-2
                    rounded-full
                    bg-rose-500
                  "
                />
              )}
            </button>

            {showNotifs && (
              <div
                className="
                  absolute
                  right-0
                  top-14
                  w-[380px]
                  overflow-hidden
                  rounded-3xl
                  border
                  border-white/5
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
                    className="
                      text-xs
                      text-violet-300
                      hover:text-violet-200
                    "
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
                          border-b
                          border-white/5
                          p-4
                          transition-colors

                          ${
                            !n.is_read
                              ? 'bg-violet-500/[0.05]'
                              : ''
                          }

                          hover:bg-white/[0.03]
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

          {/* Usuário */}
          <div className="relative">
            <button
              onClick={() => {
                setShowUser(!showUser)
                setShowNotifs(false)
              }}
              className="
                flex
                items-center
                gap-3
                rounded-2xl
                px-2
                py-1.5
                transition-all
                duration-200
                hover:bg-white/[0.03]
              "
            >
              <Avatar
                src={user?.avatar_url}
                name={user?.name || ''}
                size="sm"
              />

              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-white">
                  {user?.name}
                </p>

                <p className="text-xs text-white/40">
                  {user?.email}
                </p>
              </div>
            </button>

            {showUser && (
              <div
                className="
                  absolute
                  right-0
                  top-14
                  w-60
                  overflow-hidden
                  rounded-3xl
                  border
                  border-white/5
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
                    w-full
                    px-4
                    py-3
                    text-left
                    text-sm
                    text-rose-400
                    transition-colors
                    hover:bg-rose-500/10
                  "
                >
                  Sair da conta
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}