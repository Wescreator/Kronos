-- ================================================
-- TABELA: project_members
-- Relação N:N entre projetos e usuários da equipe
-- ================================================

CREATE TABLE project_members (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  role       VARCHAR(50) NOT NULL DEFAULT 'member',
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, user_id)
);

CREATE INDEX idx_project_members_project ON project_members(project_id);
CREATE INDEX idx_project_members_user    ON project_members(user_id);

-- ================================================
-- TABELA: project_status_history
-- Auditoria de todas as mudanças de status
-- ================================================

CREATE TABLE project_status_history (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id  UUID           NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  from_status project_status,
  to_status   project_status NOT NULL,
  changed_by  UUID           NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  note        TEXT,
  changed_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_proj_status_hist_project ON project_status_history(project_id);
CREATE INDEX idx_proj_status_hist_date    ON project_status_history(changed_at DESC);