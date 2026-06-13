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
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
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
  return `rgb(${Math.floor(r * (1 - amount))}, ${Math.floor(g * (1 - amount))}, ${Math.floor(b * (1 - amount))})`
}

/* ─── Donut SVG puro com hover interativo e profundidade 3D ─── */
const DonutChart = ({ categories, totalCat, formatCurrencyFn }) => {
  const [hovered, setHovered] = useState(null)

  const SIZE      = 240
  const CX        = SIZE / 2
  const CY        = SIZE / 2
  const INNER_R   = 62
  const OUTER_R   = 100
  const DEPTH     = 14
  const GAP_DEG   = 1.8
  const HOVER_LIFT = 7

  const toRad = deg => (deg * Math.PI) / 180

  const polar = (angleDeg, r, offsetY = 0) => ({
    x: CX + r * Math.cos(toRad(angleDeg - 90)),
    y: CY + r * Math.sin(toRad(angleDeg - 90)) + offsetY,
  })

  const arcPath = (sa, ea, iR, oR, offsetY = 0) => {
    const s = sa + GAP_DEG / 2
    const e = ea - GAP_DEG / 2
    if (e - s <= 0) return ''
    const o1 = polar(s, oR, offsetY), o2 = polar(e, oR, offsetY)
    const i1 = polar(e, iR, offsetY), i2 = polar(s, iR, offsetY)
    const lg = e - s > 180 ? 1 : 0
    return [
      `M ${o1.x.toFixed(3)} ${o1.y.toFixed(3)}`,
      `A ${oR} ${oR} 0 ${lg} 1 ${o2.x.toFixed(3)} ${o2.y.toFixed(3)}`,
      `L ${i1.x.toFixed(3)} ${i1.y.toFixed(3)}`,
      `A ${iR} ${iR} 0 ${lg} 0 ${i2.x.toFixed(3)} ${i2.y.toFixed(3)}`,
      'Z',
    ].join(' ')
  }

  let running = 0
  const segments = categories.map((cat, i) => {
    const value = parseFloat(cat.total)
    const sweep = totalCat > 0 ? (value / totalCat) * 360 : 0
    const start = running
    const end   = running + sweep
    running     = end
    const mid   = (start + end) / 2
    const pct   = totalCat > 0 ? (value / totalCat) * 100 : 0
    return { ...cat, start, end, mid, sweep, pct, i }
  })

  return (
    <svg
      width={SIZE}
      height={SIZE}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      style={{ overflow: 'visible', display: 'block' }}
    >
      <defs>
        <radialGradient id="floorGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="rgba(120,80,255,0.5)" />
          <stop offset="65%"  stopColor="rgba(80,40,200,0.18)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </radialGradient>
        {segments.map((_, i) => (
          <filter key={i} id={`glow${i}`} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        ))}
      </defs>

      {/* Elipse de glow no chão */}
      <ellipse
        cx={CX} cy={CY + DEPTH + 14}
        rx={OUTER_R + 18} ry={20}
        fill="url(#floorGrad)"
      />

      {/* Anéis de sombra (espessura 3D) */}
      {segments.map((seg, i) => (
        <path
          key={`sh-${i}`}
          d={arcPath(seg.start, seg.end, INNER_R, OUTER_R, DEPTH)}
          fill={darkenColor(seg.category_color, 0.58)}
          opacity={0.85}
        />
      ))}

      {/* Fatias principais */}
      {segments.map((seg, i) => {
        const isH = hovered === i
        const tx  = isH ? HOVER_LIFT * Math.cos(toRad(seg.mid - 90)) : 0
        const ty  = isH ? HOVER_LIFT * Math.sin(toRad(seg.mid - 90)) : 0
        const lp  = polar(seg.mid, (INNER_R + OUTER_R) / 2)

        return (
          <g
            key={i}
            style={{
              transform:  `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px)`,
              transition: 'transform 0.22s cubic-bezier(.34,1.56,.64,1)',
              cursor:     'pointer',
            }}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          >
            <path
              d={arcPath(seg.start, seg.end, INNER_R, OUTER_R)}
              fill={seg.category_color}
              stroke="rgba(255,255,255,0.08)"
              strokeWidth={1}
              filter={isH ? `url(#glow${i})` : undefined}
              style={{ transition: 'filter 0.18s' }}
            />
            {seg.pct >= 5 && (
              <text
                x={lp.x} y={lp.y}
                fill="rgba(255,255,255,0.95)"
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={isH ? 12.5 : 11}
                fontWeight={700}
                style={{ pointerEvents: 'none', transition: 'font-size 0.2s' }}
              >
                {Math.round(seg.pct)}%
              </text>
            )}
          </g>
        )
      })}

      {/* Tooltip flutuante no hover */}
      {hovered !== null && (() => {
        const seg  = segments[hovered]
        const tipR = OUTER_R + 22
        const tp   = polar(seg.mid, tipR)
        const text = formatCurrencyFn(parseFloat(seg.total))
        const bw   = text.length * 6.2 + 18
        const bh   = 22
        return (
          <g style={{ pointerEvents: 'none' }}>
            <rect
              x={tp.x - bw / 2} y={tp.y - bh / 2}
              width={bw} height={bh} rx={6}
              fill="#0D152B"
              stroke={seg.category_color}
              strokeWidth={1}
              opacity={0.95}
            />
            <text
              x={tp.x} y={tp.y}
              fill={seg.category_color}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={10.5}
              fontWeight={700}
            >
              {text}
            </text>
          </g>
        )
      })()}
    </svg>
  )
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

  /* ── Total das categorias ── */
  const totalCat = categories.reduce((s, c) => s + parseFloat(c.total), 0)

  return (
    <div className="space-y-7 fade-in">

      {/* ── Estilos da borda animada (scoped à FinancialPage) ── */}
      <style>{`
        @keyframes kronosBorderSpin {
          from { transform: translate(-50%, -50%) rotate(0deg);   }
          to   { transform: translate(-50%, -50%) rotate(360deg); }
        }

        /* Wrapper base */
        .kpi-glow-wrap,
        .nav-glow-wrap {
          position: relative;
          border-radius: 14px;
          overflow: hidden;
          isolation: isolate;
        }

        /* Disco giratório — fica atrás de tudo */
        .kpi-glow-wrap::before,
        .nav-glow-wrap::before {
          content: '';
          position: absolute;
          width: 220%;
          aspect-ratio: 1;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(0deg);
          opacity: 0;
          transition: opacity 0.35s ease;
          will-change: transform, opacity;
          z-index: 0;
          pointer-events: none;
        }

        /* Tampa central — restaura o fundo do card */
        .kpi-glow-wrap::after,
        .nav-glow-wrap::after {
          content: '';
          position: absolute;
          inset: 1.5px;
          border-radius: 12px;
          background: var(--card-bg);
          z-index: 1;
          pointer-events: none;
        }

        /* Conteúdo acima da tampa */
        .kpi-glow-wrap > *,
        .nav-glow-wrap > * {
          position: relative;
          z-index: 2;
        }

        /* Ativa animação no hover */
        .kpi-glow-wrap:hover::before,
        .nav-glow-wrap:hover::before {
          opacity: 1;
          animation: kronosBorderSpin 2s linear infinite;
        }

        /* ── Cores por card ── */
        .kpi-glow-wrap.glow-emerald::before {
          background: conic-gradient(from 0deg, transparent 0%, #34D399 18%, transparent 36%);
        }
        .kpi-glow-wrap.glow-emerald:hover {
          box-shadow: 0 0 18px rgba(52,211,153,.35);
        }

        .kpi-glow-wrap.glow-rose::before {
          background: conic-gradient(from 0deg, transparent 0%, #FB7185 18%, transparent 36%);
        }
        .kpi-glow-wrap.glow-rose:hover {
          box-shadow: 0 0 18px rgba(251,113,133,.35);
        }

        .kpi-glow-wrap.glow-violet::before {
          background: conic-gradient(from 0deg, transparent 0%, #7C5CFC 18%, transparent 36%);
        }
        .kpi-glow-wrap.glow-violet:hover {
          box-shadow: 0 0 18px rgba(124,92,252,.35);
        }

        .kpi-glow-wrap.glow-sky::before {
          background: conic-gradient(from 0deg, transparent 0%, #38BDF8 18%, transparent 36%);
        }
        .kpi-glow-wrap.glow-sky:hover {
          box-shadow: 0 0 18px rgba(56,189,248,.35);
        }

        .nav-glow-wrap.glow-rose::before {
          background: conic-gradient(from 0deg, transparent 0%, #FB7185 18%, transparent 36%);
        }
        .nav-glow-wrap.glow-rose:hover {
          box-shadow: 0 0 18px rgba(251,113,133,.35);
        }

        .nav-glow-wrap.glow-emerald::before {
          background: conic-gradient(from 0deg, transparent 0%, #34D399 18%, transparent 36%);
        }
        .nav-glow-wrap.glow-emerald:hover {
          box-shadow: 0 0 18px rgba(52,211,153,.35);
        }

        .nav-glow-wrap.glow-violet::before {
          background: conic-gradient(from 0deg, transparent 0%, #7C5CFC 18%, transparent 36%);
        }
        .nav-glow-wrap.glow-violet:hover {
          box-shadow: 0 0 18px rgba(124,92,252,.35);
        }
      `}</style>

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

      {/* KPIs — com borda animada */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="kpi-glow-wrap glow-emerald">
          <StatCard title="Receita do Mês"  value={formatCompact(netRevenue)}            icon={TrendingUp}   color="green" subtitle="Recebimentos confirmados" />
        </div>
        <div className="kpi-glow-wrap glow-rose">
          <StatCard title="Despesas do Mês" value={formatCompact(netExpense)}            icon={TrendingDown} color="red"   subtitle="Pagamentos confirmados" />
        </div>
        <div className="kpi-glow-wrap glow-violet">
          <StatCard title="Lucro Líquido"   value={formatCompact(netProfit)}             icon={DollarSign}   color={netProfit >= 0 ? 'green' : 'red'} subtitle={`Margem ${margin}%`} />
        </div>
        <div className="kpi-glow-wrap glow-sky">
          <StatCard title="A Receber"       value={formatCompact(stats.revenue_pending)} icon={ArrowUpRight} color="blue"  subtitle={`${formatCompact(stats.revenue_overdue)} atrasado`} />
        </div>
      </div>

      {/* Atalhos de navegação — com borda animada */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            to: '/app/financial/expenses',
            label: 'Contas a Pagar',
            value: formatCompact(stats.expenses_pending),
            sub:   `${formatCompact(stats.expenses_overdue)} em atraso`,
            accent: '#FB7185',
            glow:   'rgba(251,113,133,0.08)',
            glowClass: 'glow-rose',
          },
          {
            to: '/app/financial/revenues',
            label: 'Contas a Receber',
            value: formatCompact(stats.revenue_pending),
            sub:   `${formatCompact(stats.revenue_overdue)} em atraso`,
            accent: '#34D399',
            glow:   'rgba(52,211,153,0.08)',
            glowClass: 'glow-emerald',
          },
          {
            to: '/app/financial/dre',
            label: 'DRE',
            value: `Margem ${margin}%`,
            sub:   'Demonstrativo de resultados',
            accent: '#7C5CFC',
            glow:   'rgba(124,92,252,0.08)',
            glowClass: 'glow-violet',
          },
        ].map(item => (
          <div key={item.to} className={`nav-glow-wrap ${item.glowClass}`}>
            <Link
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
          </div>
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

          {/* ══════════════════════════════════════════════════
              CARD REDESENHADO: Despesas por Categoria
          ══════════════════════════════════════════════════ */}
          <div
            className="card p-6"
            style={{
              background: `
                radial-gradient(circle at top right, rgba(124,92,252,0.14), rgba(0,0,0,0) 45%),
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
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>

                  {/* ── Gráfico Donut 3D com perspectiva CSS ── */}
                  <div style={{
                    width: 240,
                    height: 250,
                    flexShrink: 0,
                    perspective: '560px',
                    perspectiveOrigin: '50% 40%',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'center',
                  }}>
                    <div style={{
                      position: 'relative',
                      width: 240,
                      height: 240,
                      transform: 'rotateX(28deg)',
                      transformOrigin: '50% 60%',
                      transformStyle: 'preserve-3d',
                    }}>
                      <DonutChart
                        categories={categories}
                        totalCat={totalCat}
                        formatCurrencyFn={formatCurrency}
                      />

                      {/* Centro: Total Pago */}
                      <div style={{
                        position: 'absolute',
                        top: '50%', left: '50%',
                        transform: 'translate(-50%, -50%)',
                        textAlign: 'center',
                        pointerEvents: 'none',
                        width: 90,
                      }}>
                        <p style={{
                          fontSize: 8.5,
                          fontWeight: 700,
                          color: 'var(--text-muted)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.10em',
                          marginBottom: 4,
                          whiteSpace: 'nowrap',
                        }}>
                          Total Pago
                        </p>
                        <p style={{
                          fontSize: 11,
                          fontWeight: 800,
                          color: 'var(--text-primary)',
                          lineHeight: 1.2,
                          wordBreak: 'break-all',
                        }}>
                          {formatCurrency(totalCat)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* ── Legenda compacta ── */}
                  <div style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0,
                    minWidth: 0,
                  }}>
                    {categories.map((cat, i) => {
                      const pct = totalCat > 0
                        ? ((parseFloat(cat.total) / totalCat) * 100).toFixed(0)
                        : 0
                      return (
                        <div
                          key={i}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 8,
                            padding: '7px 0',
                            borderBottom: i < categories.length - 1
                              ? '1px solid rgba(255,255,255,0.04)'
                              : 'none',
                          }}
                        >
                          {/* Dot + nome */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                            <span style={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              background: cat.category_color,
                              boxShadow: `0 0 8px ${cat.category_color}`,
                              flexShrink: 0,
                            }} />
                            <span style={{
                              fontSize: 11.5,
                              fontWeight: 600,
                              color: 'var(--text-primary)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}>
                              {cat.category_name}
                            </span>
                          </div>

                          {/* Valor + % */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                            <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                              {formatCurrency(cat.total)}
                            </span>
                            <span style={{
                              fontSize: 11.5,
                              fontWeight: 700,
                              color: cat.category_color,
                              minWidth: 28,
                              textAlign: 'right',
                            }}>
                              {pct}%
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Rodapé informativo */}
                <p style={{
                  fontSize: 11,
                  color: 'var(--text-muted)',
                  textAlign: 'center',
                  marginTop: 18,
                  opacity: 0.55,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 5,
                }}>
                  <span style={{ fontSize: 12 }}>ⓘ</span>
                  Valores referentes ao mês selecionado
                </p>
              </>
            )}
          </div>
          {/* ══ fim card Despesas por Categoria ══ */}

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

    </div>
  )
}