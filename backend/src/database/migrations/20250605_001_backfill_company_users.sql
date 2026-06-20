-- ================================================================
-- Backfill de company_users a partir de users.company_id
--
-- Usuarios antigos "pertenciam" a uma empresa apenas pela coluna
-- users.company_id, sem linha em company_users (fonte de verdade do
-- multi-tenant). Isso faz com que nao aparecam no painel /admin e, em
-- alguns casos, nao resolvam a empresa no login.
--
-- Este script cria os vinculos faltantes. E ADITIVO e idempotente:
-- nao apaga nada e nao duplica (ON CONFLICT). Ignora papeis globais
-- (developer/support), que nao pertencem a empresa.
-- ================================================================

INSERT INTO public.company_users (company_id, user_id, role, is_active)
SELECT
  u.company_id,
  u.id,
  COALESCE(NULLIF(u.role, ''), 'employee'),
  COALESCE(u.is_active, TRUE)
FROM public.users u
LEFT JOIN public.company_users cu
  ON cu.user_id = u.id AND cu.company_id = u.company_id
WHERE u.company_id IS NOT NULL
  AND cu.user_id IS NULL
  AND u.role NOT IN ('developer', 'support')
ON CONFLICT (company_id, user_id) DO NOTHING;

-- Verificacao: deve voltar 0 (todos os usuarios de empresa agora tem vinculo)
--   SELECT COUNT(*) FROM public.users u
--   LEFT JOIN public.company_users cu ON cu.user_id = u.id
--   WHERE u.company_id IS NOT NULL AND cu.user_id IS NULL
--     AND u.role NOT IN ('developer','support');
