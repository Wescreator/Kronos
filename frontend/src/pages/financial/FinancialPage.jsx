import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { TrendingUp, TrendingDown, DollarSign, BarChart2, ArrowRight, ArrowUpRight } from 'lucide-react'
import StatCard from '../../components/ui/StatCard'
import Spinner from '../../components/ui/Spinner'
import PageHeader from '../../components/ui/PageHeader'
import { formatCurrency, formatCompact, monthNames } from '../../utils/format'
import { getFinancialDashboard } from '../../services/financial.service'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#0D152B', border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 12, padding: '10px 14px', boxShadow: '0 20px 40px rgba(0,0,0,0.45)', fontSize: 12
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

export default function FinancialPage() {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getFinancialDashboard().then(r => setData(r.data)).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>

  const stats    = data?.stats || {}
  const cashflow = (data?.cashflow || []).map(row => ({
    name:     monthNames[row.month - 1],
    Receitas: parseFloat(row.revenues),
    Despesas: parseFloat(row.expenses),
    Lucro:    parseFloat(row.profit)
  }))

  const netRevenue = parseFloat(stats.revenue_month  || 0)
  const netExpense = parseFloat(stats.expenses_month || 0)
  const netProfit  = netRevenue - netExpense
  const margin     = netRevenue > 0 ? ((netProfit / netRevenue) * 100).toFixed(1) : 0

  return (
    <div className="space-y-7 fade-in">
      <div className="flex items-start justify-between">
        <PageHeader
          title="Financeiro"
          tag="Gestão Financeira"
          subtitle="Controle completo de receitas, despesas e resultados"
        />
        <Link to="/app/financial/dre" className="btn-secondary mt-1">
          <BarChart2 size={15} /> Ver DRE
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Receita do Mês"  value={formatCompact(netRevenue)}           icon={TrendingUp}   color="green"  subtitle="Recebimentos confirmados" />
        <StatCard title="Despesas do Mês" value={formatCompact(netExpense)}           icon={TrendingDown} color="red"    subtitle="Pagamentos confirmados" />
        <StatCard title="Lucro Líquido"   value={formatCompact(netProfit)}            icon={DollarSign}   color={netProfit >= 0 ? 'green' : 'red'} subtitle={`Margem ${margin}%`} />
        <StatCard title="A Receber"       value={formatCompact(stats.revenue_pending)} icon={ArrowUpRight} color="blue"   subtitle={`${formatCompact(stats.revenue_overdue)} atrasado`} />
      </div>

      {/* Atalhos */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            to: '/app/financial/expenses',
            label: 'Contas a Pagar',
            value: formatCompact(stats.expenses_pending),
            sub: `${formatCompact(stats.expenses_overdue)} em atraso`,
            accent: '#FB7185',
            glow: 'rgba(251,113,133,0.08)'
          },
          {
            to: '/app/financial/revenues',
            label: 'Contas a Receber',
            value: formatCompact(stats.revenue_pending),
            sub: `${formatCompact(stats.revenue_overdue)} em atraso`,
            accent: '#34D399',
            glow: 'rgba(52,211,153,0.08)'
          },
          {
            to: '/app/financial/dre',
            label: 'DRE',
            value: `Margem ${margin}%`,
            sub: 'Demonstrativo de resultados',
            accent: '#7C5CFC',
            glow: 'rgba(124,92,252,0.08)'
          },
        ].map(item => (
          <Link
            key={item.to}
            to={item.to}
            className="card card-hover p-5 flex items-center justify-between"
            style={{ boxShadow: `0 10px 30px rgba(0,0,0,0.35), 0 0 30px ${item.glow}` }}
          >
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-1" style={{ color: 'var(--text-muted)' }}>
                {item.label}
              </p>
              <p className="text-xl font-bold mb-0.5" style={{ color: item.accent }}>{item.value}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{item.sub}</p>
            </div>
            <ArrowRight size={18} style={{ color: 'var(--text-muted)' }} />
          </Link>
        ))}
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <div className="card p-6">
          <div className="mb-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-0.5" style={{ color: 'var(--text-muted)' }}>Anual</p>
            <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Fluxo de Caixa</h3>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={cashflow}>
              <defs>
                <linearGradient id="gRev2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#34D399" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#34D399" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gExp2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#FB7185" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#FB7185" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.35)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.35)' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }} />
              <Area type="monotone" dataKey="Receitas" stroke="#34D399" strokeWidth={2} fill="url(#gRev2)" dot={false} />
              <Area type="monotone" dataKey="Despesas" stroke="#FB7185" strokeWidth={2} fill="url(#gExp2)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-6">
          <div className="mb-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-0.5" style={{ color: 'var(--text-muted)' }}>Mensal</p>
            <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Lucro por Mês</h3>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={cashflow} barSize={24}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.35)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.35)' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="Lucro"
                radius={[8,8,0,0]}
                fill="url(#barGrad)"
              >
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#7C5CFC" />
                    <stop offset="100%" stopColor="#4338ca" />
                  </linearGradient>
                </defs>
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}