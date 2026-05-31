-- ================================================
-- TABELA: chat_rooms
-- Salas de conversa privadas e grupos
-- ================================================

CREATE TYPE room_type AS ENUM ('private', 'group');

CREATE TABLE chat_rooms (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(100),
  type        room_type   NOT NULL DEFAULT 'private',
  avatar_url  TEXT,
  created_by  UUID        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chat_rooms_type ON chat_rooms(type);

-- ================================================
-- TABELA: chat_room_members
-- Participantes de cada sala
-- ================================================

CREATE TABLE chat_room_members (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id   UUID        NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id   UUID        NOT NULL REFERENCES users(id)      ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (room_id, user_id)
);

CREATE INDEX idx_chat_room_members_room ON chat_room_members(room_id);
CREATE INDEX idx_chat_room_members_user ON chat_room_members(user_id);

-- ================================================
-- TABELA: chat_messages
-- Mensagens com suporte a arquivos
-- ================================================

CREATE TABLE chat_messages (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id    UUID        NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id    UUID        NOT NULL REFERENCES users(id)      ON DELETE RESTRICT,
  content    TEXT,
  file_url   TEXT,
  file_name  VARCHAR(255),
  file_type  VARCHAR(100),
  is_deleted BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chat_messages_room ON chat_messages(room_id);
CREATE INDEX idx_chat_messages_date ON chat_messages(created_at DESC);