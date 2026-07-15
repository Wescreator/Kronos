import { useEffect, useState } from 'react'
import useTimerStore from '../store/timerStore'

/**
 * Hook do cronômetro de apontamento de horas.
 *
 * Expõe o timer ativo (do store global) + o tempo corrido em segundos,
 * atualizado a cada 1s enquanto houver timer rodando. O tempo é sempre
 * derivado de `startedAt` do backend (não de um contador acumulado no
 * cliente) — assim recarregar a página ou trocar de aba não perde nem
 * distorce a contagem.
 *
 * @returns {{
 *   activeEntry: object|null,
 *   isRunning: boolean,
 *   elapsedSeconds: number,
 *   loading: boolean,
 *   ready: boolean,
 *   fetchActive: function,
 *   start: function,
 *   stop: function,
 *   discard: function,
 * }}
 */
export default function useTimer() {
  const activeEntry = useTimerStore((s) => s.activeEntry)
  const loading     = useTimerStore((s) => s.loading)
  const ready       = useTimerStore((s) => s.ready)
  const fetchActive = useTimerStore((s) => s.fetchActive)
  const start       = useTimerStore((s) => s.start)
  const stop        = useTimerStore((s) => s.stop)
  const discard     = useTimerStore((s) => s.discard)

  // `now` avança de 1 em 1s apenas dentro do callback do intervalo (o único
  // lugar onde setState é permitido num effect). O tempo corrido é DERIVADO
  // no render a partir de startedAt — assim o valor inicial já sai correto,
  // sem esperar o primeiro segundo e sem setState síncrono no effect.
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (!activeEntry?.startedAt) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [activeEntry?.id, activeEntry?.startedAt])

  const elapsedSeconds = activeEntry?.startedAt
    ? Math.max(0, Math.floor((now - new Date(activeEntry.startedAt).getTime()) / 1000))
    : 0

  return {
    activeEntry,
    isRunning: !!activeEntry,
    elapsedSeconds,
    loading,
    ready,
    fetchActive,
    start,
    stop,
    discard,
  }
}
