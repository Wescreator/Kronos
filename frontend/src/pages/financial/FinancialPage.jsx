import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  TrendingUp, TrendingDown, DollarSign, BarChart2,
  ArrowRight, ArrowUpRight, Scale,
} from 'lucide-react'
import StatCard   from '../../components/ui/StatCard'
import Spinner    from '../../components/ui/Spinner'
import PageHeader from '../../components/ui/PageHeader'
import { formatCurrency, formatCompact, monthNames } from '../../utils/format'
import {
  getFinancialDashboard,
  getExpensesByCategory,
  getFinancialForecast,
} from '../../services/financial.service'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell, PieChart, Pie,
} from 'recharts'

/* ─── Tooltip compartilhado ─── */
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#0D152B', border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 12, padding: '10px 14px',
      boxShadow: '0 20px 40px rgba(0,0,0,0.45)', fontSize: 12,
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

/* ─── Spinner inline para os novos cards ─── */
const InlineSpinner = () => (
  <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
    <Spinner size="md" />
  </div>
)

/* ─── Mensagem de ausência de dados ─── */
const EmptyChart = ({ message }) => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    height: 180, borderRadius: 12,
    background: 'rgba(255,255,255,0.02)',
    border: '1px dashed rgba(255,255,255,0.07)',
    color: 'var(--text-muted)', fontSize: 13,
  }}>
    {message}
  </div>
)
const darkenColor = (hex, amount = 0.45) => {
  const color = hex.replace('#', '')

  const r = parseInt(color.substring(0, 2), 16)
  const g = parseInt(color.substring(2, 4), 16)
  const b = parseInt(color.substring(4, 6), 16)

  return `rgb(
    ${Math.floor(r * (1 - amount))},
    ${Math.floor(g * (1 - amount))},
    ${Math.floor(b * (1 - amount))}
  )`
}

export default function FinancialPage() {
  /* ── Estado principal (inalterado) ── */
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)

  /* ── Estado dos novos painéis ── */
  const now = new Date()
  const [catMonth,        setCatMonth]        = useState(now.getMonth() + 1)
  const [catYear,         setCatYear]         = useState(now.getFullYear())
  const [categories,      setCategories]      = useState([])
  const [catLoading,      setCatLoading]      = useState(true)
  const [forecast,        setForecast]        = useState({ expenses: [], revenues: [] })
  const [forecastLoading, setForecastLoading] = useState(true)

  /* ── Carregamento principal (inalterado) ── */
  useEffect(() => {
    getFinancialDashboard()
      .then(r => setData(r.data))
      .finally(() => setLoading(false))
  }, [])

  /* ── Despesas por categoria — recarrega ao mudar mês/ano ── */
  useEffect(() => {
    setCatLoading(true)
    getExpensesByCategory({ month: catMonth, year: catYear })
      .then(r => setCategories(r.data?.categories || []))
      .catch(() => setCategories([]))
      .finally(() => setCatLoading(false))
  }, [catMonth, catYear])

  /* ── Previsão — carregado uma vez ── */
  useEffect(() => {
    setForecastLoading(true)
    getFinancialForecast()
      .then(r => setForecast({
        expenses: r.data?.expenses || [],
        revenues: r.data?.revenues || [],
      }))
      .catch(() => setForecast({ expenses: [], revenues: [] }))
      .finally(() => setForecastLoading(false))
  }, [])

  /* ── Guarda de loading principal (inalterado) ── */
  if (loading) return (
    <div className="flex justify-center py-20"><Spinner size="lg" /></div>
  )

  /* ── Cálculos principais (inalterados) ── */
  const stats      = data?.stats || {}
  const cashflow   = (data?.cashflow || []).map(row => ({
    name:     monthNames[row.month - 1],
    Receitas: parseFloat(row.revenues),
    Despesas: parseFloat(row.expenses),
    Lucro:    parseFloat(row.profit),
  }))

  const netRevenue = parseFloat(stats.revenue_month  || 0)
  const netExpense = parseFloat(stats.expenses_month || 0)
  const netProfit  = netRevenue - netExpense
  const margin     = netRevenue > 0 ? ((netProfit / netRevenue) * 100).toFixed(1) : 0

  /* ── Cálculos dos novos painéis ── */
  const maxCatTotal = categories.length > 0 ? parseFloat(categories[0].total) : 1

  const forecastExpData = forecast.expenses.slice(0, 6).map(r => ({
    name:     monthNames[r.month - 1],
    Previsto: parseFloat(r.total),
  }))

  const forecastRevData = forecast.revenues.slice(0, 6).map(r => ({
    name:     monthNames[r.month - 1],
    Previsto: parseFloat(r.total),
  }))

  const totalForecastExpenses = forecast.expenses.reduce((s, r) => s + parseFloat(r.total), 0)
  const totalForecastRevenues = forecast.revenues.reduce((s, r) => s + parseFloat(r.total), 0)
  const projectedBalance      = totalForecastRevenues - totalForecastExpenses

  return (
    <div className="space-y-7 fade-in">

      {/* ══════════════════════════════════════════════════════════
          SEÇÃO EXISTENTE — inalterada
      ══════════════════════════════════════════════════════════ */}

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

      {/* KPIs — inalterados */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Receita do Mês"  value={formatCompact(netRevenue)}            icon={TrendingUp}   color="green" subtitle="Recebimentos confirmados" />
        <StatCard title="Despesas do Mês" value={formatCompact(netExpense)}            icon={TrendingDown} color="red"   subtitle="Pagamentos confirmados" />
        <StatCard title="Lucro Líquido"   value={formatCompact(netProfit)}             icon={DollarSign}   color={netProfit >= 0 ? 'green' : 'red'} subtitle={`Margem ${margin}%`} />
        <StatCard title="A Receber"       value={formatCompact(stats.revenue_pending)} icon={ArrowUpRight} color="blue"  subtitle={`${formatCompact(stats.revenue_overdue)} atrasado`} />
      </div>

      {/* Atalhos de navegação — inalterados */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            to: '/app/financial/expenses',
            label: 'Contas a Pagar',
            value: formatCompact(stats.expenses_pending),
            sub:   `${formatCompact(stats.expenses_overdue)} em atraso`,
            accent: '#FB7185',
            glow:   'rgba(251,113,133,0.08)',
          },
          {
            to: '/app/financial/revenues',
            label: 'Contas a Receber',
            value: formatCompact(stats.revenue_pending),
            sub:   `${formatCompact(stats.revenue_overdue)} em atraso`,
            accent: '#34D399',
            glow:   'rgba(52,211,153,0.08)',
          },
          {
            to: '/app/financial/dre',
            label: 'DRE',
            value: `Margem ${margin}%`,
            sub:   'Demonstrativo de resultados',
            accent: '#7C5CFC',
            glow:   'rgba(124,92,252,0.08)',
          },
        ].map(item => (
          <Link
            key={item.to}
            to={item.to}
            className="card card-hover p-5 flex items-center justify-between"
            style={{ boxShadow: `0 10px 30px rgba(0,0,0,0.35), 0 0 30px ${item.glow}` }}
          >
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-1"
                style={{ color: 'var(--text-muted)' }}>
                {item.label}
              </p>
              <p className="text-xl font-bold mb-0.5" style={{ color: item.accent }}>{item.value}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{item.sub}</p>
            </div>
            <ArrowRight size={18} style={{ color: 'var(--text-muted)' }} />
          </Link>
        ))}
      </div>

      {/* Gráficos — inalterados */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <div className="card p-6">
          <div className="mb-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-0.5"
              style={{ color: 'var(--text-muted)' }}>Anual</p>
            <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
              Fluxo de Caixa
            </h3>
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
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-0.5"
              style={{ color: 'var(--text-muted)' }}>Mensal</p>
            <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
              Lucro por Mês
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={cashflow} barSize={24}>
              <defs>
                <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#7C5CFC" />
                  <stop offset="100%" stopColor="#4338ca" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.35)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.35)' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="Lucro" radius={[8,8,0,0]} fill="url(#barGrad)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          NOVOS PAINÉIS — análise avançada
      ══════════════════════════════════════════════════════════ */}

      <div>
        {/* Cabeçalho da seção */}
        <div className="mb-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-0.5"
            style={{ color: 'var(--text-muted)' }}>
            Projeção Financeira
          </p>
          <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
            Análise Avançada
          </h2>
        </div>

        {/* Linha 1: Categoria + Saldo Projetado */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-5">

          {/* ── Card: Despesas por Categoria ── */}
         <div
  className="card p-6"
  style={{
    background: `
      radial-gradient(
        circle at top right,
        rgba(124,92,252,0.14),
        rgba(0,0,0,0) 45%
      ),
      var(--card-bg)
    `,
  }}
>
            {/* Header + seletor de mês/ano */}
            <div className="flex items-start justify-between mb-5 gap-3 flex-wrap">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-0.5"
                  style={{ color: 'var(--text-muted)' }}>
                  Pagas
                </p>
                <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                  Despesas por Categoria
                </h3>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <select
                  value={catMonth}
                  onChange={e => setCatMonth(Number(e.target.value))}
                  className="input text-xs py-1.5"
                  style={{ width: 'auto', minWidth: 72, height: 'auto' }}
                >
                  {monthNames.map((m, i) => (
                    <option key={i} value={i + 1}>{m}</option>
                  ))}
                </select>
                <select
                  value={catYear}
                  onChange={e => setCatYear(Number(e.target.value))}
                  className="input text-xs py-1.5"
                  style={{ width: 'auto', minWidth: 68, height: 'auto' }}
                >
                  {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

           {/* Conteúdo */}
{catLoading ? (
  <InlineSpinner />
) : categories.length === 0 ? (
  <EmptyChart message="Nenhuma despesa paga neste mês" />
) : (
  <div
    style={{
      height: 290,
      display: 'flex',
      alignItems: 'center',
      gap: 20,
    }}
  >
    {/* Área do gráfico */}
    <div
      style={{
        flex: 1,
        minWidth: 300,
        height: '100%',
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>

          {/* Espessura 3D */}
          <Pie
            data={categories}
            dataKey="total"
            cx="50%"
            cy="53%"
            innerRadius={48}
            outerRadius={82}
            stroke="none"
            isAnimationActive={false}
          >
            {categories.map((entry, index) => (
              <Cell
                key={index}
                fill={darkenColor(entry.category_color)}
              />
            ))}
          </Pie>

          {/* Disco principal */}
          <Pie
            data={categories}
            dataKey="total"
            cx="50%"
            cy="48%"
            innerRadius={48}
            outerRadius={82}
            paddingAngle={2}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={1}
            isAnimationActive={false}
          >
            {categories.map((entry, index) => (
              <Cell
                key={index}
                fill={entry.category_color}
              />
            ))}
          </Pie>

        </PieChart>
      </ResponsiveContainer>
    </div>

    {/* Legenda Premium */}
    <div
      style={{
        width: 300,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      {categories.map((cat, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              minWidth: 0,
            }}
          >
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: cat.category_color,
                boxShadow: `0 0 12px ${cat.category_color}`,
                flexShrink: 0,
              }}
            />

            <span
              style={{
                color: 'var(--text-secondary)',
                fontSize: 12,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {cat.category_name}
            </span>
          </div>

          <span
            style={{
              color: 'var(--text-primary)',
              fontWeight: 700,
              fontSize: 12,
            }}
          >
            {formatCurrency(cat.total)}
          </span>
        </div>
      ))}
    </div>
  </div>
)}

    {/* Legenda Premium */}
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      {categories.map((cat, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              minWidth: 0,
            }}
          >
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: cat.category_color,
                boxShadow: `0 0 12px ${cat.category_color}`,
                flexShrink: 0,
              }}
            />

            <span
              style={{
                color: 'var(--text-secondary)',
                fontSize: 12,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {cat.category_name}
            </span>
          </div>

          <span
            style={{
              color: 'var(--text-primary)',
              fontWeight: 700,
              fontSize: 12,
            }}
          >
            {formatCurrency(cat.total)}
          </span>
        </div>
      ))}
    </div>
  </div>

          </div>

          {/* ── Card: Saldo Projetado ── */}
          <div className="card p-6">
            <div className="mb-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-0.5"
                style={{ color: 'var(--text-muted)' }}>
                Pendências futuras
              </p>
              <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                Saldo Projetado
              </h3>
            </div>

            {forecastLoading ? (
              <InlineSpinner />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {/* Receitas previstas */}
                <div style={{
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 0',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: 'rgba(52,211,153,0.10)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <TrendingUp size={16} style={{ color: '#34D399' }} />
                    </div>
                    <div>
                      <p style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.10em', marginBottom: 1 }}>
                        Receitas previstas
                      </p>
                      <p style={{ fontSize: 18, fontWeight: 700, color: '#34D399', lineHeight: 1 }}>
                        {formatCompact(totalForecastRevenues)}
                      </p>
                    </div>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {forecast.revenues.length} {forecast.revenues.length === 1 ? 'mês' : 'meses'}
                  </span>
                </div>

                {/* Despesas previstas */}
                <div style={{
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 0',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: 'rgba(251,113,133,0.10)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <TrendingDown size={16} style={{ color: '#FB7185' }} />
                    </div>
                    <div>
                      <p style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.10em', marginBottom: 1 }}>
                        Despesas previstas
                      </p>
                      <p style={{ fontSize: 18, fontWeight: 700, color: '#FB7185', lineHeight: 1 }}>
                        {formatCompact(totalForecastExpenses)}
                      </p>
                    </div>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {forecast.expenses.length} {forecast.expenses.length === 1 ? 'mês' : 'meses'}
                  </span>
                </div>

                {/* Saldo Projetado */}
                <div style={{
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 0 4px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: projectedBalance >= 0 ? 'rgba(124,92,252,0.12)' : 'rgba(251,113,133,0.10)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Scale size={16} style={{ color: projectedBalance >= 0 ? '#A78BFA' : '#FB7185' }} />
                    </div>
                    <div>
                      <p style={{ fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.10em', marginBottom: 1 }}>
                        Saldo projetado
                      </p>
                      <p style={{
                        fontSize: 22, fontWeight: 700, lineHeight: 1,
                        color: projectedBalance >= 0 ? '#A78BFA' : '#FB7185',
                      }}>
                        {formatCompact(projectedBalance)}
                      </p>
                    </div>
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: '3px 10px',
                    borderRadius: 20,
                    background: projectedBalance >= 0
                      ? 'rgba(52,211,153,0.10)' : 'rgba(251,113,133,0.10)',
                    color: projectedBalance >= 0 ? '#34D399' : '#FB7185',
                    border: `1px solid ${projectedBalance >= 0 ? 'rgba(52,211,153,0.20)' : 'rgba(251,113,133,0.20)'}`,
                  }}>
                    {projectedBalance >= 0 ? 'Positivo' : 'Negativo'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Linha 2: Previsão Despesas + Previsão Receitas */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

          {/* ── Card: Previsão de Despesas ── */}
          <div className="card p-6">
            <div className="mb-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-0.5"
                style={{ color: 'var(--text-muted)' }}>
                Pendentes
              </p>
              <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                Previsão de Despesas
              </h3>
            </div>

            {forecastLoading ? (
              <InlineSpinner />
            ) : forecastExpData.length === 0 ? (
              <EmptyChart message="Nenhuma despesa pendente futura" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={forecastExpData} barSize={22}>
                  <defs>
                    <linearGradient id="gradExp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor="#FB7185" stopOpacity={0.90} />
                      <stop offset="100%" stopColor="#e11d48" stopOpacity={0.60} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.35)' }}
                    axisLine={false} tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.35)' }}
                    axisLine={false} tickLine={false}
                    tickFormatter={v => `${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="Previsto" fill="url(#gradExp)" radius={[6,6,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* ── Card: Previsão de Receitas ── */}
          <div className="card p-6">
            <div className="mb-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-0.5"
                style={{ color: 'var(--text-muted)' }}>
                Pendentes
              </p>
              <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                Previsão de Receitas
              </h3>
            </div>

            {forecastLoading ? (
              <InlineSpinner />
            ) : forecastRevData.length === 0 ? (
              <EmptyChart message="Nenhuma receita pendente futura" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={forecastRevData} barSize={22}>
                  <defs>
                    <linearGradient id="gradRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor="#34D399" stopOpacity={0.90} />
                      <stop offset="100%" stopColor="#059669" stopOpacity={0.60} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.35)' }}
                    axisLine={false} tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.35)' }}
                    axisLine={false} tickLine={false}
                    tickFormatter={v => `${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="Previsto" fill="url(#gradRev)" radius={[6,6,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

        </div>
      </div>

    
  )
}