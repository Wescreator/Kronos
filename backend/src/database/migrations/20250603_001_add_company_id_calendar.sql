-- ================================================================
-- Multi-tenant: adiciona company_id a calendar_events
--
-- Fecha a ultima lacuna de isolamento (a Agenda nao filtrava por
-- empresa). Script IDEMPOTENTE - pode rodar direto no Supabase.
--
-- Backfill: usa o vinculo ativo do criador em company_users.
-- ================================================================

ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS company_id UUID;

UPDATE calendar_events ce
SET company_id = cu.company_id
FROM company_users cu
WHERE ce.company_id IS NULL
  AND cu.user_id = ce.created_by
  AND cu.is_active = TRUE;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_calendar_events_company') THEN
    ALTER TABLE calendar_events ADD CONSTRAINT fk_calendar_events_company
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_calendar_events_company ON calendar_events(company_id);
