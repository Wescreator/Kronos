-- Idempotência de requisições de criação (anti duplo envio).
--
-- Problema que resolve: o mesmo POST podia ser processado duas vezes (duplo
-- clique, duas abas, retry após timeout aparente, replay), criando DUAS
-- despesas/receitas/tarefas para UMA única intenção do usuário.
--
-- Como funciona: o cliente gera uma chave (UUID) por INTENÇÃO — no momento em
-- que o formulário é aberto, não no clique — e a envia no header
-- `Idempotency-Key`. A primeira requisição insere a linha aqui (o UNIQUE abaixo
-- é o que serializa a corrida) e, ao concluir, guarda a resposta. Uma repetição
-- da MESMA chave recebe a resposta original de volta, sem reprocessar.
--
-- Importante: isto NÃO impede o usuário de criar registros semelhantes de
-- propósito. Reabrir o formulário gera uma chave nova = uma intenção nova.

CREATE TABLE IF NOT EXISTS idempotency_keys (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Escopo: a chave pertence ao usuário que a emitiu. company_id é NULL para
  -- usuários de escopo global (developer) operando fora de uma empresa.
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id      UUID REFERENCES companies(id) ON DELETE CASCADE,

  idem_key        VARCHAR(120) NOT NULL,

  -- Identificam a requisição para detectar reuso indevido da mesma chave em
  -- outro endpoint ou com outro payload (erro de cliente → 422).
  endpoint        VARCHAR(200) NOT NULL,
  request_hash    VARCHAR(64)  NOT NULL,

  -- 'processing' enquanto a 1ª requisição roda; 'completed' quando respondeu 2xx.
  -- Respostas de ERRO não são gravadas: a linha é removida para que o usuário
  -- possa efetivamente tentar de novo.
  status          VARCHAR(20) NOT NULL DEFAULT 'processing',

  response_status INTEGER,
  response_body   JSONB,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ
);

-- O coração do mecanismo: duas requisições concorrentes com a mesma chave
-- disputam este índice, e o Postgres garante que só UMA insere. A perdedora
-- cai no caminho de "duplicata" (replay ou 409). Sem este UNIQUE, o middleware
-- vira um check-then-insert e volta a ter race condition.
CREATE UNIQUE INDEX IF NOT EXISTS idempotency_keys_user_key_uniq
  ON idempotency_keys (user_id, idem_key);

-- Suporte à limpeza periódica por idade.
CREATE INDEX IF NOT EXISTS idempotency_keys_created_at_idx
  ON idempotency_keys (created_at);
