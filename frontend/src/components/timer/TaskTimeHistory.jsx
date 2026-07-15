import { useEffect, useState } from 'react'
import { Clock, Loader2 } from 'lucide-react'
import Avatar from '../ui/Avatar'
import useTimerStore from '../../store/timerStore'
import { getTaskTime } from '../../services/timeEntries.service'
import { formatDuration, formatDate, formatDateTime } from '../../utils/format'

/*
 * Bloco de apontamento de horas na página da tarefa.
 *
 * Mostra o TOTAL acumulado (soma dos registros) e o histórico — cada registro
 * com usuário, dia, horário e duração. O total nunca fica na Task: é derivado
 * dos registros (GET /time-entries/task/:taskId).
 *
 * Re-busca quando o timer global inicia/encerra (activeEntry muda), assim um
 * apontamento feito com esta página aberta aparece sem recarregar.
 */
export default function TaskTimeHistory({ taskId }) {
  const activeEntry = useTimerStore((s) => s.activeEntry)

  // Guardamos o taskId já carregado junto com o resultado: o "loading" é
  // DERIVADO (loaded !== taskId), evitando setState síncrono dentro do effect
  // (regra react-hooks/set-state-in-effect). Só chamamos setState em callbacks.
  const [state, setState] = useState({ taskId: null, data: null })

  useEffect(() => {
    if (!taskId) return
    let alive = true
    getTaskTime(taskId)
      .then(({ data }) => { if (alive) setState({ taskId, data }) })
      .catch(() => { if (alive) setState({ taskId, data: null }) })
    return () => { alive = false }
    // activeEntry?.id muda ao iniciar/encerrar um timer — refaz a busca.
  }, [taskId, activeEntry?.id])

  const loading = state.taskId !== taskId
  const total   = state.data?.total_seconds || 0
  const entries = state.data?.entries || []

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          Apontamento de Horas
        </h3>
        <span
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-sm font-bold tabular-nums"
          style={{ background: 'var(--bg-surface-2)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
        >
          <Clock size={13} style={{ color: 'var(--text-muted)' }} />
          {formatDuration(total)}
        </span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8" style={{ color: 'var(--text-muted)' }}>
          <Loader2 size={18} className="animate-spin" />
        </div>
      ) : entries.length === 0 ? (
        <p className="py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
          Nenhum tempo apontado nesta tarefa ainda
        </p>
      ) : (
        <div className="space-y-2.5">
          {entries.map((e) => (
            <div
              key={e.id}
              className="flex items-center gap-3 rounded-2xl p-3"
              style={{ background: 'var(--bg-surface-2)', border: '1px solid var(--border-subtle)' }}
            >
              <Avatar name={e.user?.name} src={e.user?.avatarUrl} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {e.user?.name || '—'}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {e.endedAt ? formatDateTime(e.startedAt) : `${formatDate(e.workDate)} · em andamento`}
                </p>
              </div>
              <span
                className="shrink-0 text-sm font-semibold tabular-nums"
                style={{ color: e.endedAt ? 'var(--text-primary)' : 'var(--text-muted)' }}
              >
                {e.endedAt ? formatDuration(e.durationSeconds) : '—'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
