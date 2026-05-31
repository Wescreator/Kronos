-- ================================================
-- TABELA: projects
-- Projetos corporativos com orçamento e status
-- ================================================

CREATE TYPE project_status AS ENUM (
  'planning',
  'in_progress',
  'review',
  'paused',
  'completed',
  'cancelled'
);

CREATE TABLE projects (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title           VARCHAR(200)     NOT NULL,
  client          VARCHAR(200),
  description     TEXT,
  cover_url       TEXT,
  status          project_status   NOT NULL DEFAULT 'planning',
  progress        SMALLINT         NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  budget          NUMERIC(15, 2)   NOT NULL DEFAULT 0,
  start_date      DATE,
  expected_date   DATE,
  completed_date  DATE,
  owner_id        UUID             NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_by      UUID             NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_projects_status   ON projects(status);
CREATE INDEX idx_projects_owner_id ON projects(owner_id);
CREATE INDEX idx_projects_created_at ON projects(created_at DESC);

COMMENT ON TABLE  projects            IS 'Projetos corporativos';
COMMENT ON COLUMN projects.progress   IS 'Percentual de conclusão 0-100';
COMMENT ON COLUMN projects.budget     IS 'Orçamento aprovado em reais';
COMMENT ON COLUMN projects.owner_id   IS 'Responsável principal pelo projeto';