-- ================================================
-- ALTER: import_staging_rows + duplicate_reason
-- (Importação de Planilhas — Fase 3, preview/duplicatas)
-- ================================================
--
-- Qual critério marcou a linha como possível duplicata (spec 7.2):
--   despesa_existente  → expenses com title + amount + due_date idênticos
--   parcela_existente  → revenues com mesmo title e parcela com mesmo
--                        due_date + amount
--   cpf_cnpj           → clients_leads com mesmo cpf_cnpj
--   email              → clients_leads com mesmo email — caso especial: o
--                        banco tem UNIQUE (company_id, email), então
--                        "importar mesmo assim" fica indisponível na UI e
--                        é rejeitado no backend (só pular ou atualizar).

ALTER TABLE import_staging_rows
  ADD COLUMN IF NOT EXISTS duplicate_reason VARCHAR(30)
  CHECK (duplicate_reason IN ('despesa_existente', 'parcela_existente', 'cpf_cnpj', 'email'));
