-- Situação financeira por empresa (editável no painel Admin → aba Financeiro).
-- Colunas na tabela companies, lidas por GET /platform/companies/:id/stats
-- e gravadas por PATCH /platform/companies/:id.
--
-- Aplicar no Supabase (SQL editor) e depois rodar:
--   npm run prisma:pull && npm run prisma:generate
-- (o schema.prisma já foi atualizado com estes campos).

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS financial_status   VARCHAR(30),
  ADD COLUMN IF NOT EXISTS financial_due_date DATE,
  ADD COLUMN IF NOT EXISTS contracted_at      DATE;
