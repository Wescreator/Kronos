-- ================================================
-- TABELAS: import_jobs, import_column_mappings,
--          import_staging_rows, import_templates
-- (Importação de Planilhas — spec docs/specs/importacao-planilhas.md)
-- ================================================
--
-- Pipeline de importação de planilhas (.xlsx/.csv) para Financeiro
-- (Despesas/Receitas) e Clientes. O arquivo original vai para o R2
-- (original_file_key); as linhas parseadas ficam em import_staging_rows
-- até o usuário revisar e confirmar — só então viram registros reais
-- nos módulos de destino, numa única transação.
--
-- Acesso a dados: pg puro com company_id explícito em toda query
-- (mesma forma dos módulos de destino — essas tabelas NÃO passam pela
-- extensão Prisma e NÃO entram em TENANT_MODELS).

CREATE TABLE import_jobs (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  company_id         UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  module             VARCHAR(30)  NOT NULL CHECK (module IN ('financeiro_despesas', 'financeiro_receitas', 'clientes')),

  -- Máquina de estados do job:
  --   uploaded   → arquivo recebido, parsing em andamento (estado transiente)
  --   mapping    → linhas em staging, aguardando mapeamento de colunas
  --   preview    → mapeamento aplicado, aguardando revisão linha a linha
  --   confirmed  → usuário confirmou, aguardando gravação
  --   processing → gravação transacional em andamento
  --   done       → importação concluída
  --   failed     → erro de parsing/gravação ou watchdog (ver error_message)
  status             VARCHAR(15)  NOT NULL DEFAULT 'uploaded'
                     CHECK (status IN ('uploaded', 'mapping', 'preview', 'confirmed', 'processing', 'done', 'failed')),

  original_file_key  TEXT,                     -- objeto no R2 (arquivo original enviado)
  original_filename  VARCHAR(255),
  detected_columns   JSONB,                    -- cabeçalhos detectados no parsing, na ordem da planilha
  row_count          INTEGER,                  -- total de linhas de dados parseadas
  error_message      TEXT,

  created_by         UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,  -- auditoria: quem importou
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),  -- mantido pelo service a cada transição de status (o watchdog depende disso)
  confirmed_at       TIMESTAMPTZ                          -- auditoria: quando o usuário confirmou a gravação
);

CREATE INDEX idx_import_jobs_company         ON import_jobs (company_id, created_at DESC);
-- Watchdog: busca global (todas as empresas) por jobs presos em 'processing'.
CREATE INDEX idx_import_jobs_stale           ON import_jobs (status, updated_at);

-- Mapeamento coluna da planilha → campo do Kronos, definido na etapa de
-- mapeamento (Fase 2). Guardado por job; o snapshot reutilizável fica em
-- import_templates.
CREATE TABLE import_column_mappings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_job_id       UUID NOT NULL REFERENCES import_jobs(id) ON DELETE CASCADE,
  company_id          UUID NOT NULL REFERENCES companies(id)   ON DELETE CASCADE,

  source_column_name  VARCHAR(255) NOT NULL,   -- cabeçalho na planilha
  target_field        VARCHAR(50)  NOT NULL,   -- campo do módulo de destino (ex.: amount, due_date)
  transform_rule      JSONB,                   -- opcional: formato de data, multiplicador etc.

  UNIQUE (import_job_id, source_column_name)
);

CREATE INDEX idx_import_mappings_job ON import_column_mappings (import_job_id);

-- Uma linha da planilha, do parsing até a decisão final do usuário.
CREATE TABLE import_staging_rows (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_job_id       UUID NOT NULL REFERENCES import_jobs(id) ON DELETE CASCADE,
  company_id          UUID NOT NULL REFERENCES companies(id)   ON DELETE CASCADE,

  row_number          INTEGER NOT NULL,        -- posição na planilha original (1 = primeira linha de dados)
  raw_data            JSONB   NOT NULL,        -- { "cabeçalho": valor } como veio da planilha
  mapped_data         JSONB,                   -- linha convertida para o schema Kronos (preenchido na Fase 2/3)
  group_key           VARCHAR(64),             -- Receitas: linhas com a mesma chave viram parcelas da mesma receita

  -- ok      → pronta para importar
  -- warning → importável, mas com aviso (ex.: possível duplicata)
  -- error   → não importável (ex.: data inválida, valor não numérico)
  -- ignored → usuário decidiu pular
  status              VARCHAR(10) NOT NULL DEFAULT 'ok'
                      CHECK (status IN ('ok', 'warning', 'error', 'ignored')),

  duplicate_match_id  UUID,                    -- id do registro existente que bateu no critério de duplicata
  duplicate_action    VARCHAR(10) CHECK (duplicate_action IN ('import', 'skip', 'update')),
  error_message       TEXT,

  UNIQUE (import_job_id, row_number)
);

CREATE INDEX idx_import_rows_job     ON import_staging_rows (import_job_id, row_number);
CREATE INDEX idx_import_rows_company ON import_staging_rows (company_id);

-- Snapshot de mapeamento por empresa+módulo, para reconhecer automaticamente
-- a mesma planilha numa importação futura e pular a etapa manual (Fase 5).
CREATE TABLE import_templates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  module          VARCHAR(30) NOT NULL CHECK (module IN ('financeiro_despesas', 'financeiro_receitas', 'clientes')),

  column_mapping  JSONB NOT NULL,              -- [{ source_column_name, target_field, transform_rule }]

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_import_templates_company ON import_templates (company_id, module);
