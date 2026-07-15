/**
 * Seed: dados de demonstração realistas (ambiente LOCAL)
 *
 * Popula a empresa "Kronos Dev" com um dataset completo para testes:
 *   - 15 clientes (CRM) vinculados a 15 projetos (6 deles com etapas/fases)
 *   - 15 tarefas divididas entre os projetos
 *   - 12 receitas parceladas (recebidas até hoje; pendentes até dezembro)
 *   - 16 despesas em 5 categorias (pagas até hoje, incl. ocorrências recorrentes)
 *   - 8 eventos na agenda, 6 propostas, 4 relatórios de projeto preenchidos
 *   - 40 apontamentos de horas nos últimos 30 dias (INSERT direto — a API de
 *     time entries é imutável/server-authoritative e não retroage datas)
 *
 * Tudo (exceto time_entries) passa pela API HTTP real — validators, services,
 * parcelas e numeração — então o BACKEND LOCAL PRECISA ESTAR RODANDO:
 *   npm run dev:local     (em outro terminal)
 *   npm run seed:demo
 *
 * Pré-requisito: npm run seed:local (empresa Kronos Dev + usuários).
 * O script recusa DATABASE_URL não-local e aborta se o dataset já existir
 * (rodar duas vezes duplicaria receitas/despesas/tarefas).
 */
require('dotenv').config({ path: '.env.development' })
const { Pool } = require('pg')

const API = process.env.SEED_API_URL || 'http://localhost:3001/api'
const ADMIN = { email: 'admin@kronos.dev', password: 'Kronos@123' }

// ── Guarda: nunca rodar contra banco remoto (o .env padrão é produção) ──
const dbUrl = process.env.DATABASE_URL || ''
if (!/localhost|127\.0\.0\.1/.test(dbUrl)) {
  console.error('ABORTADO: DATABASE_URL não é local. Este seed é só para o ambiente de desenvolvimento.')
  process.exit(1)
}

const TODAY = new Date()
const YEAR = TODAY.getFullYear()
const CUTOFF = TODAY.toISOString().slice(0, 10) // vencimentos até hoje = confirmados

let TOKEN = ''
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]
const between = (a, b) => a + Math.floor(Math.random() * (b - a + 1))
const pad = (n) => String(n).padStart(2, '0')
const dt = (m, d) => `${YEAR}-${pad(m)}-${pad(d)}`

// Throttle: o backend tem token bucket (~10 req/s); 130ms/req fica abaixo do
// refill. Em 429 espera e tenta de novo.
const req = async (method, path, body) => {
  for (let attempt = 1; ; attempt++) {
    await sleep(130)
    const res = await fetch(`${API}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
      body: body ? JSON.stringify(body) : undefined,
    })
    const text = await res.text()
    let json = null
    try { json = JSON.parse(text) } catch { /* html/vazio */ }
    if (res.status === 429 && attempt < 5) { await sleep(3000); continue }
    if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${text.slice(0, 300)}`)
    return json
  }
}

// ─────────────────────────────────────────────────────────────────────
const CLIENTES = [
  ['Mariana Albuquerque', 'mariana.albuquerque@gmail.com'],
  ['Ricardo Tavares',     'ricardo.tavares@outlook.com'],
  ['Fernanda Lopes',      'fernanda.lopes@gmail.com'],
  ['Grupo Vetter Ltda',   'contato@vetter.com.br'],
  ['Paulo Henrique Sena', 'ph.sena@gmail.com'],
  ['Construtora Adler',   'obras@adler.eng.br'],
  ['Juliana Prado',       'juliana.prado@hotmail.com'],
  ['Café Aurora',         'adm@cafeaurora.com.br'],
  ['Otávio Bittencourt',  'otavio.b@gmail.com'],
  ['Clínica Vitalis',     'recepcao@vitalis.med.br'],
  ['Sérgio Nakamura',     'sergio.nakamura@uol.com.br'],
  ['Pousada Mar Alto',    'reservas@maralto.tur.br'],
  ['Beatriz Fontes',      'bia.fontes@gmail.com'],
  ['Escritório Lacerda',  'contato@lacerdaadv.com.br'],
  ['Helena Duarte',       'helena.duarte@gmail.com'],
]

const PROJETOS = [
  ['Residência Albuquerque',        0, 185000],
  ['Reforma Apartamento Tavares',   1, 62000],
  ['Casa de Campo Lopes',           2, 240000],
  ['Sede Comercial Vetter',         3, 390000],
  ['Studio PH Sena',                4, 48000],
  ['Condomínio Adler Fase 1',       5, 520000],
  ['Interiores Juliana Prado',      6, 35000],
  ['Fachada Café Aurora',           7, 27000],
  ['Residência Bittencourt',        8, 210000],
  ['Clínica Vitalis — Ampliação',   9, 155000],
  ['Loft Nakamura',                10, 89000],
  ['Pousada Mar Alto — Chalés',    11, 175000],
  ['Apartamento Beatriz Fontes',   12, 54000],
  ['Escritório Lacerda Advogados', 13, 98000],
  ['Casa Helena Duarte',           14, 132000],
]

const STAGES_TEMPLATE = [
  ['Levantamento',       ['Medição do terreno', 'Briefing com cliente']],
  ['Estudo Preliminar',  ['Layout inicial', 'Volumetria 3D', 'Apresentação ao cliente']],
  ['Projeto Executivo',  ['Plantas técnicas', 'Detalhamentos', 'Memorial descritivo']],
  ['Acompanhamento',     ['Visitas de obra', 'Compatibilização com fornecedores']],
]

const TAREFAS = [
  'Finalizar plantas do pavimento térreo', 'Revisar memorial descritivo',
  'Enviar orçamento de marcenaria', 'Agendar visita técnica',
  'Compatibilizar projeto elétrico', 'Aprovar paleta de materiais',
  'Renderizar imagens da fachada', 'Protocolar projeto na prefeitura',
  'Cotação de esquadrias', 'Revisão do projeto hidráulico',
  'Detalhamento da escada', 'Selecionar luminárias',
  'Reunião de alinhamento com cliente', 'Atualizar cronograma da obra',
  'Conferir medições do pedreiro',
]

const CATEGORIAS = [
  ['Pessoal',    '#6366f1'], ['Software',  '#0ea5e9'], ['Impostos', '#ef4444'],
  ['Escritório', '#f59e0b'], ['Marketing', '#10b981'],
]

async function main() {
  const login = await req('POST', '/auth/login', ADMIN)
  TOKEN = login.accessToken
  console.log('login ok')

  // Anti-duplicação: se o dataset já existe, não roda de novo.
  const existing = (await req('GET', '/projects?limit=200')).data || []
  if (existing.some((p) => p.title === PROJETOS[0][0])) {
    console.error('ABORTADO: dataset de demonstração já existe (projeto "Residência Albuquerque" encontrado).')
    process.exit(1)
  }

  const users = (await req('GET', '/users?limit=100')).data || []
  const userIds = users.map((u) => u.id)
  // Só usuários internos apontam horas (o usuário de portal não faz sentido
  // no relatório de equipe).
  const internalIds = users.filter((u) => u.name !== 'Client' && u.role).map((u) => u.id)

  // ── 15 projetos ──────────────────────────────────────────────────────
  const projIds = []
  for (const [title, clientIdx, budget] of PROJETOS) {
    const startMonth = between(1, 6)
    const p = await req('POST', '/projects', {
      title,
      client: CLIENTES[clientIdx][0],
      description: `Projeto ${title.toLowerCase()} — dados de demonstração.`,
      budget,
      start_date: dt(startMonth, between(5, 25)),
      expected_date: dt(Math.min(startMonth + between(3, 6), 12), between(5, 25)),
    })
    projIds.push(p.project.id)
  }
  console.log('projetos criados:', projIds.length)

  // Status variados (4 concluídos, 2 pausados, 6 em andamento)
  for (const [idx, status] of [[1, 'completed'], [4, 'completed'], [6, 'completed'], [7, 'completed'], [10, 'paused'], [12, 'paused']]) {
    const body = { status }
    if (status === 'completed') body.completed_date = dt(between(4, 7), between(5, 14))
    await req('PATCH', `/projects/${projIds[idx]}`, body)
  }
  for (const idx of [0, 2, 3, 5, 8, 9]) await req('PATCH', `/projects/${projIds[idx]}`, { status: 'in_progress' })

  // ── 15 clientes (cada um vinculado ao seu projeto) ───────────────────
  for (let i = 0; i < CLIENTES.length; i++) {
    const [name, email] = CLIENTES[i]
    await req('POST', '/clients', {
      name, email,
      phone: `11 9${between(6000, 9999)}-${between(1000, 9999)}`,
      status: i < 11 ? 'cliente' : 'lead',
      situacao: pick(['contrato_assinado', 'proposta_aprovada', 'aguardando_aprovacao', null]),
      financeiro: i < 11 ? pick(['adimplente', 'adimplente', 'inadimplente']) : null,
      projectId: projIds[i],
    })
  }
  console.log('clientes criados: 15')

  // ── Etapas/fases nos 6 primeiros projetos ────────────────────────────
  for (const pi of [0, 1, 2, 3, 4, 5]) {
    for (let s = 0; s < between(3, 4); s++) {
      const [stageName, phases] = STAGES_TEMPLATE[s]
      const st = await req('POST', `/projects/${projIds[pi]}/stages`, { stage_name: stageName })
      for (const phName of phases) {
        const ph = await req('POST', `/projects/${projIds[pi]}/stages/${st.stage.id}/phases`, { phase_name: phName })
        if (s < 2 && Math.random() < 0.8) {
          await req('PATCH', `/projects/${projIds[pi]}/stages/${st.stage.id}/phases/${ph.phase.id}`, { is_completed: true })
        }
      }
    }
  }
  console.log('etapas/fases criadas nos projetos 1-6')

  // ── 15 tarefas divididas entre os projetos ───────────────────────────
  const tasks = []
  for (let i = 0; i < TAREFAS.length; i++) {
    const projId = projIds[i % projIds.length]
    const t = await req('POST', '/tasks', {
      title: TAREFAS[i],
      description: 'Tarefa de demonstração.',
      project_id: projId,
      priority: pick(['low', 'medium', 'medium', 'high', 'critical']),
      due_date: dt(between(7, 9), between(5, 28)),
      assignees: [pick(userIds)],
    })
    tasks.push({ id: t.task.id, projectId: projId })
    if (i % 3 === 0) await req('PATCH', `/tasks/${t.task.id}`, { status: 'completed' })
    else if (i % 3 === 1) await req('PATCH', `/tasks/${t.task.id}`, { status: 'in_progress' })
  }
  console.log('tarefas criadas: 15')

  // ── Categorias de despesa ────────────────────────────────────────────
  const catIds = []
  for (const [name, color] of CATEGORIAS) {
    const c = await req('POST', '/financial/categories', { name, color })
    catIds.push(c.category.id)
  }

  // ── Receitas (parcelas jan→dez; recebidas até hoje) ──────────────────
  const REVENUES = [
    [0, 'Residência Albuquerque — contrato',  185000, 5, 2],
    [1, 'Reforma Tavares — projeto',           62000, 3, 1],
    [2, 'Casa de Campo Lopes — 1ª medição',   120000, 4, 3],
    [3, 'Sede Vetter — entrada',              130000, 2, 1],
    [4, 'Studio PH Sena — pagamento único',    48000, 1, 2],
    [5, 'Condomínio Adler — medições',        260000, 6, 1],
    [7, 'Fachada Café Aurora',                 27000, 2, 3],
    [8, 'Residência Bittencourt — entrada',    84000, 3, 2],
    [9, 'Clínica Vitalis — 1ª etapa',          77500, 4, 1],
    [11, 'Pousada Mar Alto — sinal',           52500, 2, 4],
    [13, 'Escritório Lacerda — projeto',       98000, 4, 2],
    [null, 'Consultoria avulsa — laudo técnico', 8500, 1, 5],
  ]
  for (const [pi, title, total, nParc, firstMonth] of REVENUES) {
    const per = Math.round((total / nParc) * 100) / 100
    await req('POST', '/financial/revenues', {
      title,
      client: pi === null ? 'Diversos' : CLIENTES[PROJETOS[pi][1]][0],
      project_id: pi === null ? null : projIds[pi],
      total_amount: total,
      description: 'Receita de demonstração.',
      installments_list: Array.from({ length: nParc }, (_, k) => ({
        amount: k === nParc - 1 ? Math.round((total - per * (nParc - 1)) * 100) / 100 : per,
        due_date: dt(Math.min(firstMonth + k * 2, 12), between(8, 20)),
      })),
    })
  }
  // Confirmar recebimento das parcelas vencidas até hoje
  const revRows = (await req('GET', '/financial/revenues?limit=500')).data || []
  let received = 0
  for (const r of revRows) {
    if (r.installment_status === 'pending' && String(r.installment_due).slice(0, 10) <= CUTOFF) {
      await req('PATCH', `/financial/revenues/installments/${r.installment_id}/receive`,
        { received_date: String(r.installment_due).slice(0, 10) })
      received++
    }
  }
  console.log(`receitas: ${REVENUES.length} criadas, ${received} parcelas recebidas`)

  // ── Despesas (vinculadas a projetos + gerais) ────────────────────────
  const EXPENSES = [
    [0, 'Impressões e plotagem — Albuquerque', 850, 2],
    [0, 'Maquete física — Albuquerque',       2400, 4],
    [2, 'Consultor estrutural — Lopes',       6500, 3],
    [3, 'Sondagem do terreno — Vetter',       9800, 1],
    [3, 'Taxas de aprovação — Vetter',        4300, 5],
    [5, 'Topografia — Adler',                12000, 2],
    [5, 'Consultoria de fundações — Adler',  15500, 6],
    [8, 'Renderizações externas — Bittencourt', 3200, 4],
    [9, 'Projeto de climatização — Vitalis',  8700, 7],
    [11, 'Viagem técnica — Mar Alto',         2950, 8],
    [null, 'Folha de pagamento',             38000, 1, true],
    [null, 'Licenças de software (CAD/BIM)',  2100, 3, true],
    [null, 'Aluguel do escritório',           5500, 2, true],
    [null, 'Impostos trimestrais',           11200, 4],
    [null, 'Marketing digital',               1800, 9],
    [null, 'Material de escritório',           640, 10],
  ]
  for (const [pi, title, amount, month, recurring] of EXPENSES) {
    await req('POST', '/financial/expenses', {
      title,
      description: 'Despesa de demonstração.',
      project_id: pi === null ? null : projIds[pi],
      category_id: pick(catIds),
      amount,
      due_date: dt(month, between(8, 20)),
      is_recurring: !!recurring,
    })
  }
  // Pagar tudo que venceu até hoje — INCLUSIVE as ocorrências mensais que as
  // despesas recorrentes geram (senão ficam como "em atraso" irreal).
  const expRows = (await req('GET', '/financial/expenses?limit=500')).data || []
  let paid = 0
  for (const e of expRows) {
    if (e.status === 'pending' && String(e.due_date).slice(0, 10) <= CUTOFF) {
      await req('PATCH', `/financial/expenses/${e.id}/pay`, { paid_date: String(e.due_date).slice(0, 10) })
      paid++
    }
  }
  console.log(`despesas: ${EXPENSES.length} criadas, ${paid} pagas (com ocorrências recorrentes)`)

  // ── Agenda (próximas ~3 semanas) ─────────────────────────────────────
  const EVENTS = [
    ['Reunião de briefing — Helena Duarte', 1, 10, 'Escritório', '#4A90E2'],
    ['Visita de obra — Condomínio Adler',   2, 9,  'Canteiro Adler', '#10b981'],
    ['Apresentação 3D — Residência Albuquerque', 5, 14, 'Online (Meet)', '#8b5cf6'],
    ['Medição final — Reforma Tavares',     7, 8,  'Ap. Tavares', '#f59e0b'],
    ['Reunião com fornecedor de esquadrias', 9, 11, 'Escritório', '#4A90E2'],
    ['Entrega de chaves — Studio PH Sena', 13, 16, 'Studio Sena', '#10b981'],
    ['Vistoria prefeitura — Clínica Vitalis', 16, 9, 'Clínica Vitalis', '#ef4444'],
    ['Workshop interno de BIM',            19, 14, 'Escritório', '#0ea5e9'],
  ]
  for (const [title, daysAhead, h, location, color] of EVENTS) {
    const d = new Date(TODAY.getTime() + daysAhead * 86400000)
    const day = d.toISOString().slice(0, 10)
    await req('POST', '/calendar', {
      title, description: 'Evento de demonstração.',
      start_date: `${day}T${pad(h)}:00:00-03:00`,
      end_date:   `${day}T${pad(h + 1)}:30:00-03:00`,
      location, color,
    })
  }
  console.log('eventos criados:', EVENTS.length)

  // ── Propostas (cards simples) ────────────────────────────────────────
  const PROPOSALS = [
    ['Proposta — Residência Helena Duarte', 14, 'Projeto arquitetônico completo de residência unifamiliar (280m²).'],
    ['Proposta — Retrofit Escritório Lacerda', 13, 'Retrofit de escritório corporativo com projeto de interiores.'],
    ['Proposta — Ampliação Clínica Vitalis', 9, 'Ampliação de 400m² com novas salas de atendimento.'],
    ['Proposta — Chalés Pousada Mar Alto', 11, 'Projeto de 6 chalés padronizados com deck.'],
    ['Proposta — Interiores Loft Nakamura', 10, 'Projeto de interiores completo para loft de 120m².'],
    ['Proposta — Café Aurora unidade 2', 7, 'Projeto de fachada e interiores para nova unidade.'],
  ]
  for (const [title, ci, obj] of PROPOSALS) {
    await req('POST', '/proposals', {
      title,
      client_name: CLIENTES[ci][0],
      service_object: obj,
      valid_until: dt(between(8, 10), 15),
    })
  }
  console.log('propostas criadas:', PROPOSALS.length)

  // ── Relatórios de projeto (semear + observações + item custom) ───────
  const OBS = [
    'Etapa concluída dentro do prazo previsto.',
    'Cliente solicitou ajustes na segunda revisão — replanejado sem impacto no cronograma.',
    'Aguardando retorno do fornecedor para dar sequência.',
    'Concluída com aprovação integral do cliente na reunião de apresentação.',
  ]
  for (const pi of [0, 2, 3, 5]) {
    const rep = await req('GET', `/projects/${projIds[pi]}/report`)
    const items = rep.items.map((s, si) => ({
      title: s.title,
      observation: si < 2 ? pick(OBS) : s.observation,
      is_completed: s.is_completed,
      source_id: s.source_id,
      phases: s.phases.map((p) => ({
        title: p.title, observation: p.observation,
        is_completed: p.is_completed, source_id: p.source_id,
      })),
    }))
    items.push({
      title: 'Entrega final e as built', observation: 'Prevista para o encerramento da obra.',
      is_completed: false, source_id: null, phases: [],
    })
    await req('PUT', `/projects/${projIds[pi]}/report`, { items })
  }
  console.log('relatórios de projeto montados: 4')

  // ── Time entries (INSERT direto — imutáveis via API) ─────────────────
  const pool = new Pool({ connectionString: dbUrl })
  try {
    for (let i = 0; i < 40; i++) {
      const t = pick(tasks)
      const d = new Date(TODAY.getTime() - between(0, 29) * 86400000)
      const dateStr = d.toISOString().slice(0, 10)
      const startH = between(8, 16)
      const dur = between(1800, 14400)
      await pool.query(
        `INSERT INTO time_entries (company_id, task_id, project_id, user_id, started_at, ended_at, duration_seconds, work_date)
         SELECT c.id, $1, $2, $3, $4::timestamptz, $4::timestamptz + make_interval(secs => $5::int), $5::int, $6
         FROM companies c LIMIT 1`,
        [t.id, t.projectId, pick(internalIds), `${dateStr} ${pad(startH)}:00:00-03`, dur, dateStr]
      )
    }
    console.log('time entries criadas: 40')
  } finally {
    await pool.end()
  }

  console.log('\nSEED DE DEMONSTRAÇÃO COMPLETO')
}

main().catch((e) => { console.error('SEED FALHOU:', e.message); process.exit(1) })
