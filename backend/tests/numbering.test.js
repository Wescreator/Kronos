require('dotenv').config() // precisa vir antes de config/database (lê DATABASE_URL)

const test = require('node:test')
const assert = require('node:assert')

const pool = require('../src/config/database')
const counterRepo = require('../src/repositories/documentCounter.repository')

/**
 * Numeração de documentos e deduplicação de notificações.
 *
 * Escritas neste arquivo são deliberadamente inofensivas:
 *
 *  - O contador é exercitado com um doc_type sintético ('__test__'). A PK é
 *    (company_id, doc_type, year), então os contadores REAIS de 'proposal' e
 *    'budget' não são tocados — nenhum número de proposta é queimado.
 *  - Os testes de notificação rodam dentro de uma transação com ROLLBACK: nada
 *    é persistido.
 */

const TEST_DOC = '__test__'
let companyId, userId

test.before(async () => {
  const { rows } = await pool.query(
    'SELECT id, company_id FROM users WHERE company_id IS NOT NULL LIMIT 1'
  )
  assert.ok(rows[0], 'é necessário ao menos um usuário vinculado a uma empresa')
  userId = rows[0].id
  companyId = rows[0].company_id
})

test.after(async () => {
  await pool.query('DELETE FROM document_counters WHERE doc_type = $1', [TEST_DOC])
  await pool.end()
})

test('20 criações CONCORRENTES recebem números distintos e sequenciais', async () => {
  const N = 20

  // Cada "requisição" abre sua própria conexão/transação, como no mundo real.
  const pedirNumero = async () => {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      const n = await counterRepo.nextNumber(client, companyId, TEST_DOC, 2026)
      await client.query('COMMIT')
      return n
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  }

  const numeros = await Promise.all(Array.from({ length: N }, pedirNumero))

  const unicos = new Set(numeros)
  assert.equal(unicos.size, N, `os ${N} números precisam ser distintos — nenhum repetido`)

  // Sem buracos: 1..N
  const ordenados = [...numeros].sort((a, b) => a - b)
  assert.deepEqual(ordenados, Array.from({ length: N }, (_, i) => i + 1))
})

test('rollback devolve o número: a criação abortada não queima a sequência', async () => {
  const ano = 2099 // contador virgem, isolado dos demais testes

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const n1 = await counterRepo.nextNumber(client, companyId, TEST_DOC, ano)
    assert.equal(n1, 1)
    await client.query('ROLLBACK') // simula falha na criação do documento
  } finally {
    client.release()
  }

  // O próximo pedido deve receber 1 de novo — o número não foi desperdiçado.
  const client2 = await pool.connect()
  try {
    await client2.query('BEGIN')
    const n2 = await counterRepo.nextNumber(client2, companyId, TEST_DOC, ano)
    assert.equal(n2, 1, 'o número da transação revertida deve voltar a ficar disponível')
    await client2.query('ROLLBACK')
  } finally {
    client2.release()
  }
})

test('índice parcial deduplica financial_due (o caso do cron)', async () => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const link = '/app/financial/expenses?highlight=teste-' + Date.now()
    const insert = () => client.query(
      `INSERT INTO notifications (company_id, user_id, type, title, body, link)
       VALUES ($1,$2,'financial_due','Despesa vencida',NULL,$3)
       ON CONFLICT (company_id, user_id, type, link)
         WHERE type = 'financial_due'
         DO NOTHING
       RETURNING id`,
      [companyId, userId, link]
    )

    const primeira = await insert()
    const segunda  = await insert() // o cron rodando de novo (ou 2ª instância)

    assert.equal(primeira.rowCount, 1, 'a 1ª deve criar')
    assert.equal(segunda.rowCount, 0, 'a 2ª não pode duplicar')

    await client.query('ROLLBACK') // nada persiste
  } finally {
    client.release()
  }
})

test('índice parcial NÃO bloqueia notificações repetidas de chat (regressão crítica)', async () => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Duas mensagens na MESMA sala: mesmo user, mesmo type, MESMO link.
    // Um UNIQUE amplo quebraria isto — cada mensagem precisa notificar.
    const link = '/app/chat/sala-teste-' + Date.now()
    const insert = (titulo) => client.query(
      `INSERT INTO notifications (company_id, user_id, type, title, body, link)
       VALUES ($1,$2,'chat_mention',$3,NULL,$4)
       RETURNING id`,
      [companyId, userId, titulo, link]
    )

    const msg1 = await insert('Nova mensagem de Ana')
    const msg2 = await insert('Nova mensagem de Ana')

    assert.equal(msg1.rowCount, 1)
    assert.equal(msg2.rowCount, 1, 'a 2ª mensagem da mesma sala TEM que notificar também')

    await client.query('ROLLBACK')
  } finally {
    client.release()
  }
})
