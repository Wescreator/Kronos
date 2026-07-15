import { useEffect, useState } from 'react'
import { Users, Loader2, ChevronDown, CheckCircle2 } from 'lucide-react'
import Avatar from '../ui/Avatar'
import { getTeamActivity, getTimeSummary } from '../../services/timeEntries.service'
import { formatDuration } from '../../utils/format'

/*
 * Container EXCLUSIVO do Dashboard Administrativo (ExecutiveDashboard).
 * NÃO deve ser montado no TeamDashboard (visão do colaborador).
 *
 * Mostra a distribuição do trabalho da equipe no período (semana/mês):
 * horas apontadas por membro, com um resumo de atividade (registros/tarefas).
 * Clicar num membro expande a lista das tarefas em que ele apontou horas no
 * período, com as horas de cada uma (GET /time-entries/summary?group_by=task
 * &user_id=…) — buscada sob demanda e cacheada por membro+período.
 * Consome GET /time-entries/team?period=week|month.
 */
const PERIODS = [
  { value: 'week',  label: 'Semana' },
  { value: 'month', label: 'Mês'    },
]

export default function TeamActivity() {
  const [period, setPeriod] = useState('week')

  // "loaded" guarda o período já carregado + os dados. loading é DERIVADO
  // (loaded.period !== period), evitando setState síncrono dentro do effect.
  const [loaded, setLoaded] = useState({ period: null, data: null })

  // Detalhe por membro: expandido + cache { 'userId|from|to': tasks[] }.
  const [expanded, setExpanded] = useState(null)
  const [details, setDetails]   = useState({})

  useEffect(() => {
    let alive = true
    getTeamActivity({ period })
      .then(({ data }) => { if (alive) setLoaded({ period, data }) })
      .catch(() => { if (alive) setLoaded({ period, data: null }) })
    return () => { alive = false }
  }, [period])

  const loading = loaded.period !== period
  const members = loaded.data?.members || []
  const from = loaded.data?.from
  const to   = loaded.data?.to
  const maxSeconds = members.reduce((m, x) => Math.max(m, x.total_seconds || 0), 0) || 1

  const detailKey = (userId) => `${userId}|${from}|${to}`

  const toggleMember = (userId) => {
    const willOpen = expanded !== userId
    setExpanded(willOpen ? userId : null)
    if (!willOpen) return

    const key = detailKey(userId)
    if (details[key]) return
    getTimeSummary({ group_by: 'task', user_id: userId, from, to })
      .then(({ data }) => setDetails((d) => ({ ...d, [key]: data.groups || [] })))
      .catch(() => setDetails((d) => ({ ...d, [key]: [] })))
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl"
            style={{ background: 'var(--bg-surface-2)', border: '1px solid var(--border-subtle)' }}
          >
            <Users size={16} style={{ color: 'var(--text-primary)' }} />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--text-muted)' }}>
              Equipe
            </p>
            <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
              Atividade da Equipe
            </h3>
          </div>
        </div>

        {/* Filtro Semana / Mês */}
        <div
          className="flex items-center gap-1 rounded-xl p-1"
          style={{ background: 'var(--bg-surface-2)', border: '1px solid var(--border-subtle)' }}
        >
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => { setPeriod(p.value); setExpanded(null) }}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
              style={period === p.value
                ? { background: 'var(--bg-surface)', color: 'var(--text-primary)', boxShadow: '0 1px 2px rgba(15,23,42,0.06)' }
                : { color: 'var(--text-muted)' }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10" style={{ color: 'var(--text-muted)' }}>
          <Loader2 size={18} className="animate-spin" />
        </div>
      ) : members.length === 0 ? (
        <p className="py-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
          Nenhuma hora apontada pela equipe {period === 'week' ? 'nesta semana' : 'neste mês'}
        </p>
      ) : (
        <div className="space-y-2 overflow-y-auto pr-1" style={{ maxHeight: 320 }}>
          {members.map((m) => {
            const isOpen = expanded === m.user_id
            const tasks  = details[detailKey(m.user_id)]
            return (
              <div key={m.user_id} className="rounded-xl transition-colors"
                style={isOpen ? { background: 'var(--bg-surface-2)', border: '1px solid var(--border-subtle)' } : { border: '1px solid transparent' }}>
                {/* Linha do membro (clicável — expande o detalhe) */}
                <button
                  onClick={() => toggleMember(m.user_id)}
                  className="flex w-full items-center gap-3 rounded-xl p-2 text-left"
                  title={isOpen ? 'Recolher detalhes' : 'Ver tarefas do período'}
                >
                  <Avatar name={m.name} src={m.avatar_url} size="sm" />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="flex min-w-0 items-center gap-1.5">
                        <span className="truncate text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                          {m.name || '—'}
                        </span>
                        <ChevronDown size={14} className="shrink-0 transition-transform duration-150"
                          style={{ color: 'var(--text-muted)', transform: isOpen ? 'rotate(180deg)' : 'none' }} />
                      </span>
                      <span className="ml-3 shrink-0 text-sm font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                        {formatDuration(m.total_seconds)}
                      </span>
                    </div>

                    {/* Barra proporcional ao maior total da equipe */}
                    <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: 'var(--bg-surface-2)' }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.round(((m.total_seconds || 0) / maxSeconds) * 100)}%`,
                          background: 'var(--brand-slate)',
                        }}
                      />
                    </div>

                    <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {m.entries_count} {m.entries_count === 1 ? 'registro' : 'registros'}
                      {' · '}
                      {m.tasks_count} {m.tasks_count === 1 ? 'tarefa' : 'tarefas'}
                    </p>
                  </div>
                </button>

                {/* Detalhe: tarefas em que o membro apontou horas no período */}
                {isOpen && (
                  <div className="px-2 pb-2 pl-12">
                    {!tasks ? (
                      <div className="flex items-center gap-2 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                        <Loader2 size={13} className="animate-spin" /> Carregando tarefas…
                      </div>
                    ) : tasks.length === 0 ? (
                      <p className="py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                        Nenhuma tarefa encontrada no período
                      </p>
                    ) : (
                      <div className="divide-y rounded-lg" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderColor: 'var(--border-subtle)' }}>
                        {tasks.map((t) => (
                          <div key={t.key} className="flex items-center gap-2.5 px-3 py-2" style={{ borderColor: 'var(--border-subtle)' }}>
                            <div className="min-w-0 flex-1">
                              <p className="flex items-center gap-1.5 truncate text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                                <span className="truncate">{t.label}</span>
                                {t.status === 'completed' && (
                                  <span className="flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                                    style={{ background: 'rgba(22,163,74,0.10)', color: '#16a34a', border: '1px solid rgba(22,163,74,0.25)' }}>
                                    <CheckCircle2 size={10} /> Concluída
                                  </span>
                                )}
                              </p>
                              <p className="mt-0.5 truncate text-[11px]" style={{ color: 'var(--text-muted)' }}>
                                {t.project || 'Sem projeto'}
                                {' · '}
                                {t.entries_count} {t.entries_count === 1 ? 'registro' : 'registros'}
                              </p>
                            </div>
                            <span className="shrink-0 text-xs font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                              {formatDuration(t.total_seconds)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
