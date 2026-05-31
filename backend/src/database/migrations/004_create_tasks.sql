-- ================================================
-- TABELA: tasks
-- Tarefas vinculadas ou não a projetos
-- ================================================

CREATE TYPE task_status AS ENUM (
  'open',
  'in_progress',
  'review',
  'completed',
  'cancelled'
);

CREATE TYPE task_priority AS ENUM (
  'low',
  'medium',
  'high',
  'critical'
);

CREATE TABLE tasks (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title        VARCHAR(300)  NOT NULL,
  description  TEXT,
  project_id   UUID          REFERENCES projects(id) ON DELETE SET NULL,
  status       task_status   NOT NULL DEFAULT 'open',
  priority     task_priority NOT NULL DEFAULT 'medium',
  due_date     DATE,
  completed_at TIMESTAMPTZ,
  created_by   UUID          NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_status     ON tasks(status);
CREATE INDEX idx_tasks_priority   ON tasks(priority);
CREATE INDEX idx_tasks_due_date   ON tasks(due_date);
CREATE INDEX idx_tasks_created_by ON tasks(created_by);

-- ================================================
-- TABELA: task_assignments
-- Quais usuários estão atribuídos a cada tarefa
-- ================================================

CREATE TABLE task_assignments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id     UUID        NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (task_id, user_id)
);

CREATE INDEX idx_task_assign_task ON task_assignments(task_id);
CREATE INDEX idx_task_assign_user ON task_assignments(user_id);

-- ================================================
-- TABELA: task_comments
-- Comentários e histórico de atividades por tarefa
-- ================================================

CREATE TABLE task_comments (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id    UUID        NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  content    TEXT        NOT NULL,
  file_url   TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_task_comments_task ON task_comments(task_id);