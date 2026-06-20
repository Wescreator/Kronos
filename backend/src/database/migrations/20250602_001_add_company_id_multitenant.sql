-- ================================================================
-- Multi-tenant: adiciona company_id a tasks, proposals e chat_rooms
--
-- Fecha a falha de isolamento entre empresas (ver docs/SECURITY.md).
-- Script IDEMPOTENTE: pode ser executado mais de uma vez e direto no
-- editor SQL do Supabase (o runner de migrations está dessincronizado
-- do banco real).
--
-- Backfill: usa o vínculo ativo do criador em company_users; para tasks,
-- cai para a empresa do projeto quando houver project_id.
-- ================================================================

-- ── TASKS ───────────────────────────────────────────────────────
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS company_id UUID;

UPDATE tasks t
SET company_id = cu.company_id
FROM company_users cu
WHERE t.company_id IS NULL
  AND cu.user_id = t.created_by
  AND cu.is_active = TRUE;

-- Fallback: herda a empresa do projeto vinculado
UPDATE tasks t
SET company_id = p.company_id
FROM projects p
WHERE t.company_id IS NULL
  AND t.project_id = p.id;

-- ── PROPOSALS ───────────────────────────────────────────────────
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS company_id UUID;

UPDATE proposals pr
SET company_id = cu.company_id
FROM company_users cu
WHERE pr.company_id IS NULL
  AND cu.user_id = pr.created_by
  AND cu.is_active = TRUE;

-- ── CHAT ROOMS ──────────────────────────────────────────────────
ALTER TABLE chat_rooms ADD COLUMN IF NOT EXISTS company_id UUID;

UPDATE chat_rooms cr
SET company_id = cu.company_id
FROM company_users cu
WHERE cr.company_id IS NULL
  AND cu.user_id = cr.created_by
  AND cu.is_active = TRUE;

-- ── Chaves estrangeiras (idempotente) ───────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_tasks_company') THEN
    ALTER TABLE tasks ADD CONSTRAINT fk_tasks_company
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_proposals_company') THEN
    ALTER TABLE proposals ADD CONSTRAINT fk_proposals_company
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_chat_rooms_company') THEN
    ALTER TABLE chat_rooms ADD CONSTRAINT fk_chat_rooms_company
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ── Índices ─────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_tasks_company      ON tasks(company_id);
CREATE INDEX IF NOT EXISTS idx_proposals_company  ON proposals(company_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_company ON chat_rooms(company_id);
