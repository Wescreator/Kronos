const pool = require('../config/database')
const repo = require('../repositories/import.repository')
const fileService = require('./file.service')
const { parseSpreadsheet } = require('../utils/spreadsheetParser')
const { suggestMapping, pickTemplate } = require('../utils/importMatcher')
const { convertRow } = require('../utils/importValueConverter')
const { MODULE_FIELDS } = require('../config/importFields')
const { paginate, paginatedResponse } = require('../utils/pagination')
const AppError = require('../utils/AppError')
const { BYPASS_ROLES } = require('../middlewares/auth.middleware')

/**
 * Importação de planilhas — Fase 1: upload → R2, parsing síncrono e máquina
 * de estados do job. Spec: docs/specs/importacao-planilhas.md.
 */

// Permissão por módulo de destino, espelhando os routers de destino:
// Financeiro é authorize('admin') (sem hierarquia — owner não acessa o
// Financeiro hoje; se isso mudar lá, muda aqui junto); Clientes não tem
// authorize (qualquer papel da empresa) → roles: null = liberado.
// BYPASS_ROLES (developer) sempre passa.
const MODULES = {
  financeiro_despesas: { roles: ['admin'] },
  financeiro_receitas: { roles: ['admin'] },
  clientes: { roles: null },
}

const canAccessModule = (role, module) => {
  const config = MODULES[module]
  if (!config) return false
  if (BYPASS_ROLES.includes(role)) return true
  return config.roles === null || config.roles.includes(role)
}

const allowedModulesFor = (role) => {
  if (BYPASS_ROLES.includes(role)) return null // null = sem filtro (vê todos)
  return Object.keys(MODULES).filter(m => canAccessModule(role, m))
}

/**
 * Passo 1-2 do fluxo: recebe o arquivo, parseia sincronamente, salva o
 * original no R2 e persiste job + staging rows numa única transação.
 * Estados percorridos: uploaded (INSERT) → mapping (fim do parsing).
 */
const createImport = async ({ file, module, userId, companyId }) => {
  if (!file) throw new AppError(400, 'Envie o arquivo da planilha no campo "file"')

  // Parsing antes de qualquer efeito colateral: planilha inválida não deixa
  // rastro (nem no R2, nem no banco).
  const { headers, rows } = await parseSpreadsheet({
    buffer: file.buffer,
    mimeType: file.mimetype,
    originalFilename: file.originalname,
  })
  if (rows.length === 0) throw new AppError(400, 'A planilha não contém linhas de dados')

  // Arquivo original no R2 (fora da transação — se o INSERT falhar sobra um
  // objeto órfão no bucket, aceitável e inofensivo; o inverso, job sem
  // arquivo, não).
  const { object_key } = await fileService.upload({
    buffer: file.buffer,
    originalFilename: file.originalname,
    mimeType: file.mimetype,
    folder: `imports/${companyId}`,
  })

  const client = await pool.connect()
  let job
  try {
    await client.query('BEGIN')

    const inserted = await repo.insertJob(client, {
      companyId,
      module,
      originalFileKey: object_key,
      originalFilename: file.originalname,
      detectedColumns: headers,
      rowCount: rows.length,
      createdBy: userId,
    })

    await repo.bulkInsertStagingRows(client, { jobId: inserted.id, companyId, rows })

    // Parsing concluído → pronto para a etapa de mapeamento (Fase 2)
    job = await repo.updateJobStatus(client, { jobId: inserted.id, companyId, status: 'mapping' })

    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }

  // Reconhecimento automático (Fase 5): se um template da empresa cobre
  // todas as colunas que ele mapeia, aplica direto e pula a etapa manual —
  // o job já volta em preview. Roda FORA da transação do upload: qualquer
  // problema (template obsoleto após mudança na config de campos, erro
  // transiente) é engolido e o fluxo segue para o mapeamento manual, que é
  // sempre um fallback válido.
  let templateApplied = false
  try {
    const templates = await repo.findTemplates(companyId, module)
    const template = pickTemplate(templates, headers)
    if (template) {
      const fieldsByTarget = validateMappings(job, template.column_mapping)
      job = await runApplyPipeline(job, template.column_mapping, fieldsByTarget, companyId)
      templateApplied = true
    }
  } catch {
    templateApplied = false
  }

  return { ...job, template_applied: templateApplied }
}

const listImports = async (query, companyId, role) => {
  const { page, limit, offset } = paginate(query)
  const modules = allowedModulesFor(role)
  const { rows, total } = await repo.findJobs({ companyId, modules, limit, offset })
  return paginatedResponse(rows, total, page, limit)
}

const getImport = async (id, companyId, role) => {
  const job = await repo.findJobById(companyId, id)
  if (!job) throw new AppError(404, 'Importação não encontrada')
  if (!canAccessModule(role, job.module)) throw new AppError(403, 'Sem permissão para este módulo')
  return job
}

/* ─── Fase 2: mapeamento de colunas ─── */

// Reabrir o mapeamento com o job em preview é permitido (o usuário volta da
// revisão para corrigir uma coluna). 'failed' também: é o caminho de
// recuperação após uma gravação que falhou — reaplicar recomputa tudo do
// raw e devolve o job para preview. A partir de confirmed/processing, não.
const MAPPING_STATES = ['mapping', 'preview', 'failed']

const getJobInMappingState = async (id, companyId, role) => {
  const job = await getImport(id, companyId, role)
  if (!MAPPING_STATES.includes(job.status)) {
    throw new AppError(409, `Importação em "${job.status}" — o mapeamento só pode ser editado nas etapas de mapeamento e revisão`)
  }
  return job
}

// Shape público da definição de campos (sem o dicionário de sinônimos,
// que é detalhe do matcher).
const publicFields = (module) =>
  MODULE_FIELDS[module].map(({ target_field, label, type, required, values }) => ({
    target_field, label, type, required,
    ...(values ? { options: Object.keys(values) } : {}),
  }))

/**
 * Tela de mapeamento: colunas detectadas + valores de exemplo + sugestão
 * automática (heurística por sinônimos) + o que o usuário já salvou antes
 * (se estiver reabrindo).
 */
const getMapping = async (id, companyId, role) => {
  const job = await getJobInMappingState(id, companyId, role)
  const headers = job.detected_columns || []
  const fields = MODULE_FIELDS[job.module]

  const [sample, saved] = await Promise.all([
    repo.findStagingSample(companyId, job.id, 5),
    repo.findMappings(companyId, job.id),
  ])

  const suggested = suggestMapping(headers, fields)
  const savedByColumn = Object.fromEntries(saved.map(m => [m.source_column_name, m.target_field]))

  const columns = headers.map(name => ({
    name,
    samples: sample.map(raw => raw[name]).filter(v => v !== null && v !== undefined).slice(0, 3),
    suggested_target: suggested[name],
    saved_target: savedByColumn[name] ?? null,
  }))

  return { job, fields: publicFields(job.module), columns }
}

// Validações de estrutura do mapeamento (erro de uso da tela → 400).
// Usada também no auto-apply por template (Fase 5): um template gravado
// antes de uma mudança na config de campos falha aqui e o fluxo cai no
// mapeamento manual em vez de aplicar algo inválido.
const validateMappings = (job, mappings) => {
  const fields = MODULE_FIELDS[job.module]
  const fieldsByTarget = new Map(fields.map(f => [f.target_field, f]))
  const headers = new Set(job.detected_columns || [])

  const seenTargets = new Set()
  for (const m of mappings) {
    if (!headers.has(m.source_column_name)) {
      throw new AppError(400, `Coluna "${m.source_column_name}" não existe na planilha`)
    }
    if (!fieldsByTarget.has(m.target_field)) {
      throw new AppError(400, `Campo de destino "${m.target_field}" não existe no módulo ${job.module}`)
    }
    if (seenTargets.has(m.target_field)) {
      throw new AppError(400, `Campo "${fieldsByTarget.get(m.target_field).label}" mapeado para mais de uma coluna`)
    }
    seenTargets.add(m.target_field)
  }
  const missingRequired = fields.filter(f => f.required && !seenTargets.has(f.target_field))
  if (missingRequired.length > 0) {
    throw new AppError(400, `Campos obrigatórios sem coluna mapeada: ${missingRequired.map(f => f.label).join(', ')}`)
  }
  return fieldsByTarget
}

// Identidade de um template = conjunto de colunas de origem que ele mapeia.
const templateSourceKey = (mappings) =>
  mappings.map(m => m.source_column_name).sort().join(' ')

/**
 * Pipeline de aplicação do mapeamento (transacional): grava os mappings,
 * converte raw_data → mapped_data, roda agrupamento de receitas + detecção
 * de duplicata e avança o job para preview. Reaplicar recomputa tudo do
 * raw e zera decisões. `templateAction` (opcional) faz o upsert do template
 * na mesma transação (só no salvamento manual — o auto-apply não regrava).
 */
const runApplyPipeline = async (job, mappings, fieldsByTarget, companyId, templateAction = null) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    await repo.replaceMappings(client, { jobId: job.id, companyId, mappings })

    const rows = await repo.findRowsForApply(client, { jobId: job.id, companyId })
    const updates = rows.map(row => {
      const { mapped, status, errorMessage } = convertRow(row.raw_data, mappings, fieldsByTarget)
      return { id: row.id, mapped, status, errorMessage }
    })
    await repo.bulkUpdateMappedRows(client, updates)

    const scope = { jobId: job.id, companyId }
    if (job.module === 'financeiro_receitas') {
      await repo.computeRevenueGroups(client, scope)
      await repo.detectRevenueDuplicates(client, scope)
    } else if (job.module === 'financeiro_despesas') {
      await repo.detectExpenseDuplicates(client, scope)
    } else if (job.module === 'clientes') {
      await repo.detectClientDuplicates(client, scope)
    }

    if (templateAction) {
      await repo.upsertTemplate(client, {
        templateId: templateAction.templateId,
        companyId,
        module: job.module,
        columnMapping: mappings,
      })
    }

    const updated = await repo.updateJobStatus(client, { jobId: job.id, companyId, status: 'preview' })
    await client.query('COMMIT')
    return updated
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

/**
 * Salva o mapeamento e o APLICA (substituição integral, idempotente sobre o
 * raw original). Também grava o template da planilha (Fase 5): mesma
 * combinação de colunas de origem atualiza o template existente; combinação
 * nova cria outro — na próxima importação do mesmo formato, a etapa manual
 * é pulada automaticamente.
 */
const applyMapping = async (id, { mappings }, companyId, role) => {
  const job = await getJobInMappingState(id, companyId, role)
  const fieldsByTarget = validateMappings(job, mappings)

  const templates = await repo.findTemplates(companyId, job.module)
  const existing = templates.find(t => templateSourceKey(t.column_mapping || []) === templateSourceKey(mappings))

  const updated = await runApplyPipeline(job, mappings, fieldsByTarget, companyId, { templateId: existing?.id || null })

  const summary = await repo.countRowsSummary(companyId, job.id)
  return { job: updated, summary }
}

/* ─── Fase 3: preview, duplicatas e ações linha a linha ─── */

/**
 * Grid da preview: linhas convertidas, paginadas, com marcação de duplicata
 * e resumo agregado. Disponível de preview em diante (reabrir o resultado
 * de um job concluído usa a mesma tela).
 */
const getRows = async (id, query, companyId, role) => {
  const job = await getImport(id, companyId, role)
  if (['uploaded', 'mapping'].includes(job.status)) {
    throw new AppError(409, 'A importação ainda não foi mapeada — conclua o mapeamento primeiro')
  }
  const { page, limit, offset } = paginate(query)
  const status = ['ok', 'warning', 'error', 'ignored'].includes(query.status) ? query.status : undefined

  const [{ rows, total }, summary] = await Promise.all([
    repo.findStagingRows({ jobId: job.id, companyId, status, limit, offset }),
    repo.countRowsSummary(companyId, job.id),
  ])

  // tamanho dos grupos (receitas) presentes nesta página
  const groupKeys = [...new Set(rows.map(r => r.group_key).filter(Boolean))]
  const groupSizes = await repo.findGroupSizes(companyId, job.id, groupKeys)

  // fields dá os labels/ordem das colunas do grid (a UI não duplica a config)
  return { job, fields: publicFields(job.module), ...paginatedResponse(rows, total, page, limit), summary, group_sizes: groupSizes }
}

const getRowInPreview = async (id, rowId, companyId, role) => {
  const job = await getImport(id, companyId, role)
  if (job.status !== 'preview') {
    throw new AppError(409, 'Ações de revisão só são permitidas com a importação em revisão (preview)')
  }
  const row = await repo.findRowById(companyId, job.id, rowId)
  if (!row) throw new AppError(404, 'Linha não encontrada nesta importação')
  return { job, row }
}

/**
 * Ação linha a linha (spec 7.2): a decisão sobre duplicata é sempre do
 * usuário. 'restore' desfaz (linha ignorada volta, decisão de duplicata é
 * limpa); 'ungroup' desfaz o agrupamento do grupo inteiro (receitas).
 */
const setRowAction = async (id, rowId, action, companyId, role) => {
  const { job, row } = await getRowInPreview(id, rowId, companyId, role)

  if (action === 'ungroup') {
    if (job.module !== 'financeiro_receitas') throw new AppError(400, 'Desagrupar só se aplica a importação de receitas')
    if (!row.group_key) throw new AppError(400, 'Esta linha não pertence a um grupo')
    const count = await repo.ungroupRows(companyId, job.id, row.group_key)
    return { ungrouped: count }
  }

  if (row.status === 'error') {
    throw new AppError(400, 'Linha com erro de conversão não pode ser importada — corrija a planilha ou o mapeamento')
  }

  if (row.status === 'warning') {
    if (action === 'restore') return { row: await repo.updateRow(companyId, row.id, { duplicateAction: null }) }
    if (!['import', 'skip', 'update'].includes(action)) {
      throw new AppError(400, 'Para duplicatas use: import, skip, update ou restore')
    }
    // Receita duplicada = a PARCELA já existe no sistema — não há semântica
    // útil de "atualizar" (parcelas são geridas na tela de Receitas); as
    // opções são importar mesmo assim ou pular.
    if (action === 'update' && job.module === 'financeiro_receitas') {
      throw new AppError(400, 'Para receitas duplicadas as opções são importar mesmo assim ou pular — atualize parcelas na tela de Receitas')
    }
    // UNIQUE (company_id, email) no banco: importar "mesmo assim" um e-mail
    // existente estouraria constraint — só pular ou atualizar (spec 7.2).
    if (action === 'import' && row.duplicate_reason === 'email') {
      throw new AppError(400, 'Já existe um cliente com este e-mail — só é possível pular ou atualizar o cadastro existente')
    }
    return { row: await repo.updateRow(companyId, row.id, { duplicateAction: action }) }
  }

  if (row.status === 'ok' && action === 'skip') {
    return { row: await repo.updateRow(companyId, row.id, { status: 'ignored' }) }
  }
  if (row.status === 'ignored' && action === 'restore') {
    return { row: await repo.updateRow(companyId, row.id, { status: row.duplicate_match_id ? 'warning' : 'ok' }) }
  }
  throw new AppError(400, `Ação "${action}" não se aplica a uma linha "${row.status}"`)
}

/* ─── Fase 4: confirmação e gravação transacional ─── */

const { WRITERS } = require('./importWriter')

/**
 * Passos 6-7 do fluxo da spec: valida as decisões, faz o claim atômico
 * (preview → processing) e grava tudo numa única transação — falha no meio
 * reverte tudo e o job vira failed (nada é importado pela metade).
 * A rota usa idempotency(): duplo clique/replay devolve a mesma resposta.
 */
const confirmImport = async (id, companyId, role, userId) => {
  const job = await getImport(id, companyId, role)
  if (job.status !== 'preview') {
    throw new AppError(409, `Importação em "${job.status}" — só é possível confirmar uma importação em revisão`)
  }

  const summary = await repo.countRowsSummary(companyId, job.id)
  if (summary.undecided_duplicates > 0) {
    throw new AppError(400, `Há ${summary.undecided_duplicates} possível(is) duplicata(s) sem decisão — resolva-as na revisão antes de confirmar`)
  }

  if (job.module === 'clientes') {
    const intraDups = await repo.findIntraSheetEmailDuplicates(companyId, job.id)
    if (intraDups.length > 0) {
      const detail = intraDups.map(d => `${d.email} (linhas ${d.row_numbers.join(', ')})`).join('; ')
      throw new AppError(400, `A planilha tem e-mails repetidos entre as linhas a importar: ${detail} — pule as repetições antes de confirmar`)
    }
  }

  // claim atômico: segunda confirmação simultânea não encontra 'preview'
  const claimed = await repo.claimJobForProcessing(companyId, job.id)
  if (!claimed) {
    throw new AppError(409, 'Esta importação já está sendo processada')
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const rows = await repo.findRowsToImport(client, { jobId: job.id, companyId })
    const result = await WRITERS[job.module](client, { rows, companyId, userId })

    const doneJob = await repo.updateJobStatus(client, { jobId: job.id, companyId, status: 'done' })
    await client.query('COMMIT')

    return {
      job: doneJob,
      result: {
        ...result,
        skipped_duplicates: summary.skipped_duplicates,
        ignored: summary.ignored,
        errors_left_out: summary.error,
      },
    }
  } catch (err) {
    await client.query('ROLLBACK')
    // registra a falha fora da transação revertida — o histórico mostra o
    // motivo e a importação pode ser reaberta/reconfirmada depois
    await repo.updateJobStatus(pool, { jobId: job.id, companyId, status: 'failed', errorMessage: err.message })
    throw new AppError(err.status || 500, `Falha na gravação — nada foi importado: ${err.message}`)
  } finally {
    client.release()
  }
}

// Atalho em massa da spec: pular todas as duplicatas detectadas.
const bulkRowAction = async (id, action, companyId, role) => {
  const job = await getImport(id, companyId, role)
  if (job.status !== 'preview') {
    throw new AppError(409, 'Ações de revisão só são permitidas com a importação em revisão (preview)')
  }
  // único valor aceito hoje (validator) — switch quando houver mais ações
  const skipped = await repo.skipAllDuplicates(companyId, job.id)
  return { skipped, summary: await repo.countRowsSummary(companyId, job.id) }
}

module.exports = {
  MODULES, canAccessModule, createImport, listImports, getImport,
  getMapping, applyMapping, getRows, setRowAction, bulkRowAction, confirmImport,
}
