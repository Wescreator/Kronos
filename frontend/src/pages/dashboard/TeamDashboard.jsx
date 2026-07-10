import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  FolderKanban, CheckSquare, AlertCircle, Loader,
  Clock, ArrowRight, Zap,
} from 'lucide-react'
import StatCard     from '../../components/ui/StatCard'
import Spinner      from '../../components/ui/Spinner'
import Badge        from '../../components/ui/Badge'
import QuickActions from '../../components/dashboard/QuickActions'
import useAuthStore from '../../store/authStore'
import {
  formatDate, statusLabel, statusColors,
  priorityColors, priorityLabel, priorityDot,
} from '../../utils/format'
import { getProjects }                    from '../../services/projects.service'
import { getTasks, getTasksDashboard }    from '../../services/tasks.service'

/* Mesmos estilos de linha da DashboardPage (elevação sólida do tema claro) */
const glassRow = {
  background: 'var(--bg-surface-2)',
  border: '1px solid var(--border-subtle)',
  borderTop: '1px solid var(--border-subtle)',
}
const glassRowHoverEnter = (e) => {
  e.currentTarget.style.background  = 'var(--bg-hover)'
  e.currentTarget.style.borderColor = 'var(--border-medium)'
}
const glassRowHoverLeave = (e) => {
  e.currentTarget.style.background  = glassRow.background
  e.currentTarget.style.borderColor = 'var(--border-subtle)'
}

/**
 * Dashboard personalizado para perfis SEM acesso ao financeiro
 * (owner, manager, employee). Mostra a operação — projetos, tarefas da
 * equipe e as tarefas do próprio usuário — sem nenhum dado financeiro
 * (o backend também nega /api/financial/* a esses perfis; esta tela nem
 * tenta buscar).
 */
export default function TeamDashboard() {
  const { user } = useAuthStore()
  const userId = user?.user_id

  const [taskStats, setTaskStats] = useState({})
  const [projects,  setProjects]  = useState([])
  const [tasks,     setTasks]     = useState([])
  const [myTasks,   setMyTasks]   = useState([])
  const [loading,   setLoading]   = useState(true)

  const loadDashboard = useCallback(() => {
    return Promise.all([
      getTasksDashboard(),
      getProjects({ limit: 50 }),
      getTasks({ status: 'open', limit: 6 }),
      userId ? getTasks({ user_id: userId, limit: 6 }) : Promise.resolve(null),
    ]).then(([stats, proj, tsk, mine]) => {
      setTaskStats(stats.data.stats || stats.data || {})
      const active = (proj.data.data || []).filter(
        p => !['completed', 'cancelled'].includes(p.status)
      )
      setProjects(active)
      setTasks(tsk.data.data || [])
      setMyTasks(mine?.data?.data?.filter(t => !['completed', 'cancelled'].includes(t.status)) || [])
    }).finally(() => setLoading(false))
  }, [userId])

  useEffect(() => { loadDashboard() }, [loadDashboard])

  if (loading) return (
    <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>
  )

  const TaskRow = ({ t }) => (
    <Link key={t.id} to={`/app/tasks/${t.id}`}
      className="flex items-center gap-3 p-3 rounded-xl transition-all duration-150"
      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
      <div className={`h-2 w-2 rounded-full shrink-0 ${priorityDot[t.priority]}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
          {t.title}
        </p>
        {t.due_date && (
          <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
            <Clock size={10} /> {formatDate(t.due_date)}
          </p>
        )}
      </div>
      <Badge className={priorityColors[t.priority]}>{priorityLabel[t.priority]}</Badge>
    </Link>
  )

  return (
    <div className="space-y-7 fade-in">

      {/* ── Estilos da borda luminosa nos KPIs (mesma técnica da DashboardPage) ── */}
      <style>{`
        @keyframes kronosBorderSpin {
          from { transform: translate(-50%, -50%) rotate(0deg);   }
          to   { transform: translate(-50%, -50%) rotate(360deg); }
        }

        .kpi-glow-wrap {
          position: relative;
          border-radius: 20px;
          overflow: hidden;
          padding: 2.5px;
          transition: box-shadow 0.35s ease;
        }

        .kpi-glow-wrap::before {
          content: '';
          position: absolute;
          width: 100%;
          aspect-ratio: 1 / 1;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(0deg);
          opacity: 0;
          transition: opacity 0.4s ease;
          will-change: transform, opacity;
          z-index: 0;
          pointer-events: none;
        }

        /* Card filho cobre o centro do disco — fundo opaco obrigatório. */
        .kpi-glow-wrap > * {
          position: relative;
          z-index: 1;
          background: var(--bg-surface);
          border-radius: 17.5px;
        }

        .kpi-glow-wrap:hover::before {
          opacity: 1;
          animation: kronosBorderSpin 4s linear infinite;
        }

        .kpi-glow-wrap.glow-violet::before {
          background: conic-gradient(from 0deg, transparent 0%, var(--brand-slate) 14%, transparent 28%);
        }
        .kpi-glow-wrap.glow-violet:hover {
          box-shadow: 0 0 18px rgba(55,65,81,.25);
        }

        .kpi-glow-wrap.glow-sky::before {
          background: conic-gradient(from 0deg, transparent 0%, #0284C7 14%, transparent 28%);
        }
        .kpi-glow-wrap.glow-sky:hover {
          box-shadow: 0 0 18px rgba(2,132,199,.25);
        }

        .kpi-glow-wrap.glow-amber::before {
          background: conic-gradient(from 0deg, transparent 0%, #D97706 14%, transparent 28%);
        }
        .kpi-glow-wrap.glow-amber:hover {
          box-shadow: 0 0 18px rgba(217,119,6,.25);
        }

        .kpi-glow-wrap.glow-rose::before {
          background: conic-gradient(from 0deg, transparent 0%, #DC2626 14%, transparent 28%);
        }
        .kpi-glow-wrap.glow-rose:hover {
          box-shadow: 0 0 18px rgba(220,38,38,.25);
        }
      `}</style>

      {/* ── Header ────────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Zap size={16} style={{ color: 'var(--text-primary)' }} />
          <span className="text-[11px] font-bold uppercase tracking-[0.15em]" style={{ color: 'var(--text-primary)' }}>
            Visão Geral
          </span>
        </div>
        <h1 className="text-[32px] font-bold tracking-tight" style={{ letterSpacing: '-0.025em' }}>
          Olá, {user?.name?.split(' ')[0] || 'bem-vindo'}
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-primary)' }}>
          {new Date().toLocaleDateString('pt-BR', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
          })}
        </p>
      </div>

      {/* ── Navegações Rápidas (já filtra ações pelo role) ───────────── */}
      <QuickActions onActionSuccess={loadDashboard} />

      {/* ── KPIs operacionais (sem dados financeiros) — com borda luminosa ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="kpi-glow-wrap glow-violet">
          <StatCard title="Projetos Ativos"     value={projects.length}                icon={FolderKanban} color="purple" subtitle="Em andamento agora" />
        </div>
        <div className="kpi-glow-wrap glow-sky">
          <StatCard title="Tarefas Abertas"     value={Number(taskStats.open || 0)}    icon={CheckSquare}  color="blue"   subtitle={`${Number(taskStats.total || 0)} no total`} />
        </div>
        <div className="kpi-glow-wrap glow-amber">
          <StatCard title="Em Andamento"        value={Number(taskStats.in_progress || 0)} icon={Loader}   color="yellow" subtitle="Sendo executadas" />
        </div>
        <div className="kpi-glow-wrap glow-rose">
          <StatCard title="Tarefas Atrasadas"   value={Number(taskStats.overdue || 0)} icon={AlertCircle}  color="red"    subtitle="Prazo vencido" />
        </div>
      </div>

      {/* ── Projetos + Minhas tarefas ──────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

        {/* Projetos ativos */}
        <div className="xl:col-span-2 card p-6 flex flex-col">
          <div className="flex items-center justify-between mb-5 shrink-0">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-0.5"
                style={{ color: 'var(--text-muted)' }}>Ativos</p>
              <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                Projetos
              </h3>
            </div>
            <Link to="/app/projects"
              className="flex items-center gap-1.5 text-xs font-semibold"
              style={{ color: 'var(--text-primary)' }}>
              Ver todos <ArrowRight size={13} />
            </Link>
          </div>

          <div className="overflow-y-auto space-y-2.5 pr-1" style={{ maxHeight: 320 }}>
            {projects.length === 0 && (
              <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>
                Nenhum projeto ativo
              </p>
            )}
            {projects.map(p => (
              <Link
                key={p.id}
                to={`/app/projects/${p.id}`}
                className="group flex items-center justify-between rounded-2xl p-4 transition-all duration-200"
                style={glassRow}
                onMouseEnter={glassRowHoverEnter}
                onMouseLeave={glassRowHoverLeave}
              >
                <div className="flex-1 min-w-0 mr-4">
                  <p className="text-sm font-semibold truncate mb-1"
                    style={{ color: 'var(--text-primary)' }}>
                    {p.title}
                  </p>
                  <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                    {p.client || 'Sem cliente'}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {formatDate(p.expected_date)}
                  </span>
                  <Badge className={statusColors[p.status]}>
                    {statusLabel[p.status]}
                  </Badge>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Minhas tarefas */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-0.5"
                style={{ color: 'var(--text-muted)' }}>Atribuídas a você</p>
              <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                Minhas Tarefas
              </h3>
            </div>
            <Link to="/app/tasks" className="flex items-center gap-1.5 text-xs font-semibold"
              style={{ color: 'var(--text-primary)' }}>
              Ver todas <ArrowRight size={13} />
            </Link>
          </div>
          <div className="space-y-1.5">
            {myTasks.length === 0 && (
              <p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>
                Nenhuma tarefa atribuída a você
              </p>
            )}
            {myTasks.map(t => <TaskRow key={t.id} t={t} />)}
          </div>
        </div>
      </div>

      {/* ── Tarefas abertas da equipe ──────────────────────────────────── */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-0.5"
              style={{ color: 'var(--text-muted)' }}>Pendentes</p>
            <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
              Tarefas Abertas da Equipe
            </h3>
          </div>
          <Link to="/app/tasks" className="flex items-center gap-1.5 text-xs font-semibold"
            style={{ color: 'var(--text-primary)' }}>
            Ver todas <ArrowRight size={13} />
          </Link>
        </div>
        <div className="space-y-1.5">
          {tasks.length === 0 && (
            <p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>
              Nenhuma tarefa aberta
            </p>
          )}
          {tasks.map(t => <TaskRow key={t.id} t={t} />)}
        </div>
      </div>
    </div>
  )
}
