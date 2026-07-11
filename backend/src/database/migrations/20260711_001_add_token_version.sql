-- M1 — Invalidação de sessão (token_version)
--
-- Adiciona a coluna que permite invalidar refresh tokens ativos no reset de
-- senha e no logout "de todos os dispositivos". Aditiva, idempotente e
-- reversível (DROP COLUMN). Enquanto esta coluna não existir, o código de
-- invalidação de sessão fica INATIVO (degradação graciosa) — nada quebra.
--
-- Aplicar diretamente no Supabase (convenção atual do projeto; o runner
-- legado está fora de sincronia com o banco real).

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS token_version integer NOT NULL DEFAULT 0;

-- Rollback:
-- ALTER TABLE public.users DROP COLUMN IF EXISTS token_version;
