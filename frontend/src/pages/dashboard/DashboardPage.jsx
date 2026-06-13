import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  DollarSign, FolderKanban, AlertCircle,
  TrendingUp, CheckSquare, Clock, ArrowRight, Zap
} from 'lucide-react'
import StatCard  from '../../components/ui/StatCard'
import Spinner   from '../../components/ui/Spinner'
import Badge     from '../../components/ui/Badge'
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
      background: 'rgba(13,21,43,0.92)', border: '1px solid rgba(255,255,255,0.10)',
      borderRadius: 12, padding: '10px 14px',
      boxShadow: '0 20px 40px rgba(0,0,0,0.45)', fontSize: 12,
      backdropFilter: 'blur(12px)',
    }}>
      <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 6, fontWeight: 600 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color, fontWeight: 600, marginBottom: 2 }}>
          {p.name}: {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  )
}

/* ── Estilos de glassmorphism inline reutilizáveis ── */
const glassRow = {
  background: 'rgba(255,255,255,0.030)',
  border: '1px solid rgba(255,255,255,0.07)',
  borderTop: '1px solid rgba(255,255,255,0.11)',
}

const glassRowHoverEnter = (e) => {
  e.currentTarget.style.background  = 'rgba(124,92,252,0.07)'
  e.currentTarget.style.borderColor = 'rgba(124,92,252,0.18)'
}
const glassRowHoverLeave = (e) => {
  e.currentTarget.style.background  = glassRow.background
  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'
}

export default function DashboardPage() {
  const [financial, setFinancial] = useState(null)
  const [projects,  setProjects]  = useState([])
  const [tasks,     setTasks]     = useState([])
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    Promise.all([
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

      {/* ── Header ────────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Zap size={16} style={{ color: '#7C5CFC' }} />
          <span className="text-[11px] font-bold uppercase tracking-[0.15em]" style={{ color: '#A78BFA' }}>
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

      {/* ── KPIs ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Receita do Mês"     value={formatCompact(netRevenue)}            icon={DollarSign}  color="green"  subtitle="Recebimentos confirmados" />
        <StatCard title="Projetos Ativos"    value={projects.length}                      icon={FolderKanban}color="purple" subtitle="Em andamento agora" />
        <StatCard title="Despesas a Vencer"  value={formatCompact(stats.expenses_pending)} icon={AlertCircle} color="yellow" subtitle={`${formatCompact(stats.expenses_overdue)} em atraso`} />
        <StatCard title="Receitas a Receber" value={formatCompact(stats.revenue_pending)}  icon={TrendingUp}  color="blue"   subtitle={`${formatCompact(stats.revenue_overdue)} em atraso`} />
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
              style={{ color: '#A78BFA' }}>
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
              { label: 'Receita',       value: netRevenue,             color: '#34D399' },
              { label: 'Despesas',      value: netExpense,             color: '#FB7185' },
              { label: 'Lucro líquido', value: netProfit,              color: netProfit >= 0 ? '#34D399' : '#FB7185', bold: true },
              { label: 'A pagar',       value: stats.expenses_pending, color: 'var(--text-secondary)' },
              { label: 'A receber',     value: stats.revenue_pending,  color: 'var(--text-secondary)' },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between py-3"
                style={{ borderBottom: i < 4 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
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
              background: 'rgba(124,92,252,0.10)',
              border: '1px solid rgba(124,92,252,0.22)',
              color: '#A78BFA',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(124,92,252,0.18)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(124,92,252,0.10)' }}
          >
            Ver financeiro completo <ArrowRight size={13} />
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
                <stop offset="5%"  stopColor="#34D399" stopOpacity={0.30} />
                <stop offset="95%" stopColor="#34D399" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gExp" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#FB7185" stopOpacity={0.30} />
                <stop offset="95%" stopColor="#FB7185" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.35)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.35)' }} axisLine={false} tickLine={false}
              tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }} />
            <Area type="monotone" dataKey="Receitas" stroke="#34D399" strokeWidth={2} fill="url(#gRev)" dot={false} />
            <Area type="monotone" dataKey="Despesas" stroke="#FB7185" strokeWidth={2} fill="url(#gExp)" dot={false} />
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
              style={{ color: '#A78BFA' }}>
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
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
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
              style={{ color: '#A78BFA' }}>
              Ver todas <ArrowRight size={13} />
            </Link>
          </div>
          <div className="space-y-1">
            {[
              { label: 'A pagar total', sub: 'Pendente',    value: stats.expenses_pending, color: '#FBBF24' },
              { label: 'Em atraso',     sub: 'Vencidas',    value: stats.expenses_overdue, color: '#FB7185' },
              { label: 'Pago este mês', sub: 'Confirmados', value: stats.expenses_month,   color: '#34D399' },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between py-3"
                style={{ borderBottom: i < 2 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
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