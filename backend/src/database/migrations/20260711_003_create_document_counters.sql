-- Numeração de documentos (orçamentos e propostas) à prova de corrida.
--
-- PROBLEMAS QUE RESOLVE
--
-- 1. budgets: nextBudgetNumber usava `SELECT COUNT(*) + 1`. Além da corrida
--    entre requisições concorrentes, o COUNT REUSA números após exclusões:
--    com 10 orçamentos, apagar o nº 3 faz o próximo virar 0010 — que já
--    existe → violação do UNIQUE → 500 em TODA nova criação. Bug latente que
--    não depende de concorrência nenhuma.
--
-- 2. proposals: a função next_proposal_number(year) faz MAX(...)+1 em plpgsql
--    (read-then-write, sem lock) e — pior — NÃO filtra por empresa, embora o
--    UNIQUE seja (company_id, proposal_number). A numeração era global entre
--    tenants: a empresa B consumia números que a empresa A via como saltos,
--    vazando volume de atividade entre clientes.
--
-- COMO FUNCIONA
--
-- Um contador por (empresa, tipo de documento, ano). O próximo número sai de
-- um ÚNICO statement atômico:
--
--   INSERT ... VALUES (..., 1)
--   ON CONFLICT (company_id, doc_type, year)
--   DO UPDATE SET last_number = document_counters.last_number + 1
--   RETURNING last_number
--
-- O ON CONFLICT DO UPDATE trava a linha do contador, então requisições
-- concorrentes da MESMA empresa são serializadas pelo banco — nunca recebem o
-- mesmo número. E como o contador só avança, excluir um documento jamais
-- libera o número para reuso.
--
-- Chamado DENTRO da transação de criação: se a criação falhar, o incremento
-- também sofre rollback e o número não é desperdiçado.

CREATE TABLE IF NOT EXISTS document_counters (
  company_id  UUID        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  doc_type    VARCHAR(20) NOT NULL,          -- 'budget' | 'proposal'
  year        INTEGER     NOT NULL,
  last_number INTEGER     NOT NULL DEFAULT 0,

  PRIMARY KEY (company_id, doc_type, year)
);

-- ── Backfill: continua a numeração de onde cada empresa parou ───────────────
-- Sem isto, uma empresa que já tem a proposta 2026-0001 receberia 2026-0001 de
-- novo na próxima criação e bateria no UNIQUE.

-- As classes são escritas como [0-9] e NÃO como \d de propósito: `\d` depende
-- de como a barra invertida é interpretada no literal e, se a regex falhar, o
-- backfill casa ZERO linhas em silêncio — o contador começaria do zero e a
-- próxima proposta colidiria com uma já existente (violação do UNIQUE → 500).
-- [0-9] não tem essa ambiguidade.

INSERT INTO document_counters (company_id, doc_type, year, last_number)
SELECT
  company_id,
  'proposal',
  CAST(SUBSTRING(proposal_number FROM '^([0-9]{4})') AS INT),
  MAX(CAST(SUBSTRING(proposal_number FROM '([0-9]+)$') AS INT))
FROM proposals
WHERE proposal_number ~ '^[0-9]{4}-[0-9]+$'
GROUP BY company_id, CAST(SUBSTRING(proposal_number FROM '^([0-9]{4})') AS INT)
ON CONFLICT (company_id, doc_type, year) DO NOTHING;

INSERT INTO document_counters (company_id, doc_type, year, last_number)
SELECT
  company_id,
  'budget',
  CAST(SUBSTRING(budget_number FROM '^ORC-([0-9]{4})-') AS INT),
  MAX(CAST(SUBSTRING(budget_number FROM '([0-9]+)$') AS INT))
FROM budgets
WHERE budget_number ~ '^ORC-[0-9]{4}-[0-9]+$'
GROUP BY company_id, CAST(SUBSTRING(budget_number FROM '^ORC-([0-9]{4})-') AS INT)
ON CONFLICT (company_id, doc_type, year) DO NOTHING;

-- NOTA: a função next_proposal_number(integer) deixa de ser usada pelo código,
-- mas NÃO é removida aqui de propósito — derrubá-la é irreversível e pode haver
-- consulta/relatório externo apoiado nela. Depois de a numeração nova estar
-- rodando em produção, ela pode ser descartada com:
--     DROP FUNCTION IF EXISTS public.next_proposal_number(integer);
