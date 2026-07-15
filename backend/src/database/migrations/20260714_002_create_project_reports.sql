-- ================================================
-- Relatórios de Projeto (módulo de Relatórios)
-- ================================================
--
-- Um documento CURADO por projeto (project_reports) com uma árvore de itens
-- (project_report_items): etapas ('stage') e, dentro delas, fases ('phase'),
-- cada uma com uma observação escrita pelo ADM. Os itens são semeados a
-- partir das etapas/fases reais (project_stages / project_phases) na 1ª
-- abertura e podem ser editados/estendidos — o ADM pode acrescentar itens que
-- existem só no relatório (ex.: fases futuras após aprovação do cliente).
--
-- As assinaturas (cliente vinculado ao projeto + responsável técnico da
-- empresa) NÃO ficam aqui: são importadas na hora de gerar o PDF.
--
-- Isolamento multi-tenant via Prisma tenant model (company_id injetado pela
-- extensão — ver src/config/prisma.js: 'ProjectReport'/'ProjectReportItem').

CREATE TABLE project_reports (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id)  ON DELETE CASCADE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id)  -- 1 relatório por projeto
);

CREATE INDEX idx_project_reports_company ON project_reports (company_id);

CREATE TABLE project_report_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  report_id    UUID NOT NULL REFERENCES project_reports(id) ON DELETE CASCADE,
  parent_id    UUID REFERENCES project_report_items(id) ON DELETE CASCADE, -- null = etapa; preenchido = fase
  kind         VARCHAR(10)  NOT NULL DEFAULT 'stage',  -- 'stage' | 'phase'
  title        VARCHAR(300) NOT NULL,
  observation  TEXT,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  source_id    UUID,  -- id da etapa/fase real de onde foi semeado (informativo); null se custom
  item_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_project_report_items_company ON project_report_items (company_id);
CREATE INDEX idx_project_report_items_report  ON project_report_items (report_id);
CREATE INDEX idx_project_report_items_parent  ON project_report_items (parent_id);
