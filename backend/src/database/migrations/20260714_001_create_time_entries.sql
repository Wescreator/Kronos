-- ================================================
-- TABELA: time_entries  (Apontamento de horas / time tracking)
-- ================================================
--
-- Cada linha é um intervalo cronometrado numa tarefa. A Task NUNCA armazena
-- tempo: o total da tarefa é SUM(duration_seconds) dos seus registros. O
-- cronômetro nunca altera o status/conclusão da tarefa (isso continua manual).
--
-- Registros são praticamente append-only: nascem no start (ended_at NULL =
-- rodando) e são finalizados no stop (grava ended_at + duration_seconds).
-- Não há edição nem exclusão de registros encerrados; um timer AINDA em
-- andamento pode ser descartado (DELETE do registro com ended_at NULL).
--
-- Isolamento multi-tenant: toda linha carrega company_id e é acessada via
-- Prisma tenant model (o company_id é injetado automaticamente pela extensão;
-- ver src/config/prisma.js — 'time_entries' está em TENANT_MODELS).

CREATE TABLE time_entries (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  company_id   UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  task_id      UUID NOT NULL REFERENCES tasks(id)     ON DELETE CASCADE,
  project_id   UUID          REFERENCES projects(id)  ON DELETE SET NULL,   -- capturado no início; nullable (task pode não ter projeto)
  user_id      UUID NOT NULL REFERENCES users(id)     ON DELETE RESTRICT,   -- preserva o histórico de horas do membro

  started_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at     TIMESTAMPTZ,                                                 -- NULL = timer rodando
  duration_seconds INTEGER,                                                 -- gravado no stop pelo service

  -- "o dia" do registro, no fuso do negócio (America/Sao_Paulo). Preenchido
  -- no start; usado para o histórico diário e os relatórios por dia.
  work_date    DATE NOT NULL DEFAULT ((NOW() AT TIME ZONE 'America/Sao_Paulo')::date),

  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Garante 1 (um) timer ativo por usuário direto no banco — defesa a mais
-- além da checagem no service. Duas abas disputando o start colidem aqui.
CREATE UNIQUE INDEX time_entries_one_active_per_user
  ON time_entries (user_id) WHERE ended_at IS NULL;

-- Índices de leitura/relatório (sempre com company_id à frente = escopo tenant).
CREATE INDEX idx_time_entries_company           ON time_entries (company_id);
CREATE INDEX idx_time_entries_company_user_date ON time_entries (company_id, user_id, work_date);
CREATE INDEX idx_time_entries_company_task      ON time_entries (company_id, task_id);
CREATE INDEX idx_time_entries_company_project   ON time_entries (company_id, project_id);
