import api from './api'

// Chave de idempotência opcional no start — ver hooks/useIdempotencyKey.
const idem = (key) => (key ? { idempotencyKey: key } : {})

// ─── Timer ────────────────────────────────────────────────────────────
export const getActiveTimer = ()          => api.get('/time-entries/active')
export const startTimer     = (taskId, k) => api.post('/time-entries/start', { task_id: taskId }, idem(k))
export const stopTimer      = ()          => api.post('/time-entries/stop')
export const discardTimer   = ()          => api.delete('/time-entries/active')

// ─── Histórico / relatórios ───────────────────────────────────────────
export const getTaskTime     = (taskId)   => api.get(`/time-entries/task/${taskId}`)
export const getTimeEntries  = (params)   => api.get('/time-entries', { params })
export const getTimeSummary  = (params)   => api.get('/time-entries/summary', { params })
export const getTeamActivity = (params)   => api.get('/time-entries/team', { params })
