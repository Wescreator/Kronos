-- ================================================
-- TABELA: revenues
-- Contas a receber com suporte a parcelamento
-- ================================================

CREATE TYPE revenue_status AS ENUM (
  'pending',
  'received',
  'overdue',
  'cancelled'
);

CREATE TABLE revenues (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title           VARCHAR(200)   NOT NULL,
  client          VARCHAR(200),
  project_id      UUID           REFERENCES projects(id) ON DELETE SET NULL,
  total_amount    NUMERIC(15, 2) NOT NULL CHECK (total_amount > 0),
  installments    SMALLINT       NOT NULL DEFAULT 1 CHECK (installments >= 1),
  description     TEXT,
  created_by      UUID           NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_revenues_project_id ON revenues(project_id);
CREATE INDEX idx_revenues_client     ON revenues(client);

-- ================================================
-- TABELA: revenue_installments
-- Cada parcela de uma receita
-- ================================================

CREATE TABLE revenue_installments (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  revenue_id     UUID           NOT NULL REFERENCES revenues(id) ON DELETE CASCADE,
  installment_no SMALLINT       NOT NULL,
  amount         NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
  due_date       DATE           NOT NULL,
  received_date  DATE,
  status         revenue_status NOT NULL DEFAULT 'pending',
  note           TEXT,
  created_at     TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  UNIQUE (revenue_id, installment_no)
);

CREATE INDEX idx_rev_install_revenue    ON revenue_installments(revenue_id);
CREATE INDEX idx_rev_install_status     ON revenue_installments(status);
CREATE INDEX idx_rev_install_due_date   ON revenue_installments(due_date);
-- Índice para DRE: receita é contabilizada no mês do recebimento efetivo
CREATE INDEX idx_rev_install_recv_date  ON revenue_installments(received_date);