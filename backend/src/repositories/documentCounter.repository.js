/**
 * Numeração de documentos (orçamentos, propostas) à prova de corrida.
 *
 * O número sai de um ÚNICO statement atômico: o `ON CONFLICT DO UPDATE` trava a
 * linha do contador, então duas requisições concorrentes da mesma empresa são
 * serializadas pelo Postgres e NUNCA recebem o mesmo número. A garantia vem do
 * banco — não de um SELECT seguido de INSERT no JavaScript, que é justamente o
 * padrão que gerava a corrida.
 *
 * Como o contador só avança, excluir um documento nunca libera o número para
 * reuso (era o bug do antigo `COUNT(*) + 1` dos orçamentos, que colidia sozinho
 * após qualquer exclusão).
 *
 * IMPORTANTE: deve ser chamado DENTRO da transação de criação (recebendo o
 * `client` dela). Assim, se a criação falhar, o incremento sofre rollback junto
 * e o número não é desperdiçado.
 */

// `client` é o cliente da transação em curso (pool.connect()).
const nextNumber = async (client, companyId, docType, year) => {
  const { rows } = await client.query(
    `INSERT INTO document_counters (company_id, doc_type, year, last_number)
     VALUES ($1, $2, $3, 1)
     ON CONFLICT (company_id, doc_type, year)
     DO UPDATE SET last_number = document_counters.last_number + 1
     RETURNING last_number`,
    [companyId, docType, year]
  )
  return rows[0].last_number
}

const pad = (n) => String(n).padStart(4, '0')

// ORC-2026-0001
const nextBudgetNumber = async (client, companyId, year = new Date().getFullYear()) => {
  const seq = await nextNumber(client, companyId, 'budget', year)
  return `ORC-${year}-${pad(seq)}`
}

// 2026-0001 (mantém o formato já usado nas propostas existentes)
const nextProposalNumber = async (client, companyId, year = new Date().getFullYear()) => {
  const seq = await nextNumber(client, companyId, 'proposal', year)
  return `${year}-${pad(seq)}`
}

module.exports = { nextNumber, nextBudgetNumber, nextProposalNumber }
