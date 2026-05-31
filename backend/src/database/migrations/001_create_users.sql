-- ================================================
-- TABELA: users
-- Armazena todos os usuários do sistema
-- ================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(150)        NOT NULL,
  email         VARCHAR(255)        NOT NULL UNIQUE,
  password_hash VARCHAR(255)        NOT NULL,
  role          VARCHAR(50)         NOT NULL DEFAULT 'member',
  position      VARCHAR(100),
  phone         VARCHAR(30),
  avatar_url    TEXT,
  admitted_at   DATE,
  is_active     BOOLEAN             NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

-- role pode ser: admin, manager, member
CREATE INDEX idx_users_email    ON users(email);
CREATE INDEX idx_users_is_active ON users(is_active);

COMMENT ON TABLE  users              IS 'Usuários do sistema Kronos';
COMMENT ON COLUMN users.role        IS 'admin | manager | member';
COMMENT ON COLUMN users.position    IS 'Cargo do usuário na empresa';