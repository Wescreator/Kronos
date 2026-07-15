import { useEffect, useState } from 'react'
import {
  AlertTriangle, ArrowDownCircle, ArrowUpCircle, Hourglass, Loader2, Printer, Scale, Wallet,
} from 'lucide-react'
import { getFinancialDashboard, getProjectFinancials, getExpenses, getRevenues } from '../../services/financial.service'
import { getMyCompany } from '../../services/company.service'
import { printFinancialReport } from './financialReportPrint'
import { formatCurrency, formatDate, monthNames, monthNamesLong } from '../../utils/format'

/*
 * Relatório Financeiro.
 *
 * Consome apenas endpoints JÁ existentes do módulo financeiro (todos
 * authorize('admin'), como o módulo de Relatórios):
 *   GET /financial/dashboard?month&year → { stats, cashflow (12 meses do ano) }
 *   GET /financial/expenses|revenues?month&year → detalhes do mês
 *   GET /financial/projects             → resultado por projeto (histórico)
 *   GET /company/me                     → cabeçalho do PDF
 */

const currentYear  = new Date().getFullYear()
const currentMonth = new Date().getMonth() + 1
const YEARS = Array.from({ length: 6 }, (_, i) => currentYear + 1 - i)

const n = (v) => Number(v) || 0
const pctOf = (value, total) => (total > 0 ? ((value / total) * 100).toFixed(1) : '0.0')

// Monta o modelo do mês (compartilhado entre a tela e o PDF):
// receitas detalhadas, despesas agrupadas por categoria e resumo com margem.
// Filtra por VENCIMENTO dentro do mês (a listagem da API arrasta pendências
// atrasadas de meses anteriores — aqui o recorte é o mês puro).
function buildMonthModel(expRows, revRows, month, year) {
  const inMonth = (d) => {
    const s = String(d).slice(0, 10)
    return Number(s.slice(0, 4)) === year && Number(s.slice(5, 7)) === month
  }

  const revenues = revRows
    .filter((r) => inMonth(r.installment_due))
    .map((r) => ({
      title: r.title,
      parcel: n(r.installments) > 1 ? `parcela ${r.installment_no}/${r.installments}` : null,
      client: r.client || null,
      project: r.project_title || null,
      amount: n(r.installment_amount),
      due: r.installment_due,
      status: r.installment_status === 'received' ? 'ok' : 'pending',
    }))
    .sort((a, b) => b.amount - a.amount)
  const revTotal = revenues.reduce((acc, r) => acc + r.amount, 0)
  for (const r of revenues) r.pct = pctOf(r.amount, revTotal)

  const expenses = expRows
    .filter((e) => inMonth(e.due_date))
    .map((e) => ({
      title: e.title,
      category: e.category_name || 'Sem categoria',
      project: e.project_title || null,
      amount: n(e.amount),
      due: e.due_date,
      status: e.status === 'paid' ? 'ok' : 'pending',
    }))
  const expTotal = expenses.reduce((acc, e) => acc + e.amount, 0)
  for (const e of expenses) e.pct = pctOf(e.amount, expTotal)

  const byCategory = new Map()
  for (const e of expenses) {
    if (!byCategory.has(e.category)) byCategory.set(e.category, [])
    byCategory.get(e.category).push(e)
  }
  const categories = [...byCategory.entries()]
    .map(([name, items]) => {
      const total = items.reduce((acc, e) => acc + e.amount, 0)
      return { name, total, pct: pctOf(total, expTotal), items: items.sort((a, b) => b.amount - a.amount) }
    })
    .sort((a, b) => b.total - a.total)

  const result = revTotal - expTotal
  return {
    revenues,
    categories,
    summary: {
      revenues: revTotal,
      expenses: expTotal,
      result,
      margin: revTotal > 0 ? `${pctOf(result, revTotal)}%` : '—',
    },
  }
}

export default function FinancialReport() {
  const [month, setMonth] = useState(currentMonth)
  const [year, setYear]   = useState(currentYear)

  const sig = `${month}|${year}`
  const [loaded, setLoaded]     = useState({ sig: null, data: null })
  const [details, setDetails]   = useState({ sig: null, exp: null, rev: null })
  const [projects, setProjects] = useState(null) // null = carregando
  const [company, setCompany]   = useState(null)

  useEffect(() => {
    let alive = true
    getFinancialDashboard({ month, year })
      .then(({ data }) => { if (alive) setLoaded({ sig: `${month}|${year}`, data }) })
      .catch(() => { if (alive) setLoaded({ sig: `${month}|${year}`, data: null }) })
    Promise.all([
      getExpenses({ month, year, limit: 500 }),
      getRevenues({ month, year, limit: 500 }),
    ])
      .then(([e, r]) => { if (alive) setDetails({ sig: `${month}|${year}`, exp: e.data.data || [], rev: r.data.data || [] }) })
      .catch(() => { if (alive) setDetails({ sig: `${month}|${year}`, exp: [], rev: [] }) })
    return () => { alive = false }
  }, [month, year])

  useEffect(() => {
    let alive = true
    getProjectFinancials()
      .then(({ data }) => { if (alive) setProjects(data.projects || []) })
      .catch(() => { if (alive) setProjects([]) })
    getMyCompany()
      .then(({ data }) => { if (alive) setCompany(data.company || null) })
      .catch(() => { if (alive) setCompany(null) })
    return () => { alive = false }
  }, [])

  const loading  = loaded.sig !== sig || details.sig !== sig
  const stats    = loaded.data?.stats || {}
  const cashflow = loaded.data?.cashflow || []
  const model    = !loading ? buildMonthModel(details.exp || [], details.rev || [], month, year) : null

  const resultMonth  = n(stats.revenue_month) - n(stats.expenses_month)
  const totalOverdue = n(stats.revenue_overdue) + n(stats.expenses_overdue)

  const kpis = [
    { icon: ArrowUpCircle,   label: 'Recebido no mês',  value: formatCurrency(n(stats.revenue_month)),   color: '#16a34a' },
    { icon: ArrowDownCircle, label: 'Pago no mês',      value: formatCurrency(n(stats.expenses_month)),  color: '#dc2626' },
    { icon: Scale,           label: 'Resultado do mês', value: formatCurrency(resultMonth),              color: resultMonth >= 0 ? '#16a34a' : '#dc2626' },
    { icon: Wallet,          label: 'A receber (mês)',  value: formatCurrency(n(stats.revenue_pending)), color: 'var(--text-primary)' },
    { icon: Hourglass,       label: 'A pagar (mês)',    value: formatCurrency(n(stats.expenses_pending)),color: 'var(--text-primary)' },
    { icon: AlertTriangle,   label: 'Em atraso (total)',value: formatCurrency(totalOverdue),             color: totalOverdue > 0 ? '#d97706' : 'var(--text-primary)' },
  ]

  const handlePrint = () => {
    if (!model) return
    printFinancialReport({ company, month, year, ...model })
  }

  const thStyle = { color: 'var(--text-muted)' }
  const tdStyle = { color: 'var(--text-primary)' }
  const statusChip = (ok) => (
    <span className="rounded-full px-2 py-0.5 text-[10px] font-bold"
      style={ok
        ? { background: 'rgba(22,163,74,0.10)', color: '#16a34a', border: '1px solid rgba(22,163,74,0.25)' }
        : { background: 'rgba(217,119,6,0.10)', color: '#d97706', border: '1px solid rgba(217,119,6,0.25)' }}>
      {ok ? 'Confirmado' : 'Pendente'}
    </span>
  )

  return (
    <div className="space-y-5">
      {/* ── Período + PDF ──────────────────────────────────────────────── */}
      <div className="card p-5">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="label">Mês</label>
            <select className="input" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {monthNamesLong.map((name, i) => (
                <option key={name} value={i + 1}>{name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Ano</label>
            <select className="input" value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="ml-auto">
            <button className="btn-secondary" onClick={handlePrint} disabled={loading}>
              <Printer size={15} /> Imprimir / PDF
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="card p-5">
          <div className="flex items-center justify-center py-12" style={{ color: 'var(--text-muted)' }}>
            <Loader2 size={20} className="animate-spin" />
          </div>
        </div>
      ) : (
        <>
          {/* ── KPIs do mês (valores realizados) ───────────────────────── */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            {kpis.map((k) => (
              <div key={k.label} className="card p-4 flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                  style={{ background: 'var(--bg-surface-2)', border: '1px solid var(--border-subtle)' }}>
                  <k.icon size={16} style={{ color: 'var(--text-primary)' }} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-base font-bold tabular-nums" style={{ color: k.color }}>{k.value}</p>
                  <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{k.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ── Detalhes do mês ─────────────────────────────────────────── */}
          <div className="card p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                  Detalhes de {monthNamesLong[month - 1]} de {year}
                </h3>
                <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                  Receitas e despesas com vencimento no mês (confirmadas e pendentes)
                </p>
              </div>
              <div className="flex items-center gap-4 text-sm font-semibold tabular-nums">
                <span style={{ color: '#16a34a' }}>{formatCurrency(model.summary.revenues)}</span>
                <span style={{ color: '#dc2626' }}>− {formatCurrency(model.summary.expenses)}</span>
                <span style={{ color: model.summary.result >= 0 ? '#16a34a' : '#dc2626' }}>
                  = {formatCurrency(model.summary.result)}
                </span>
                <span className="rounded-lg px-2 py-1 text-xs"
                  style={{ background: 'var(--bg-surface-2)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}>
                  Margem {model.summary.margin}
                </span>
              </div>
            </div>

            {/* Receitas detalhadas */}
            <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Receitas do mês
            </h4>
            {model.revenues.length === 0 ? (
              <p className="mb-5 text-sm" style={{ color: 'var(--text-muted)' }}>Nenhuma receita com vencimento neste mês</p>
            ) : (
              <div className="mb-6 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] font-semibold uppercase tracking-wider">
                      <th className="pb-2 pr-4" style={thStyle}>Receita</th>
                      <th className="pb-2 pr-4" style={thStyle}>Cliente / Projeto</th>
                      <th className="pb-2 pr-4" style={thStyle}>Vencimento</th>
                      <th className="pb-2 pr-4" style={thStyle}>Situação</th>
                      <th className="pb-2 pr-4 text-right" style={thStyle}>Valor</th>
                      <th className="pb-2 text-right" style={thStyle}>%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {model.revenues.map((r, i) => (
                      <tr key={i} className="border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                        <td className="py-2 pr-4 font-medium" style={tdStyle}>
                          {r.title}
                          {r.parcel && <span className="ml-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>({r.parcel})</span>}
                        </td>
                        <td className="py-2 pr-4" style={tdStyle}>{r.client || r.project || '—'}</td>
                        <td className="py-2 pr-4 tabular-nums" style={tdStyle}>{formatDate(r.due)}</td>
                        <td className="py-2 pr-4">{statusChip(r.status === 'ok')}</td>
                        <td className="py-2 pr-4 text-right font-semibold tabular-nums" style={tdStyle}>{formatCurrency(r.amount)}</td>
                        <td className="py-2 text-right tabular-nums" style={{ color: 'var(--text-muted)' }}>{r.pct}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Despesas por categoria */}
            <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Despesas do mês por categoria
            </h4>
            {model.categories.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Nenhuma despesa com vencimento neste mês</p>
            ) : (
              <div className="space-y-4">
                {model.categories.map((c) => (
                  <div key={c.name} className="overflow-hidden rounded-xl" style={{ border: '1px solid var(--border-subtle)' }}>
                    <div className="flex items-center justify-between px-3.5 py-2.5"
                      style={{ background: 'var(--bg-surface-2)' }}>
                      <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{c.name}</span>
                      <span className="text-xs font-semibold tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                        {formatCurrency(c.total)} · {c.pct}% das despesas
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <tbody>
                          {c.items.map((e, i) => (
                            <tr key={i} className="border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                              <td className="py-2 pl-3.5 pr-4 font-medium" style={tdStyle}>{e.title}</td>
                              <td className="py-2 pr-4" style={{ color: 'var(--text-muted)' }}>{e.project || 'Geral'}</td>
                              <td className="py-2 pr-4 tabular-nums" style={tdStyle}>{formatDate(e.due)}</td>
                              <td className="py-2 pr-4">{statusChip(e.status === 'ok')}</td>
                              <td className="py-2 pr-4 text-right font-semibold tabular-nums" style={tdStyle}>{formatCurrency(e.amount)}</td>
                              <td className="py-2 pr-3.5 text-right tabular-nums" style={{ color: 'var(--text-muted)' }}>{e.pct}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Fluxo de caixa do ano ───────────────────────────────────── */}
          <div className="card p-5">
            <h3 className="mb-4 text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
              Fluxo de caixa — {year}
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] font-semibold uppercase tracking-wider">
                    <th className="pb-2 pr-4" style={thStyle}>Mês</th>
                    <th className="pb-2 pr-4 text-right" style={thStyle}>Recebido</th>
                    <th className="pb-2 pr-4 text-right" style={thStyle}>Pago</th>
                    <th className="pb-2 text-right" style={thStyle}>Resultado</th>
                  </tr>
                </thead>
                <tbody>
                  {cashflow.map((m) => {
                    const profit = n(m.profit)
                    const isCurrent = Number(m.month) === month
                    return (
                      <tr key={m.month} className="border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                        <td className="py-2 pr-4 font-medium" style={tdStyle}>
                          {monthNames[Number(m.month) - 1]}
                          {isCurrent && <span className="ml-1.5 text-[10px]" style={{ color: 'var(--text-muted)' }}>●</span>}
                        </td>
                        <td className="py-2 pr-4 text-right tabular-nums" style={tdStyle}>{formatCurrency(n(m.revenues))}</td>
                        <td className="py-2 pr-4 text-right tabular-nums" style={tdStyle}>{formatCurrency(n(m.expenses))}</td>
                        <td className="py-2 text-right font-semibold tabular-nums"
                          style={{ color: profit > 0 ? '#16a34a' : profit < 0 ? '#dc2626' : 'var(--text-muted)' }}>
                          {formatCurrency(profit)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Resultado por projeto (histórico completo) ──────────────── */}
          <div className="card p-5">
            <h3 className="mb-1 text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
              Resultado por projeto
            </h3>
            <p className="mb-4 text-xs" style={{ color: 'var(--text-muted)' }}>
              Receitas recebidas e despesas pagas de todo o histórico, por projeto
            </p>
            {projects === null ? (
              <div className="flex items-center justify-center py-8" style={{ color: 'var(--text-muted)' }}>
                <Loader2 size={18} className="animate-spin" />
              </div>
            ) : projects.length === 0 ? (
              <p className="py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                Nenhum projeto encontrado
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] font-semibold uppercase tracking-wider">
                      <th className="pb-2 pr-4" style={thStyle}>Projeto</th>
                      <th className="pb-2 pr-4 text-right" style={thStyle}>Orçamento</th>
                      <th className="pb-2 pr-4 text-right" style={thStyle}>Receitas</th>
                      <th className="pb-2 pr-4 text-right" style={thStyle}>Custos</th>
                      <th className="pb-2 pr-4 text-right" style={thStyle}>Lucro</th>
                      <th className="pb-2 text-right" style={thStyle}>Margem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map((p) => {
                      const profit = n(p.profit)
                      return (
                        <tr key={p.id} className="border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                          <td className="max-w-[280px] truncate py-2 pr-4 font-medium" style={tdStyle}>{p.title}</td>
                          <td className="py-2 pr-4 text-right tabular-nums" style={tdStyle}>{formatCurrency(n(p.budget))}</td>
                          <td className="py-2 pr-4 text-right tabular-nums" style={tdStyle}>{formatCurrency(n(p.revenues))}</td>
                          <td className="py-2 pr-4 text-right tabular-nums" style={tdStyle}>{formatCurrency(n(p.costs))}</td>
                          <td className="py-2 pr-4 text-right font-semibold tabular-nums"
                            style={{ color: profit > 0 ? '#16a34a' : profit < 0 ? '#dc2626' : 'var(--text-muted)' }}>
                            {formatCurrency(profit)}
                          </td>
                          <td className="py-2 text-right tabular-nums" style={tdStyle}>{p.margin}%</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
