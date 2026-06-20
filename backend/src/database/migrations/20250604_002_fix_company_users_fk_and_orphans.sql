-- ================================================================
-- Corrige a FK de company_users.user_id E os vinculos orfaos, na
-- ordem correta e de forma atomica.
--
-- Substitui os scripts 20250604_000 e 20250604_001 (NAO rode aqueles
-- separadamente - a ordem deles causava violacao de FK).
--
-- Sequencia:
--   1. Remove a FK (que apontava para auth.users).
--   2. Re-mapeia/desduplica os orfaos para public.users (por e-mail).
--   3. Recria a FK apontando para public.users.
--
-- Se restar qualquer orfao apos o passo 2, o passo 3 falha e a
-- transacao inteira sofre ROLLBACK (nada e alterado). Idempotente.
-- ================================================================

BEGIN;

-- 1) Remove a constraint atual (aponta para auth.users)
ALTER TABLE public.company_users
  DROP CONSTRAINT IF EXISTS company_users_user_id_fkey;

-- 2a) Remove orfaos que se tornariam duplicados (usuario publico ja
--     vinculado aquela empresa)
DELETE FROM public.company_users cu
USING auth.users au, public.users pu
WHERE cu.user_id = au.id
  AND NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = cu.user_id)
  AND lower(pu.email) = lower(au.email)
  AND EXISTS (
    SELECT 1 FROM public.company_users x
    WHERE x.company_id = cu.company_id AND x.user_id = pu.id
  );

-- 2b) Re-mapeia os demais orfaos para o id correto de public.users
UPDATE public.company_users cu
SET user_id = pu.id
FROM auth.users au
JOIN public.users pu ON lower(pu.email) = lower(au.email)
WHERE cu.user_id = au.id
  AND NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = cu.user_id);

-- 3) Recria a FK apontando para public.users
ALTER TABLE public.company_users
  ADD CONSTRAINT company_users_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

COMMIT;
