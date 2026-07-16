-- ================================================
-- ALTER: clients_leads + cpf_cnpj
-- (Importação de Planilhas — critério de duplicata de Clientes)
-- ================================================
--
-- Somente dígitos, normalizado na gravação (CPF = 11, CNPJ = 14).
-- Índice simples (NÃO unique): a detecção de duplicata acontece na
-- importação; unicidade forçada quebraria cadastros legados/manuais
-- que não têm o campo preenchido.

ALTER TABLE clients_leads ADD COLUMN IF NOT EXISTS cpf_cnpj VARCHAR(14);

CREATE INDEX IF NOT EXISTS idx_clients_leads_company_cpf
  ON clients_leads (company_id, cpf_cnpj)
  WHERE cpf_cnpj IS NOT NULL;
