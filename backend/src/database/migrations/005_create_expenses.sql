-- ================================================
-- TABELA: expense_categories
-- Tipos de despesa criados pelo usuário
-- ================================================

CREATE TABLE expense_categories (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       VARCHAR(100) NOT NULL UNIQUE,
  color      VARCHAR(7)   NOT NULL DEFAULT '#6366f1',
  created_by UUID         NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ================================================
-- TABELA: expenses
-- Contas a pagar do sistema financeiro
-- ================================================

CREATE TYPE expense_status AS ENUM (
  'pending',
  'paid',
  'overdue',
  'cancelled'
);

CREATE TABLE expenses (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title        VARCHAR(200)   NOT NULL,
  description  TEXT,
  project_id   UUID           REFERENCES projects(id) ON DELETE SET NULL,
  category_id  UUID           REFERENCES expense_categories(id) ON DELETE SET NULL,
  amount       NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
  due_date     DATE           NOT NULL,
  paid_date    DATE,
  status       expense_status NOT NULL DEFAULT 'pending',
  receipt_url  TEXT,
  created_by   UUID           NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_expenses_status     ON expenses(status);
CREATE INDEX idx_expenses_due_date   ON expenses(due_date);
CREATE INDEX idx_expenses_project_id ON expenses(project_id);
CREATE INDEX idx_expenses_category   ON expenses(category_id);
-- Índice para relatório mensal de despesas
CREATE INDEX idx_expenses_paid_date  ON expenses(paid_date);