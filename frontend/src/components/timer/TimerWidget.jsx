import { useEffect, useRef, useState } from 'react'
import { Timer, Play, Square, Trash2, Search, Loader2, FolderKanban } from 'lucide-react'
import { toast } from 'react-hot-toast'
import useTimer from '../../hooks/useTimer'
import useIdempotencyKey from '../../hooks/useIdempotencyKey'
import { getTasks } from '../../services/tasks.service'
import { formatClock, formatDuration } from '../../utils/format'

/*
 * Botão discreto do cronômetro na Topbar (apontamento de horas).
 *
 * Sem timer ativo → ícone; ao clicar, abre um seletor de tarefa e inicia.
 * Com timer ativo → mostra o tempo correndo; ao clicar, permite Encerrar
 * (grava o registro) ou Descartar (o timer em andamento não vira registro).
 * Encerrar NUNCA conclui a tarefa — a conclusão continua manual.
 *
 * Só pode haver um timer ativo por usuário: o backend devolve 409 se já
 * houver — aqui isso vira um toast, sem iniciar um segundo registro.
 */
export default function TimerWidget() {
  const {
    activeEntry, isRunning, elapsedSeconds, loading,
    fetchActive, start, stop, discard,
  } = useTimer()

  const [open, setOpen]                 = useState(false)
  const [tasks, setTasks]               = useState([])
  const [loadingTasks, setLoadingTasks] = useState(false)
  const [search, setSearch]             = useState('')
  const ref = useRef(null)

  // Chave de idempotência por "intenção de iniciar" (enquanto o seletor está
  // aberto sem timer ativo) — protege contra duplo clique no start.
  const [idemKey, renewIdemKey] = useIdempotencyKey(open && !isRunning)

  // Restaura o timer ativo ao montar (sobrevive a reload / troca de página).
  useEffect(() => { fetchActive() }, [fetchActive])

  // Fecha o dropdown ao clicar fora.
  useEffect(() => {
    if (!open) return
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  // Carrega as tarefas disponíveis para iniciar o cronômetro.
  const loadTasks = () => {
    setLoadingTasks(true)
    getTasks({ limit: 50 })
      .then(({ data }) => {
        const list = (data.data || []).filter(
          (t) => !['completed', 'cancelled'].includes(t.status)
        )
        setTasks(list)
      })
      .catch(() => setTasks([]))
      .finally(() => setLoadingTasks(false))
  }

  // Abre/fecha o dropdown; ao abrir sem timer ativo, busca as tarefas (fica
  // no handler de evento, não num effect, para não disparar setState síncrono
  // dentro de useEffect).
  const toggleOpen = () => {
    const next = !open
    setOpen(next)
    if (next && !isRunning) loadTasks()
  }

  const handleStart = async (taskId) => {
    try {
      await start(taskId, idemKey)
      renewIdemKey()
      setOpen(false)
      setSearch('')
      toast.success('Timer iniciado')
    } catch (err) {
      // 409 = já existe timer ativo; refaz o fetch para refletir o estado real.
      if (err.response?.status === 409) fetchActive()
      toast.error(err.response?.data?.message || 'Erro ao iniciar o timer')
    }
  }

  const handleStop = async () => {
    try {
      const entry = await stop()
      setOpen(false)
      toast.success(`Apontamento salvo: ${formatDuration(entry?.durationSeconds)}`)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erro ao encerrar o timer')
    }
  }

  const handleDiscard = async () => {
    try {
      await discard()
      setOpen(false)
      toast.success('Timer descartado')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erro ao descartar o timer')
    }
  }

  const filtered = search
    ? tasks.filter((t) => t.title.toLowerCase().includes(search.toLowerCase()))
    : tasks

  return (
    <div className="relative" ref={ref}>
      {/* ── Botão ────────────────────────────────────────────────────── */}
      <button
        onClick={toggleOpen}
        title={isRunning ? `Cronômetro: ${activeEntry?.task?.title || 'tarefa'}` : 'Apontar horas'}
        className={`
          flex items-center gap-2 rounded-xl
          transition-all duration-200
          ${isRunning
            ? 'h-9 px-3 bg-hover text-primary ring-1 ring-line-strong'
            : 'h-9 w-9 justify-center text-secondary hover:bg-hover hover:text-primary'
          }
        `}
      >
        {isRunning ? (
          <>
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="text-sm font-semibold tabular-nums">
              {formatClock(elapsedSeconds)}
            </span>
          </>
        ) : (
          <Timer size={18} />
        )}
      </button>

      {/* ── Dropdown ─────────────────────────────────────────────────── */}
      {open && (
        <div
          className="
            absolute right-0 top-12 z-50
            w-[340px] overflow-hidden rounded-3xl
            border border-line bg-surface backdrop-blur-xl
            shadow-[0_20px_50px_rgba(15,23,42,0.12)]
          "
        >
          {isRunning ? (
            /* ── Painel do timer ativo ── */
            <div className="p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted mb-3">
                Cronômetro em andamento
              </p>

              <div className="rounded-2xl border border-line bg-surface-2 p-4 mb-4">
                <p className="text-sm font-semibold text-primary truncate">
                  {activeEntry?.task?.title || 'Tarefa'}
                </p>
                {activeEntry?.project?.title && (
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                    <FolderKanban size={12} /> {activeEntry.project.title}
                  </p>
                )}
                <p className="mt-3 text-2xl font-bold tabular-nums text-primary">
                  {formatClock(elapsedSeconds)}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleStop}
                  disabled={loading}
                  className="
                    flex flex-1 items-center justify-center gap-2 rounded-xl
                    px-3 py-2.5 text-sm font-semibold
                    bg-emerald-500/10 text-emerald-500 border border-emerald-500/20
                    transition-colors hover:bg-emerald-500/20
                    disabled:opacity-60
                  "
                >
                  <Square size={14} /> Encerrar
                </button>
                <button
                  onClick={handleDiscard}
                  disabled={loading}
                  title="Descartar (não salva o apontamento)"
                  className="
                    flex items-center justify-center rounded-xl
                    px-3 py-2.5 text-sm font-medium
                    text-secondary border border-line
                    transition-colors hover:bg-hover hover:text-danger
                    disabled:opacity-60
                  "
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <p className="mt-3 text-[11px] leading-snug text-muted">
                Encerrar salva o tempo; não altera o status da tarefa.
              </p>
            </div>
          ) : (
            /* ── Seletor de tarefa ── */
            <div className="p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted mb-3">
                Iniciar cronômetro em…
              </p>

              <div className="relative mb-3">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar tarefa…"
                  className="
                    w-full rounded-xl border border-line bg-surface-2
                    py-2 pl-9 pr-3 text-sm text-primary
                    placeholder:text-muted
                    focus:outline-none focus:ring-1 focus:ring-line-strong
                  "
                />
              </div>

              <div className="max-h-[280px] overflow-y-auto -mx-1 px-1">
                {loadingTasks ? (
                  <div className="flex items-center justify-center py-8 text-muted">
                    <Loader2 size={18} className="animate-spin" />
                  </div>
                ) : filtered.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted">
                    Nenhuma tarefa disponível
                  </p>
                ) : (
                  filtered.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => handleStart(t.id)}
                      disabled={loading}
                      className="
                        group flex w-full items-center gap-3 rounded-xl
                        px-3 py-2.5 text-left
                        transition-colors hover:bg-hover
                        disabled:opacity-60
                      "
                    >
                      <span className="
                        flex h-7 w-7 shrink-0 items-center justify-center rounded-lg
                        bg-surface-2 text-muted
                        group-hover:bg-emerald-500/10 group-hover:text-emerald-500
                      ">
                        <Play size={13} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-primary">
                          {t.title}
                        </span>
                        {t.project_title && (
                          <span className="block truncate text-xs text-muted">
                            {t.project_title}
                          </span>
                        )}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
