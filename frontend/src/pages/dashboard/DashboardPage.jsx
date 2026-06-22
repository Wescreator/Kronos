import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  DollarSign, FolderKanban, AlertCircle,
  TrendingUp, CheckSquare, Clock, ArrowRight, Zap
} from 'lucide-react'
import StatCard      from '../../components/ui/StatCard'
import Spinner       from '../../components/ui/Spinner'
import Badge         from '../../components/ui/Badge'
import QuickActions  from '../../components/dashboard/QuickActions'
import {
  formatCurrency, formatDate, formatCompact,
  statusLabel, statusColors,
  priorityColors, priorityLabel, priorityDot, monthNames
} from '../../utils/format'
import { getFinancialDashboard } from '../../services/financial.service'
import { getProjects }           from '../../services/projects.service'
import { getTasks }              from '../../services/tasks.service'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#FFFFFF', border: '1px solid #E5E7EB',
      borderRadius: 12, padding: '10px 14px',
      boxShadow: '0 20px 40px rgba(20,24,28,0.18)', fontSize: 12,
    }}>
      <p style={{ color: '#9CA3AF', marginBottom: 6, fontWeight: 600 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color, fontWeight: 600, marginBottom: 2 }}>
          {p.name}: {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  )
}

/* ── Estilos de glassmorphism inline reutilizáveis ──
   Substituídos pelo equivalente "elevação sólida" do tema claro:
   fundo quase branco com leve diferenciação + borda cinza visível,
   no lugar de transparências pensadas para fundo escuro. */
const glassRow = {
  background: '#FAFAFA',
  border: '1px solid #E5E7EB',
  borderTop: '1px solid #E5E7EB',
}

const glassRowHoverEnter = (e) => {
  e.currentTarget.style.background  = '#F3F4F6'
  e.currentTarget.style.borderColor = '#D1D5DB'
}
const glassRowHoverLeave = (e) => {
  e.currentTarget.style.background  = glassRow.background
  e.currentTarget.style.borderColor = '#E5E7EB'
}

export default function DashboardPage() {
  const [financial, setFinancial] = useState(null)
  const [projects,  setProjects]  = useState([])
  const [tasks,     setTasks]     = useState([])
  const [loading,   setLoading]   = useState(true)

  const loadDashboard = useCallback(() => {
    return Promise.all([
      getFinancialDashboard(),
      getProjects({ limit: 50 }),
      getTasks({ status: 'open', limit: 6 })
    ]).then(([fin, proj, tsk]) => {
      setFinancial(fin.data)
      const active = (proj.data.data || []).filter(
        p => !['completed', 'cancelled'].includes(p.status)
      )
      setProjects(active)
      setTasks(tsk.data.data || [])
    }).finally(() => setLoading(false))
  }, [])

  useEffect(() => { loadDashboard() }, [loadDashboard])

  if (loading) return (
    <div className="flex items-center justify-center h-64"><Spinner size="lg" /></div>
  )

  const stats    = financial?.stats || {}
  const cashflow = (financial?.cashflow || []).map(row => ({
    name:     monthNames[row.month - 1],
    Receitas: parseFloat(row.revenues),
    Despesas: parseFloat(row.expenses),
    Lucro:    parseFloat(row.profit)
  }))

  const netRevenue = parseFloat(stats.revenue_month  || 0)
  const netExpense = parseFloat(stats.expenses_month || 0)
  const netProfit  = netRevenue - netExpense

  return (
    <div className="space-y-7 fade-in">

      {/* ── Estilos da borda luminosa nos KPIs (mesma técnica da FinancialPage) ── */}
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

        /* Card filho cobre o centro do disco — fundo opaco obrigatório
           para a borda não vazar por cima do conteúdo nos cantos. */
        .kpi-glow-wrap > * {
          position: relative;
          z-index: 1;
          background: #FFFFFF;
          border-radius: 17.5px;
        }

        .kpi-glow-wrap:hover::before {
          opacity: 1;
          animation: kronosBorderSpin 4s linear infinite;
        }

        .kpi-glow-wrap.glow-emerald::before {
          background: conic-gradient(from 0deg, transparent 0%, #16A34A 14%, transparent 28%);
        }
        .kpi-glow-wrap.glow-emerald:hover {
          box-shadow: 0 0 18px rgba(22,163,74,.25);
        }

        .kpi-glow-wrap.glow-violet::before {
          background: conic-gradient(from 0deg, transparent 0%, #374151 14%, transparent 28%);
        }
        .kpi-glow-wrap.glow-violet:hover {
          box-shadow: 0 0 18px rgba(55,65,81,.25);
        }

        .kpi-glow-wrap.glow-amber::before {
          background: conic-gradient(from 0deg, transparent 0%, #D97706 14%, transparent 28%);
        }
        .kpi-glow-wrap.glow-amber:hover {
          box-shadow: 0 0 18px rgba(217,119,6,.25);
        }

        .kpi-glow-wrap.glow-sky::before {
          background: conic-gradient(from 0deg, transparent 0%, #0284C7 14%, transparent 28%);
        }
        .kpi-glow-wrap.glow-sky:hover {
          box-shadow: 0 0 18px rgba(2,132,199,.25);
        }
      `}</style>

      {/* ── Header ────────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Zap size={16} style={{ color: '#374151' }} />
          <span className="text-[11px] font-bold uppercase tracking-[0.15em]" style={{ color: '#374151' }}>
            Visão Executiva
          </span>
        </div>
        <h1 className="text-[32px] font-bold tracking-tight" style={{ letterSpacing: '-0.025em' }}>
          Dashboard
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
          {new Date().toLocaleDateString('pt-BR', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
          })}
        </p>
      </div>

      {/* ── Navegações Rápidas ───────────────────────────────────────── */}
      <QuickActions onActionSuccess={loadDashboard} />

      {/* ── KPIs — com borda luminosa ─────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="kpi-glow-wrap glow-emerald">
          <StatCard title="Receita do Mês"     value={formatCompact(netRevenue)}            icon={DollarSign}  color="green"  subtitle="Recebimentos confirmados" />
        </div>
        <div className="kpi-glow-wrap glow-violet">
          <StatCard title="Projetos Ativos"    value={projects.length}                      icon={FolderKanban}color="purple" subtitle="Em andamento agora" />
        </div>
        <div className="kpi-glow-wrap glow-amber">
          <StatCard title="Despesas a Vencer"  value={formatCompact(stats.expenses_pending)} icon={AlertCircle} color="yellow" subtitle={`${formatCompact(stats.expenses_overdue)} em atraso`} />
        </div>
        <div className="kpi-glow-wrap glow-sky">
          <StatCard title="Receitas a Receber" value={formatCompact(stats.revenue_pending)}  icon={TrendingUp}  color="blue"   subtitle={`${formatCompact(stats.revenue_overdue)} em atraso`} />
        </div>
      </div>

      {/* ── Projetos + Resumo ──────────────────────────────────────────── */}
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
              style={{ color: '#374151' }}>
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

        {/* Resumo financeiro */}
        <div className="card p-6">
          <div className="mb-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-0.5"
              style={{ color: 'var(--text-muted)' }}>Este Mês</p>
            <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
              Resumo Financeiro
            </h3>
          </div>
          <div className="space-y-1">
            {[
              { label: 'Receita',       value: netRevenue,             color: '#16A34A' },
              { label: 'Despesas',      value: netExpense,             color: '#DC2626' },
              { label: 'Lucro líquido', value: netProfit,              color: netProfit >= 0 ? '#16A34A' : '#DC2626', bold: true },
              { label: 'A pagar',       value: stats.expenses_pending, color: '#D97706' },
              { label: 'A receber',     value: stats.revenue_pending,  color: '#0284C7' },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between py-3"
                style={{ borderBottom: i < 4 ? '1px solid #E5E7EB' : 'none' }}>
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{item.label}</span>
                <span className="text-sm" style={{ color: item.color, fontWeight: item.bold ? 700 : 600 }}>
                  {formatCurrency(item.value)}
                </span>
              </div>
            ))}
          </div>
          <Link to="/app/financial"
            className="mt-5 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200"
            style={{
              background: '#374151',
              border: '1px solid #1f2937',
              color: '#ffffff',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#1f2937' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#374151' }}
          >
            Financeiro completo <ArrowRight size={13} />
          </Link>
        </div>
      </div>

      {/* ── Gráfico de Fluxo de Caixa ─────────────────────────────────── */}
      <div className="card p-6">
        <div className="mb-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-0.5"
            style={{ color: 'var(--text-muted)' }}>{new Date().getFullYear()}</p>
          <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
            Fluxo de Caixa
          </h3>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={cashflow} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#16A34A" stopOpacity={0.30} />
                <stop offset="95%" stopColor="#16A34A" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gExp" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#DC2626" stopOpacity={0.30} />
                <stop offset="95%" stopColor="#DC2626" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false}
              tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12, color: '#6B7280' }} />
            <Area type="monotone" dataKey="Receitas" stroke="#16A34A" strokeWidth={2} fill="url(#gRev)" dot={false} />
            <Area type="monotone" dataKey="Despesas" stroke="#DC2626" strokeWidth={2} fill="url(#gExp)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* ── Tarefas + Despesas ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

        {/* Tarefas abertas */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-0.5"
                style={{ color: 'var(--text-muted)' }}>Pendentes</p>
              <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                Tarefas Abertas
              </h3>
            </div>
            <Link to="/app/tasks" className="flex items-center gap-1.5 text-xs font-semibold"
              style={{ color: '#374151' }}>
              Ver todas <ArrowRight size={13} />
            </Link>
          </div>
          <div className="space-y-1.5">
            {tasks.length === 0 && (
              <p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>
                Nenhuma tarefa aberta
              </p>
            )}
            {tasks.map(t => (
              <Link key={t.id} to={`/app/tasks/${t.id}`}
                className="flex items-center gap-3 p-3 rounded-xl transition-all duration-150"
                onMouseEnter={e => e.currentTarget.style.background = '#F3F4F6'}
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
            ))}
          </div>
        </div>

        {/* Despesas a vencer */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-0.5"
                style={{ color: 'var(--text-muted)' }}>Próximas</p>
              <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                Despesas a Vencer
              </h3>
            </div>
            <Link to="/app/financial/expenses" className="flex items-center gap-1.5 text-xs font-semibold"
              style={{ color: '#374151' }}>
              Ver todas <ArrowRight size={13} />
            </Link>
          </div>
          <div className="space-y-1">
            {[
              { label: 'A pagar total', sub: 'Pendente',    value: stats.expenses_pending, color: '#D97706' },
              { label: 'Em atraso',     sub: 'Vencidas',    value: stats.expenses_overdue, color: '#DC2626' },
              { label: 'Pago este mês', sub: 'Confirmados', value: stats.expenses_month,   color: '#16A34A' },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between py-3"
                style={{ borderBottom: i < 2 ? '1px solid #E5E7EB' : 'none' }}>
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{item.label}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{item.sub}</p>
                </div>
                <span className="text-sm font-bold" style={{ color: item.color }}>
                  {formatCurrency(item.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}