require('dotenv').config() // precisa vir antes de config/database (lê DATABASE_URL)

const test = require('node:test')
const assert = require('node:assert')
const { EventEmitter } = require('events')

const pool = require('../src/config/database')
const idempotency = require('../src/middlewares/idempotency.middleware')

/**
 * Testes do middleware de idempotência (anti duplo envio).
 *
 * ATENÇÃO — exceção consciente à convenção do projeto: os demais testes de
 * integração só LEEM o banco. Estes precisam escrever, porque o mecanismo que
 * está sendo testado É o índice UNIQUE do Postgres — testá-lo com um banco
 * falso não provaria nada (a garantia vem do banco, não do JavaScript).
 *
 * A escrita é restrita à tabela de infraestrutura `idempotency_keys`; nenhuma
 * tabela de negócio é tocada (o "controller" aqui é falso). Todas as chaves
 * criadas são prefixadas com `test-idem-` e removidas no final.
 */

const KEY_PREFIX = 'test-idem-'
const mw = idempotency()
const sleep = (ms) => new Promise(r => setTimeout(r, ms))

function makeRes() {
  const res = new EventEmitter()
  res.statusCode = 200
  res.writableEnded = false
  res.headers = {}
  res.body = null
  res.status = (c) => { res.statusCode = c; return res }
  res.set = (k, v) => { res.headers[k] = v; return res }
  res.json = (b) => { res.body = b; res.writableEnded = true; res.emit('finish'); return res }
  return res
}

function makeReq(userId, companyId, key, body) {
  return {
    headers: key ? { 'idempotency-key': key } : {},
    user: { user_id: userId },
    tenant: companyId ? { id: companyId } : null,
    method: 'POST',
    baseUrl: '/api/financial',
    path: '/expenses',
    route: { path: '/expenses' },
    body,
  }
}

// Executa middleware + "controller" falso, aguardando a resposta.
function run(req, res, controller) {
  return new Promise((resolve, reject) => {
    mw(req, res, () => {
      Promise.resolve(controller(req, res)).then(resolve).catch(reject)
    }).then(() => { if (res.writableEnded) resolve() })
  })
}

let userId, companyId

test.before(async () => {
  const { rows } = await pool.query(
    'SELECT id, company_id FROM users WHERE company_id IS NOT NULL LIMIT 1'
  )
  assert.ok(rows[0], 'é necessário ao menos um usuário vinculado a uma empresa')
  userId = rows[0].id
  companyId = rows[0].company_id
})

test.after(async () => {
  await pool.query(`DELETE FROM idempotency_keys WHERE idem_key LIKE '${KEY_PREFIX}%'`)
  await pool.end()
})

const PAYLOAD = { title: 'Despesa', amount: 100 }
const created = (id) => (req, res) => res.status(201).json({ success: true, expense: { id } })

test('repetição da mesma chave devolve a resposta original SEM reprocessar', async () => {
  const key = KEY_PREFIX + 'replay-' + Date.now()
  let runs = 0

  const res1 = makeRes()
  await run(makeReq(userId, companyId, key, PAYLOAD), res1, (req, res) => {
    runs++; return created('exp-1')(req, res)
  })
  await sleep(500) // a resposta é persistida de forma assíncrona

  const res2 = makeRes()
  await run(makeReq(userId, companyId, key, PAYLOAD), res2, (req, res) => {
    runs++; return created('exp-2')(req, res)
  })

  assert.equal(runs, 1, 'o controller não pode rodar duas vezes')
  assert.equal(res2.statusCode, 201)
  assert.deepEqual(res2.body, res1.body, 'a 2ª resposta deve ser idêntica à 1ª')
  assert.equal(res2.headers['Idempotent-Replay'], 'true')
})

test('duas requisições concorrentes: a 2ª recebe 409 e não reprocessa', async () => {
  const key = KEY_PREFIX + 'concur-' + Date.now()
  let runs = 0

  const slow = async (req, res) => {
    runs++
    await sleep(600)
    res.status(201).json({ success: true, expense: { id: 'exp-slow' } })
  }

  const resA = makeRes()
  const resB = makeRes()

  const pA = run(makeReq(userId, companyId, key, PAYLOAD), resA, slow)
  await sleep(80) // B chega com A ainda em processamento
  const pB = run(makeReq(userId, companyId, key, PAYLOAD), resB, slow)

  await Promise.all([pA, pB])

  assert.equal(runs, 1, 'apenas UMA das duas pode chegar ao controller')
  assert.equal(resA.statusCode, 201)
  assert.equal(resB.statusCode, 409, 'a requisição em duplicata deve receber 409')
  assert.equal(resB.body.success, false)
})

test('mesma chave com payload diferente → 422 (uso indevido do cliente)', async () => {
  const key = KEY_PREFIX + 'mismatch-' + Date.now()

  const res1 = makeRes()
  await run(makeReq(userId, companyId, key, PAYLOAD), res1, created('exp-1'))
  await sleep(500)

  const res2 = makeRes()
  await run(
    makeReq(userId, companyId, key, { title: 'Outra', amount: 999 }),
    res2,
    created('exp-2')
  )

  assert.equal(res2.statusCode, 422)
})

test('resposta de ERRO libera a chave para uma nova tentativa real', async () => {
  const key = KEY_PREFIX + 'erro-' + Date.now()

  const res1 = makeRes()
  await run(makeReq(userId, companyId, key, PAYLOAD), res1, (req, res) =>
    res.status(400).json({ success: false, message: 'Erro de validação' })
  )
  await sleep(500)

  const { rows } = await pool.query(
    'SELECT count(*)::int AS c FROM idempotency_keys WHERE idem_key = $1', [key]
  )
  assert.equal(rows[0].c, 0, 'a chave não pode ficar presa após um erro')

  // O retry com a MESMA chave precisa realmente executar.
  let runs = 0
  const res2 = makeRes()
  await run(makeReq(userId, companyId, key, PAYLOAD), res2, (req, res) => {
    runs++; return created('exp-retry')(req, res)
  })

  assert.equal(runs, 1, 'o retry após erro deve chegar ao controller')
  assert.equal(res2.statusCode, 201)
})

test('sem o header: passa direto (compatível com clientes antigos)', async () => {
  let runs = 0
  const res = makeRes()
  await run(makeReq(userId, companyId, null, PAYLOAD), res, (req, res) => {
    runs++; return created('exp-sem-chave')(req, res)
  })

  assert.equal(runs, 1)
  assert.equal(res.statusCode, 201)
})

test('chaves são isoladas por usuário (a de um não colide com a de outro)', async () => {
  const key = KEY_PREFIX + 'escopo-' + Date.now()
  const { rows } = await pool.query(
    'SELECT id FROM users WHERE company_id IS NOT NULL AND id <> $1 LIMIT 1', [userId]
  )
  if (!rows[0]) return // ambiente com um único usuário — nada a verificar

  const res1 = makeRes()
  await run(makeReq(userId, companyId, key, PAYLOAD), res1, created('exp-user-1'))
  await sleep(500)

  // MESMA chave, OUTRO usuário → precisa processar normalmente.
  let runs = 0
  const res2 = makeRes()
  await run(makeReq(rows[0].id, companyId, key, PAYLOAD), res2, (req, res) => {
    runs++; return created('exp-user-2')(req, res)
  })

  assert.equal(runs, 1, 'a chave de um usuário não pode bloquear a de outro')
  assert.equal(res2.statusCode, 201)
})
