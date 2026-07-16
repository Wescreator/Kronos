const pool = require('../config/database')

/**
 * Repositório do módulo de importação de planilhas — pg puro com company_id
 * explícito em toda query (essas tabelas não passam pela extensão Prisma).
 *
 * As funções de escrita da criação do job recebem um `client` (conexão da
 * transação aberta no service) para que job + staging rows entrem no mesmo
 * BEGIN/COMMIT. As leituras usam o pool direto.
 */

const insertJob = async (client, { companyId, module, originalFileKey, originalFilename, detectedColumns, rowCount, createdBy }) => {
  const { rows } = await client.query(
    `INSERT INTO import_jobs
       (company_id, module, status, original_file_key, original_filename, detected_columns, row_count, created_by)
     VALUES ($1, $2, 'uploaded', $3, $4, $5, $6, $7)
     RETURNING *`,
    [companyId, module, originalFileKey, originalFilename, JSON.stringify(detectedColumns), rowCount, createdBy]
  )
  return rows[0]
}

// Insere as staging rows em lotes (multi-row INSERT) — uma planilha no teto
// de linhas geraria dezenas de milhares de INSERTs individuais.
const BATCH_SIZE = 500

const bulkInsertStagingRows = async (client, { jobId, companyId, rows }) => {
  for (let start = 0; start < rows.length; start += BATCH_SIZE) {
    const batch = rows.slice(start, start + BATCH_SIZE)
    const params = []
    const tuples = batch.map((row, i) => {
      const base = i * 4
      params.push(jobId, companyId, row.rowNumber, JSON.stringify(row.raw))
      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4})`
    })
    await client.query(
      `INSERT INTO import_staging_rows (import_job_id, company_id, row_number, raw_data)
       VALUES ${tuples.join(', ')}`,
      params
    )
  }
}

const updateJobStatus = async (db, { jobId, companyId, status, errorMessage = null }) => {
  const { rows } = await db.query(
    `UPDATE import_jobs
        SET status = $1, error_message = $2, updated_at = NOW()
      WHERE id = $3 AND company_id = $4
      RETURNING *`,
    [status, errorMessage, jobId, companyId]
  )
  return rows[0]
}

const findJobs = async ({ companyId, modules, limit, offset }) => {
  const conditions = ['j.company_id = $1']
  const params = [companyId]

  // Escopo por permissão: o service passa a lista de módulos que o papel do
  // usuário pode ver (ex.: não-admin não enxerga jobs do Financeiro).
  if (modules) {
    params.push(modules)
    conditions.push(`j.module = ANY($${params.length})`)
  }

  const where = `WHERE ${conditions.join(' AND ')}`

  const { rows: countRows } = await pool.query(
    `SELECT COUNT(*)::int AS total FROM import_jobs j ${where}`,
    params
  )

  params.push(limit, offset)
  const { rows } = await pool.query(
    `SELECT j.*, u.name AS created_by_name
       FROM import_jobs j
       JOIN users u ON u.id = j.created_by
      ${where}
      ORDER BY j.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  )

  return { rows, total: countRows[0].total }
}

const findJobById = async (companyId, id) => {
  const { rows } = await pool.query(
    `SELECT j.*, u.name AS created_by_name
       FROM import_jobs j
       JOIN users u ON u.id = j.created_by
      WHERE j.id = $1 AND j.company_id = $2`,
    [id, companyId]
  )
  return rows[0]
}

/* ─── Mapeamento (Fase 2) ─── */

// Amostra das primeiras linhas para a tela de mapeamento (valores de exemplo
// por coluna, ajudam o usuário a conferir a sugestão automática).
const findStagingSample = async (companyId, jobId, limit) => {
  const { rows } = await pool.query(
    `SELECT raw_data FROM import_staging_rows
      WHERE import_job_id = $1 AND company_id = $2
      ORDER BY row_number LIMIT $3`,
    [jobId, companyId, limit]
  )
  return rows.map(r => r.raw_data)
}

const findMappings = async (companyId, jobId) => {
  const { rows } = await pool.query(
    `SELECT source_column_name, target_field, transform_rule
       FROM import_column_mappings
      WHERE import_job_id = $1 AND company_id = $2`,
    [jobId, companyId]
  )
  return rows
}

// Regravar o mapeamento é sempre substituição integral (o PUT envia o
// conjunto completo) — mantém import_column_mappings como fonte única do
// que foi aplicado por último.
const replaceMappings = async (client, { jobId, companyId, mappings }) => {
  await client.query(
    'DELETE FROM import_column_mappings WHERE import_job_id = $1 AND company_id = $2',
    [jobId, companyId]
  )
  for (const m of mappings) {
    await client.query(
      `INSERT INTO import_column_mappings (import_job_id, company_id, source_column_name, target_field)
       VALUES ($1, $2, $3, $4)`,
      [jobId, companyId, m.source_column_name, m.target_field]
    )
  }
}

// Linhas cruas do job, dentro da transação de aplicação do mapeamento.
const findRowsForApply = async (client, { jobId, companyId }) => {
  const { rows } = await client.query(
    `SELECT id, raw_data FROM import_staging_rows
      WHERE import_job_id = $1 AND company_id = $2
      ORDER BY row_number`,
    [jobId, companyId]
  )
  return rows
}

// Grava o resultado da conversão em lote (UPDATE ... FROM VALUES) — uma
// planilha no teto de linhas seriam dezenas de milhares de UPDATEs soltos.
// Reaplicar o mapeamento zera as marcações da preview (duplicata, ação do
// usuário, grupo): tudo é recomputado do raw na sequência.
const bulkUpdateMappedRows = async (client, updates) => {
  for (let start = 0; start < updates.length; start += BATCH_SIZE) {
    const batch = updates.slice(start, start + BATCH_SIZE)
    const params = []
    const tuples = batch.map((u, i) => {
      const base = i * 4
      params.push(u.id, JSON.stringify(u.mapped), u.status, u.errorMessage)
      return `($${base + 1}::uuid, $${base + 2}::jsonb, $${base + 3}, $${base + 4})`
    })
    await client.query(
      `UPDATE import_staging_rows AS r
          SET mapped_data = v.mapped_data, status = v.status, error_message = v.error_message,
              duplicate_match_id = NULL, duplicate_action = NULL, duplicate_reason = NULL, group_key = NULL
         FROM (VALUES ${tuples.join(', ')}) AS v(id, mapped_data, status, error_message)
        WHERE r.id = v.id`,
      params
    )
  }
}

/* ─── Preview (Fase 3): agrupamento, duplicatas, leitura e ações ─── */

// Receitas (spec 7.1): linhas com os mesmos dados variando a data viram
// parcelas da mesma receita. Chave = title + client + description
// normalizados; só linhas convertidas com sucesso entram em grupo.
const computeRevenueGroups = async (client, { jobId, companyId }) => {
  await client.query(
    `UPDATE import_staging_rows
        SET group_key = md5(
              lower(coalesce(trim(mapped_data->>'title'), '')) || '|' ||
              lower(coalesce(trim(mapped_data->>'client'), '')) || '|' ||
              lower(coalesce(trim(mapped_data->>'description'), ''))
            )
      WHERE import_job_id = $1 AND company_id = $2 AND status = 'ok'`,
    [jobId, companyId]
  )
}

// Duplicatas (spec 7.2) — set-based, uma UPDATE por critério. Linha que
// bate vira 'warning' com o id do registro existente; a decisão
// (import/skip/update) é sempre do usuário, nunca automática.
const detectExpenseDuplicates = async (client, { jobId, companyId }) => {
  await client.query(
    `UPDATE import_staging_rows r
        SET status = 'warning', duplicate_match_id = e.id, duplicate_reason = 'despesa_existente'
       FROM expenses e
      WHERE r.import_job_id = $1 AND r.company_id = $2 AND r.status = 'ok'
        AND e.company_id = $2
        AND lower(trim(e.title)) = lower(trim(r.mapped_data->>'title'))
        AND e.amount = (r.mapped_data->>'amount')::numeric
        AND e.due_date = (r.mapped_data->>'due_date')::date`,
    [jobId, companyId]
  )
}

const detectRevenueDuplicates = async (client, { jobId, companyId }) => {
  await client.query(
    `UPDATE import_staging_rows r
        SET status = 'warning', duplicate_match_id = rev.id, duplicate_reason = 'parcela_existente'
       FROM revenues rev
       JOIN revenue_installments ri ON ri.revenue_id = rev.id
      WHERE r.import_job_id = $1 AND r.company_id = $2 AND r.status = 'ok'
        AND rev.company_id = $2 AND ri.company_id = $2
        AND lower(trim(rev.title)) = lower(trim(r.mapped_data->>'title'))
        AND ri.due_date = (r.mapped_data->>'due_date')::date
        AND ri.amount = (r.mapped_data->>'amount')::numeric`,
    [jobId, companyId]
  )
}

const detectClientDuplicates = async (client, { jobId, companyId }) => {
  // CPF/CNPJ primeiro (critério principal decidido na spec)…
  await client.query(
    `UPDATE import_staging_rows r
        SET status = 'warning', duplicate_match_id = c.id, duplicate_reason = 'cpf_cnpj'
       FROM clients_leads c
      WHERE r.import_job_id = $1 AND r.company_id = $2 AND r.status = 'ok'
        AND c.company_id = $2
        AND c.cpf_cnpj IS NOT NULL
        AND c.cpf_cnpj = r.mapped_data->>'cpf_cnpj'`,
    [jobId, companyId]
  )
  // …e-mail como fallback OBRIGATÓRIO nas linhas restantes: o banco tem
  // UNIQUE (company_id, email) — sem este check a gravação estouraria
  // constraint em vez de mostrar aviso.
  await client.query(
    `UPDATE import_staging_rows r
        SET status = 'warning', duplicate_match_id = c.id, duplicate_reason = 'email'
       FROM clients_leads c
      WHERE r.import_job_id = $1 AND r.company_id = $2 AND r.status = 'ok'
        AND c.company_id = $2
        AND c.email IS NOT NULL
        AND lower(c.email) = lower(r.mapped_data->>'email')`,
    [jobId, companyId]
  )
}

const findStagingRows = async ({ jobId, companyId, status, limit, offset }) => {
  const conditions = ['import_job_id = $1', 'company_id = $2']
  const params = [jobId, companyId]
  if (status) {
    params.push(status)
    conditions.push(`status = $${params.length}`)
  }
  const where = `WHERE ${conditions.join(' AND ')}`

  const { rows: countRows } = await pool.query(
    `SELECT COUNT(*)::int AS total FROM import_staging_rows ${where}`,
    params
  )

  params.push(limit, offset)
  const { rows } = await pool.query(
    `SELECT id, row_number, raw_data, mapped_data, group_key, status,
            duplicate_match_id, duplicate_action, duplicate_reason, error_message
       FROM import_staging_rows ${where}
      ORDER BY row_number
      LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  )
  return { rows, total: countRows[0].total }
}

// Resumo para o cabeçalho da preview e para a validação da confirmação
// (Fase 4): duplicata sem decisão bloqueia o confirmar.
const countRowsSummary = async (companyId, jobId) => {
  const { rows } = await pool.query(
    `SELECT
       COUNT(*)::int                                                        AS total,
       COUNT(*) FILTER (WHERE status = 'ok')::int                           AS ok,
       COUNT(*) FILTER (WHERE status = 'warning')::int                      AS warning,
       COUNT(*) FILTER (WHERE status = 'error')::int                        AS error,
       COUNT(*) FILTER (WHERE status = 'ignored')::int                      AS ignored,
       COUNT(*) FILTER (WHERE status = 'warning' AND duplicate_action IS NULL)::int AS undecided_duplicates,
       COUNT(*) FILTER (WHERE status = 'warning' AND duplicate_action = 'skip')::int AS skipped_duplicates
     FROM import_staging_rows
     WHERE import_job_id = $1 AND company_id = $2`,
    [jobId, companyId]
  )
  return rows[0]
}

// Tamanho dos grupos presentes na página exibida (a UI mostra "parcela X
// de N" sem precisar carregar o grupo inteiro).
const findGroupSizes = async (companyId, jobId, groupKeys) => {
  if (groupKeys.length === 0) return {}
  const { rows } = await pool.query(
    `SELECT group_key, COUNT(*)::int AS size
       FROM import_staging_rows
      WHERE import_job_id = $1 AND company_id = $2 AND group_key = ANY($3)
      GROUP BY group_key`,
    [jobId, companyId, groupKeys]
  )
  return Object.fromEntries(rows.map(r => [r.group_key, r.size]))
}

const findRowById = async (companyId, jobId, rowId) => {
  const { rows } = await pool.query(
    `SELECT * FROM import_staging_rows
      WHERE id = $1 AND import_job_id = $2 AND company_id = $3`,
    [rowId, jobId, companyId]
  )
  return rows[0]
}

const updateRow = async (companyId, rowId, fields) => {
  // whitelist explícita de colunas — nunca interpolar chaves do payload
  const allowed = { status: 'status', duplicateAction: 'duplicate_action', groupKey: 'group_key' }
  const sets = []
  const params = []
  for (const [key, column] of Object.entries(allowed)) {
    if (key in fields) {
      params.push(fields[key])
      sets.push(`${column} = $${params.length}`)
    }
  }
  params.push(rowId, companyId)
  const { rows } = await pool.query(
    `UPDATE import_staging_rows SET ${sets.join(', ')}
      WHERE id = $${params.length - 1} AND company_id = $${params.length}
      RETURNING *`,
    params
  )
  return rows[0]
}

// Ação em massa da spec: "pular todas as duplicatas detectadas".
const skipAllDuplicates = async (companyId, jobId) => {
  const { rowCount } = await pool.query(
    `UPDATE import_staging_rows
        SET duplicate_action = 'skip'
      WHERE import_job_id = $1 AND company_id = $2 AND status = 'warning'`,
    [jobId, companyId]
  )
  return rowCount
}

// Desfaz o agrupamento de UM grupo (spec 7.1): cada linha vira sua própria
// receita (group_key = próprio id).
const ungroupRows = async (companyId, jobId, groupKey) => {
  const { rowCount } = await pool.query(
    `UPDATE import_staging_rows
        SET group_key = id::text
      WHERE import_job_id = $1 AND company_id = $2 AND group_key = $3`,
    [jobId, companyId, groupKey]
  )
  return rowCount
}

/* ─── Templates de mapeamento (Fase 5) ─── */

// Mais recente primeiro — pickTemplate usa a ordem como desempate.
const findTemplates = async (companyId, module) => {
  const { rows } = await pool.query(
    `SELECT id, column_mapping, updated_at
       FROM import_templates
      WHERE company_id = $1 AND module = $2
      ORDER BY updated_at DESC`,
    [companyId, module]
  )
  return rows
}

// Um template por CONJUNTO de colunas de origem (a empresa pode ter mais de
// um formato de planilha por módulo): mesmo conjunto → atualiza os destinos;
// conjunto novo → insere. A comparação é feita em JS pelo service, que passa
// o id do template a atualizar (ou null).
const upsertTemplate = async (client, { templateId, companyId, module, columnMapping }) => {
  if (templateId) {
    await client.query(
      `UPDATE import_templates SET column_mapping = $1, updated_at = NOW()
        WHERE id = $2 AND company_id = $3`,
      [JSON.stringify(columnMapping), templateId, companyId]
    )
  } else {
    await client.query(
      `INSERT INTO import_templates (company_id, module, column_mapping)
       VALUES ($1, $2, $3)`,
      [companyId, module, JSON.stringify(columnMapping)]
    )
  }
}

/* ─── Confirmação e gravação (Fase 4) ─── */

// "Claim" atômico do job: preview → processing. O WHERE status='preview'
// garante que dois confirms simultâneos não gravem duas vezes — o segundo
// não encontra linha e recebe 409 no service.
const claimJobForProcessing = async (companyId, jobId) => {
  const { rows } = await pool.query(
    `UPDATE import_jobs
        SET status = 'processing', confirmed_at = NOW(), updated_at = NOW()
      WHERE id = $1 AND company_id = $2 AND status = 'preview'
      RETURNING *`,
    [jobId, companyId]
  )
  return rows[0]
}

// Linhas que serão gravadas: prontas + duplicatas decididas como
// import/update. Ignoradas, erros e duplicatas puladas ficam de fora.
const findRowsToImport = async (client, { jobId, companyId }) => {
  const { rows } = await client.query(
    `SELECT id, row_number, mapped_data, group_key, duplicate_match_id, duplicate_action
       FROM import_staging_rows
      WHERE import_job_id = $1 AND company_id = $2
        AND (status = 'ok' OR (status = 'warning' AND duplicate_action IN ('import', 'update')))
      ORDER BY row_number`,
    [jobId, companyId]
  )
  return rows
}

// Clientes: e-mails repetidos DENTRO da planilha estourariam a UNIQUE
// (company_id, email) no meio da transação — detectar antes e devolver 400
// amigável com os números das linhas.
const findIntraSheetEmailDuplicates = async (companyId, jobId) => {
  const { rows } = await pool.query(
    `SELECT lower(mapped_data->>'email') AS email,
            array_agg(row_number ORDER BY row_number) AS row_numbers
       FROM import_staging_rows
      WHERE import_job_id = $1 AND company_id = $2
        AND (status = 'ok' OR (status = 'warning' AND duplicate_action = 'import'))
        AND mapped_data->>'email' IS NOT NULL
      GROUP BY lower(mapped_data->>'email')
     HAVING COUNT(*) > 1`,
    [jobId, companyId]
  )
  return rows
}

// Watchdog (cron, fora de request — sem contexto de tenant por design):
// marca como failed jobs presos em 'processing' além do limite. Cobre
// crash/deploy no meio da gravação (o processo do Render é efêmero).
const failStaleProcessingJobs = async (staleMinutes) => {
  const { rowCount } = await pool.query(
    `UPDATE import_jobs
        SET status = 'failed',
            error_message = 'Processamento interrompido — o servidor reiniciou durante a gravação. Nenhuma linha foi importada; envie a planilha novamente.',
            updated_at = NOW()
      WHERE status = 'processing'
        AND updated_at < NOW() - ($1 || ' minutes')::interval`,
    [staleMinutes]
  )
  return rowCount
}

module.exports = {
  insertJob,
  bulkInsertStagingRows,
  updateJobStatus,
  findJobs,
  findJobById,
  findStagingSample,
  findMappings,
  replaceMappings,
  findRowsForApply,
  bulkUpdateMappedRows,
  computeRevenueGroups,
  detectExpenseDuplicates,
  detectRevenueDuplicates,
  detectClientDuplicates,
  findStagingRows,
  countRowsSummary,
  findGroupSizes,
  findRowById,
  updateRow,
  skipAllDuplicates,
  ungroupRows,
  findTemplates,
  upsertTemplate,
  claimJobForProcessing,
  findRowsToImport,
  findIntraSheetEmailDuplicates,
  failStaleProcessingJobs,
}
