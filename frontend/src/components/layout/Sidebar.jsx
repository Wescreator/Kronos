import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  FolderKanban,
  DollarSign,
  CheckSquare,
  MessageSquare,
  Users,
  calendar
} from 'lucide-react'

import useUIStore from '../../store/uiStore'

const links = [
  { to: '/app/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/app/projects', icon: FolderKanban, label: 'Projetos' },
  { to: '/app/financial', icon: DollarSign, label: 'Financeiro' },
  { to: '/app/tasks', icon: CheckSquare, label: 'Tarefas' },
  { to: '/app/chat', icon: MessageSquare, label: 'Chat' },
  { to: '/app/team', icon: Users, label: 'Equipe' },
]

export default function Sidebar() {
  const { sidebarOpen } = useUIStore()

  return (
    <>
      {/* Overlay Mobile */}
      <div
        className={`
          fixed inset-0 z-30 bg-black/50 backdrop-blur-sm
          transition-opacity duration-300 lg:hidden
          ${sidebarOpen
            ? 'opacity-100'
            : 'opacity-0 pointer-events-none'
          }
        `}
      />

      <aside
        className={`
          fixed
          top-16
          left-0
          bottom-0
          z-40
          border-r
          border-white/5
          bg-[#081024]
          transition-all
          duration-300
          ease-out

          ${sidebarOpen
            ? 'w-[280px]'
            : 'w-0 lg:w-[80px] overflow-hidden'
          }
        `}
      >
        <div className="flex h-full flex-col">
          {/* Branding */}
          <div className="px-5 py-6 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div
                className="
                  flex h-11 w-11 items-center justify-center
                  rounded-2xl
                  bg-violet-500/15
                  text-violet-300
                  shadow-[0_0_30px_rgba(124,92,252,0.20)]
                "
              >
                K
              </div>

              {sidebarOpen && (
                <div>
                  <h2 className="text-sm font-semibold text-white">
                    KRONOS
                  </h2>

                  <p className="text-xs text-white/50">
                    Workspace Principal
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Navegação */}
          <nav className="flex-1 px-3 py-5">
            <div className="flex flex-col gap-2">
              {links.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `
                    group
                    flex
                    items-center
                    gap-3
                    rounded-2xl
                    px-4
                    py-3
                    text-sm
                    font-medium
                    transition-all
                    duration-200
                    ease-out

                    ${
                      isActive
                        ? `
                          bg-violet-500/10
                          text-white
                          border-l-[3px]
                          border-violet-500
                          shadow-[0_0_30px_rgba(124,92,252,0.08)]
                        `
                        : `
                          text-white/70
                          hover:bg-white/[0.03]
                          hover:text-white
                          hover:translate-x-1
                        `
                    }
                    `
                  }
                >
                  <Icon
                    size={20}
                    className="shrink-0"
                  />

                  <span
                    className={`
                      whitespace-nowrap
                      transition-all
                      duration-200

                      ${
                        sidebarOpen
                          ? 'opacity-100'
                          : 'lg:opacity-0 lg:w-0 overflow-hidden'
                      }
                    `}
                  >
                    {label}
                  </span>
                </NavLink>
              ))}
            </div>
          </nav>

          {/* Rodapé */}
          <div className="border-t border-white/5 p-4">
            <div
              className="
                rounded-2xl
                border
                border-white/5
                bg-white/[0.02]
                p-3
              "
            >
              <p className="text-xs text-white/40">
                KRONOS SaaS
              </p>

              <p className="mt-1 text-sm font-medium text-white">
                Enterprise Edition
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}