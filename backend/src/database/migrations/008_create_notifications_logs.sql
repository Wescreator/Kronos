-- ================================================
-- TABELA: notifications
-- Notificações do sistema para cada usuário
-- ================================================

CREATE TYPE notification_type AS ENUM (
  'task_assigned',
  'task_due',
  'project_update',
  'financial_due',
  'chat_mention',
  'system'
);

CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID              NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        notification_type NOT NULL,
  title       VARCHAR(200)      NOT NULL,
  body        TEXT,
  link        TEXT,
  is_read     BOOLEAN           NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user    ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_date    ON notifications(created_at DESC);

-- ================================================
-- TABELA: activity_logs
-- Histórico auditável de ações no sistema
-- ================================================

CREATE TABLE activity_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID         REFERENCES users(id) ON DELETE SET NULL,
  entity_type VARCHAR(50)  NOT NULL,
  entity_id   UUID,
  action      VARCHAR(50)  NOT NULL,
  payload     JSONB,
  ip_address  INET,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activity_logs_user       ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_entity     ON activity_logs(entity_type, entity_id);
CREATE INDEX idx_activity_logs_date       ON activity_logs(created_at DESC);
-- Índice GIN para busca dentro do payload JSON
CREATE INDEX idx_activity_logs_payload    ON activity_logs USING GIN(payload);