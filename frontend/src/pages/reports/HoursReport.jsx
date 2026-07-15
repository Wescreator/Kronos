import { useEffect, useState } from 'react'
import { Clock, FileText, Layers, Loader2 } from 'lucide-react'
import { getTimeSummary } from '../../services/timeEntries.service'
import { formatDuration } from '../../utils/format'

/*
 * Relatório de Horas — primeiro tipo de relatório do módulo de Relatórios.
 *
 * Agrupa os apontamentos (GET /time-entries/summary) por dia, semana, mês,
 * projeto, tarefa ou usuário, dentro de um período. Reaproveita a estrutura
 * já existente (Task → Project) — não duplica dados.
 */

const GROUP_OPTIONS = [
  { value: 'day',     label: 'Dia' },
  { value: 'week',    label: 'Semana' },
  { value: 'month',   label: 'Mês' },
  { value: 'project', label: 'Projeto' },
  { value: 'task',    label: 'Tarefa' },
  { value: 'user',    label: 'Usuário' },
]

const PERIOD_OPTIONS = [
  { value: 'week',   label: 'Esta semana' },
  { value: 'month',  label: 'Este mês' },
  { value: '30d',    label: 'Últimos 30 dias' },
  { value: 'all',    label: 'Tudo' },
  { value: 'custom', label: 'Personalizado' },
]

// Data local em YYYY-MM-DD (evita o deslocamento de fuso do toISOString UTC).
const isoLocal = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

function computeRange(preset) {
  const today = new Date()
  if (preset === 'week') {
    const d = new Date(today)
    const dow = (d.getDay() + 6) % 7 // 0 = segunda
    d.setDate(d.getDate() - dow)
    return { from: isoLocal(d), to: isoLocal(today) }
  }
  if (preset === 'month') {
    return { from: isoLocal(new Date(today.getFullYear(), today.getMonth(), 1)), to: isoLocal(today) }
  }
  if (preset === '30d') {
    const d = new Date(today)
    d.setDate(d.getDate() - 29)
    return { from: isoLocal(d), to: isoLocal(today) }
  }
  return { from: '', to: '' } // 'all'
}

export default function HoursReport() {
  const [groupBy, setGroupBy]       = useState('user')
  const [preset, setPreset]         = useState('month')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo]     = useState('')

  const range = preset === 'custom' ? { from: customFrom, to: customTo } : computeRange(preset)
  const from = range.from
  const to   = range.to
  const sig  = `${groupBy}|${from}|${to}`

  // loaded.sig !== sig => carregando (loading derivado, sem setState síncrono
  // dentro do effect — regra react-hooks/set-state-in-effect).
  const [loaded, setLoaded] = useState({ sig: null, data: null })

  useEffect(() => {
    let alive = true
    const params = { group_by: groupBy }
    if (from) params.from = from
    if (to)   params.to = to
    getTimeSummary(params)
      .then(({ data }) => { if (alive) setLoaded({ sig: `${groupBy}|${from}|${to}`, data }) })
      .catch(() => { if (alive) setLoaded({ sig: `${groupBy}|${from}|${to}`, data: null }) })
    return () => { alive = false }
  }, [groupBy, from, to])

  const loading = loaded.sig !== sig
  const groups  = loaded.data?.groups || []
  const maxSeconds  = groups.reduce((m, g) => Math.max(m, g.total_seconds || 0), 0) || 1
  const totalSeconds = groups.reduce((acc, g) => acc + (g.total_seconds || 0), 0)
  const totalEntries = groups.reduce((acc, g) => acc + (g.entries_count || 0), 0)

  const chipStyle = (active) => (active
    ? { background: 'var(--brand-slate)', color: 'var(--text-onbrand)', border: '1px solid var(--brand-slate)' }
    : { background: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' })

  return (
    <div className="space-y-5">
      {/* ── Filtros ────────────────────────────────────────────────────── */}
      <div className="card p-5 space-y-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
            Agrupar por
          </p>
          <div className="flex flex-wrap gap-2">
            {GROUP_OPTIONS.map((g) => (
              <button key={g.value} onClick={() => setGroupBy(g.value)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150"
                style={chipStyle(groupBy === g.value)}>
                {g.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
            Período
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {PERIOD_OPTIONS.map((p) => (
              <button key={p.value} onClick={() => setPreset(p.value)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150"
                style={chipStyle(preset === p.value)}>
                {p.label}
              </button>
            ))}
            {preset === 'custom' && (
              <div className="flex items-center gap-2 ml-1">
                <input type="date" className="input py-2 text-sm" value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)} />
                <span style={{ color: 'var(--text-muted)' }}>até</span>
                <input type="date" className="input py-2 text-sm" value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Resumo ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: Clock,    label: 'Total de horas', value: formatDuration(totalSeconds) },
          { icon: FileText, label: 'Registros',      value: totalEntries },
          { icon: Layers,   label: 'Grupos',         value: groups.length },
        ].map((s) => (
          <div key={s.label} className="card p-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl shrink-0"
              style={{ background: 'var(--bg-surface-2)', border: '1px solid var(--border-subtle)' }}>
              <s.icon size={16} style={{ color: 'var(--text-primary)' }} />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-bold truncate tabular-nums" style={{ color: 'var(--text-primary)' }}>{s.value}</p>
              <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Tabela ─────────────────────────────────────────────────────── */}
      <div className="card p-5">
        {loading ? (
          <div className="flex items-center justify-center py-12" style={{ color: 'var(--text-muted)' }}>
            <Loader2 size={20} className="animate-spin" />
          </div>
        ) : groups.length === 0 ? (
          <p className="py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
            Nenhum apontamento no período selecionado
          </p>
        ) : (
          <div className="space-y-2.5">
            {groups.map((g) => (
              <div key={g.key} className="flex items-center gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="truncate text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {g.label}
                    </span>
                    <span className="ml-3 shrink-0 text-sm font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                      {formatDuration(g.total_seconds)}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: 'var(--bg-surface-2)' }}>
                    <div className="h-full rounded-full"
                      style={{ width: `${Math.round(((g.total_seconds || 0) / maxSeconds) * 100)}%`, background: 'var(--brand-slate)' }} />
                  </div>
                  <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                    {g.entries_count} {g.entries_count === 1 ? 'registro' : 'registros'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
