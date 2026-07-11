-- Data do último pagamento da empresa (gestão financeira do Developer no
-- painel Admin → aba Financeiro). A partir dela deriva-se a situação
-- "adimplente" (pagamento no mês/ano corrente) ou "inadimplente" (mês virou).
-- Essa situação é apenas gerencial: NÃO bloqueia o acesso da empresa ao sistema.
--
-- Aplicar no Supabase (SQL editor) e depois rodar:
--   npm run prisma:pull && npm run prisma:generate
-- (o schema.prisma já foi atualizado com este campo).

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS last_payment_date DATE;
