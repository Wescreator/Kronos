const prisma = require('../config/prisma')
const AppError = require('../utils/AppError')
const { paginate, paginatedResponse } = require('../utils/pagination')

// ─────────────────────────────────────────────────────────────────────
// Apontamento de horas (time tracking).
//
// Isolamento multi-tenant: todas as leituras/escritas usam o Prisma tenant
// model `TimeEntry` (companyId é injetado automaticamente pela extensão em
// src/config/prisma.js). Por isso usamos APENAS findFirst/findMany/create/
// updateMany/deleteMany/count — nunca findUnique/update/delete (bloqueados
// na extensão por não serem escopáveis).
//
// Regra central: a Task nunca guarda tempo. O total é a soma de
// durationSeconds dos registros. O cronômetro nunca altera status/conclusão
// da tarefa.
// ─────────────────────────────────────────────────────────────────────

// `include` reutilizado para devolver o registro com contexto de tarefa/projeto.
const ENTRY_INCLUDE = {
  task:    { select: { id: true, title: true } },
  project: { select: { id: true, title: true } },
  user:    { select: { id: true, name: true, avatarUrl: true } },
}

// ─── Helpers de fuso (America/Sao_Paulo) ──────────────────────────────
// workDate já é gravado no dia-calendário de SP (default da coluna). Para
// filtrar/agrupar por período comparamos contra workDate usando datas em
// UTC-midnight do MESMO dia-calendário — consistente com o que o Postgres
// devolve para uma coluna DATE.
function spTodayISO() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date()) // 'YYYY-MM-DD'
}

function isoToDate(iso) {
  return new Date(`${iso}T00:00:00.000Z`)
}

// Intervalo do período do dashboard admin: semana (a partir de segunda-feira)
// ou mês (a partir do dia 1), sempre até hoje, no fuso de SP.
function periodRange(period) {
  const todayISO = spTodayISO()
  const [y, m] = todayISO.split('-').map(Number)

  if (period === 'month') {
    const startISO = `${y}-${String(m).padStart(2, '0')}-01`
    return { start: isoToDate(startISO), end: isoToDate(todayISO), fromISO: startISO, toISO: todayISO }
  }

  // week: recua até a segunda-feira da semana corrente.
  const today = isoToDate(todayISO)
  const dow = today.getUTCDay() // 0=domingo … 6=sábado
  const back = dow === 0 ? 6 : dow - 1
  const start = new Date(today.getTime() - back * 86400000)
  return { start, end: today, fromISO: start.toISOString().slice(0, 10), toISO: todayISO }
}

// Chave ISO de semana (ano-Wnn) a partir de uma data — usada no agrupamento.
function isoWeekKey(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const day = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

// ─── Timer ────────────────────────────────────────────────────────────

// Timer ativo do usuário (endedAt IS NULL) ou null.
const getActive = async (userId) => {
  return prisma.timeEntry.findFirst({
    where: { userId, endedAt: null },
    include: ENTRY_INCLUDE,
  })
}

// Inicia um cronômetro. Recusa se já houver timer ativo (checagem amigável +
// índice único parcial no banco como garantia contra corrida entre abas).
const start = async (userId, taskId) => {
  const task = await prisma.task.findFirst({ where: { id: taskId } })
  if (!task) throw new AppError(404, 'Tarefa não encontrada')

  const active = await prisma.timeEntry.findFirst({
    where: { userId, endedAt: null },
  })
  if (active) {
    throw new AppError(409, 'Você já possui um timer ativo. Encerre-o antes de iniciar outro.')
  }

  try {
    return await prisma.timeEntry.create({
      data: {
        taskId:    task.id,
        projectId: task.projectId ?? null, // derivado da tarefa (pode ser nulo)
        userId,
      },
      include: ENTRY_INCLUDE,
    })
  } catch (err) {
    // Colisão no índice único parcial: outra aba iniciou no mesmo instante.
    if (err.code === 'P2002') {
      throw new AppError(409, 'Você já possui um timer ativo.')
    }
    throw err
  }
}

// Encerra o timer ativo do usuário, gravando endedAt + durationSeconds.
const stop = async (userId) => {
  const active = await prisma.timeEntry.findFirst({
    where: { userId, endedAt: null },
  })
  if (!active) throw new AppError(404, 'Nenhum timer ativo encontrado')

  const endedAt = new Date()
  const seconds = Math.max(
    0,
    Math.floor((endedAt.getTime() - new Date(active.startedAt).getTime()) / 1000)
  )

  await prisma.timeEntry.updateMany({
    where: { id: active.id, endedAt: null },
    data:  { endedAt, durationSeconds: seconds },
  })

  return prisma.timeEntry.findFirst({
    where: { id: active.id },
    include: ENTRY_INCLUDE,
  })
}

// Descarta um timer AINDA em andamento (não é editar histórico: nada foi
// consolidado). Registros já encerrados são imutáveis e não podem ser apagados.
const discard = async (userId) => {
  const res = await prisma.timeEntry.deleteMany({
    where: { userId, endedAt: null },
  })
  if (res.count === 0) throw new AppError(404, 'Nenhum timer ativo para descartar')
  return { discarded: res.count }
}

// ─── Histórico da Task (total + registros + quebras por usuário/dia) ──
const getByTask = async (taskId) => {
  const task = await prisma.task.findFirst({ where: { id: taskId } })
  if (!task) throw new AppError(404, 'Tarefa não encontrada')

  const entries = await prisma.timeEntry.findMany({
    where: { taskId },
    include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    orderBy: { startedAt: 'desc' },
  })

  const totalSeconds = entries.reduce((acc, e) => acc + (e.durationSeconds || 0), 0)

  // Quebra por usuário.
  const byUserMap = new Map()
  for (const e of entries) {
    const cur = byUserMap.get(e.userId) || {
      user_id: e.userId, name: e.user?.name, avatar_url: e.user?.avatarUrl,
      total_seconds: 0, entries_count: 0,
    }
    cur.total_seconds += e.durationSeconds || 0
    cur.entries_count += 1
    byUserMap.set(e.userId, cur)
  }

  // Quebra por dia (workDate).
  const byDayMap = new Map()
  for (const e of entries) {
    const day = e.workDate ? new Date(e.workDate).toISOString().slice(0, 10) : null
    if (!day) continue
    const cur = byDayMap.get(day) || { day, total_seconds: 0, entries_count: 0 }
    cur.total_seconds += e.durationSeconds || 0
    cur.entries_count += 1
    byDayMap.set(day, cur)
  }

  return {
    task_id: taskId,
    total_seconds: totalSeconds,
    entries,
    by_user: Array.from(byUserMap.values()).sort((a, b) => b.total_seconds - a.total_seconds),
    by_day:  Array.from(byDayMap.values()).sort((a, b) => (a.day < b.day ? 1 : -1)),
  }
}

// ─── Listagem paginada com filtros ────────────────────────────────────
const buildRangeWhere = (query) => {
  const where = {}
  if (query.task_id)    where.taskId = query.task_id
  if (query.user_id)    where.userId = query.user_id
  if (query.project_id) where.projectId = query.project_id
  if (query.from || query.to) {
    where.workDate = {}
    if (query.from) where.workDate.gte = isoToDate(query.from)
    if (query.to)   where.workDate.lte = isoToDate(query.to)
  }
  return where
}

const list = async (query) => {
  const { page, limit, offset } = paginate(query)
  const where = buildRangeWhere(query)

  const [rows, total] = await Promise.all([
    prisma.timeEntry.findMany({
      where,
      include: ENTRY_INCLUDE,
      orderBy: { startedAt: 'desc' },
      skip: offset,
      take: limit,
    }),
    prisma.timeEntry.count({ where }),
  ])

  return paginatedResponse(rows, total, page, limit)
}

// ─── Relatórios agregados (dia/semana/mês/projeto/tarefa/usuário) ─────
// Busca os registros encerrados no filtro e agrega em memória. Para o volume
// de um escritório de projetos é suficiente; se crescer muito, migrar para
// agregação no banco (groupBy/date_trunc) é a otimização natural.
const VALID_GROUPS = new Set(['day', 'week', 'month', 'project', 'task', 'user'])

const summary = async (query) => {
  const groupBy = query.group_by || 'day'
  if (!VALID_GROUPS.has(groupBy)) {
    throw new AppError(400, `group_by inválido. Use: ${Array.from(VALID_GROUPS).join(', ')}`)
  }

  const where = { ...buildRangeWhere(query), endedAt: { not: null } }

  const rows = await prisma.timeEntry.findMany({
    where,
    include: {
      task:    { select: { id: true, title: true, status: true } },
      project: { select: { id: true, title: true } },
      user:    { select: { id: true, name: true } },
    },
  })

  const groups = new Map()
  for (const e of rows) {
    let key, label
    const day = e.workDate ? new Date(e.workDate) : null
    switch (groupBy) {
      case 'day':
        key = day ? day.toISOString().slice(0, 10) : 'sem-data'; label = key; break
      case 'week':
        key = day ? isoWeekKey(day) : 'sem-data'; label = key; break
      case 'month':
        key = day ? day.toISOString().slice(0, 7) : 'sem-data'; label = key; break
      case 'project':
        key = e.projectId || 'sem-projeto'; label = e.project?.title || 'Sem projeto'; break
      case 'task':
        key = e.taskId; label = e.task?.title || '—'; break
      case 'user':
        key = e.userId; label = e.user?.name || '—'; break
    }
    const cur = groups.get(key) || { key, label, total_seconds: 0, entries_count: 0 }
    cur.total_seconds += e.durationSeconds || 0
    cur.entries_count += 1
    // No agrupamento por tarefa expomos status e projeto — o detalhe por
    // membro na Atividade da Equipe marca as concluídas e dá contexto.
    if (groupBy === 'task') {
      cur.status  = e.task?.status || cur.status || null
      cur.project = e.project?.title || cur.project || null
    }
    groups.set(key, cur)
  }

  return {
    group_by: groupBy,
    groups: Array.from(groups.values()).sort((a, b) => b.total_seconds - a.total_seconds),
  }
}

// ─── Atividade da equipe (Dashboard Admin: semana/mês, por membro) ────
const team = async (query) => {
  const period = query.period === 'month' ? 'month' : 'week'
  const { start: from, end: to, fromISO, toISO } = periodRange(period)

  const rows = await prisma.timeEntry.findMany({
    where: { endedAt: { not: null }, workDate: { gte: from, lte: to } },
    include: {
      user: { select: { id: true, name: true, avatarUrl: true } },
      task: { select: { id: true } },
    },
  })

  const members = new Map()
  for (const e of rows) {
    const cur = members.get(e.userId) || {
      user_id: e.userId, name: e.user?.name, avatar_url: e.user?.avatarUrl,
      total_seconds: 0, entries_count: 0, tasks: new Set(),
    }
    cur.total_seconds += e.durationSeconds || 0
    cur.entries_count += 1
    if (e.taskId) cur.tasks.add(e.taskId)
    members.set(e.userId, cur)
  }

  return {
    period,
    from: fromISO,
    to: toISO,
    members: Array.from(members.values())
      .map(m => ({
        user_id: m.user_id,
        name: m.name,
        avatar_url: m.avatar_url,
        total_seconds: m.total_seconds,
        entries_count: m.entries_count,
        tasks_count: m.tasks.size,
      }))
      .sort((a, b) => b.total_seconds - a.total_seconds),
  }
}

module.exports = {
  getActive, start, stop, discard,
  getByTask, list, summary, team,
}
