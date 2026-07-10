/**
 * Testes de integração dos "portões" de acesso da API: escopo do token
 * (interno x portal do cliente), roles por rota e isolamento básico.
 *
 * Usa o app Express real (src/app.js) via supertest — sem abrir porta.
 * As rotas com tenantMiddleware consultam o banco real (somente leitura)
 * para carregar a empresa, então os testes exigem DATABASE_URL válida e
 * ao menos uma empresa ativa (mesmo requisito do `npm run dev`).
 *
 * Rodar: npm test
 */
const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const request = require('supertest')
const jwt = require('jsonwebtoken')

const app = require('../src/app')
const jwtConfig = require('../src/config/jwt')
const pool = require('../src/config/database')

const FAKE_USER = '00000000-0000-0000-0000-000000000001'
let companyId

const token = ({ role = 'employee', scope = 'company', company = companyId } = {}) =>
  jwt.sign(
    { user_id: FAKE_USER, company_id: company, scope, role },
    jwtConfig.secret,
    { expiresIn: '5m' }
  )

before(async () => {
  const { rows } = await pool.query(
    'SELECT id FROM companies WHERE is_active = TRUE LIMIT 1'
  )
  companyId = rows[0]?.id
  assert.ok(companyId, 'os testes precisam de ao menos uma empresa ativa no banco')
})

after(async () => {
  await pool.end()
})

test('health check responde 200 sem autenticação', async () => {
  const res = await request(app).get('/api/health')
  assert.equal(res.status, 200)
  assert.equal(res.body.status, 'ok')
})

test('sem token → 401', async () => {
  const res = await request(app).get('/api/tasks')
  assert.equal(res.status, 401)
})

test('token com scope "client" (portal) é recusado nas rotas internas', async () => {
  for (const path of ['/api/tasks', '/api/clients', '/api/budgets', '/api/financial/dashboard']) {
    const res = await request(app)
      .get(path)
      .set('Authorization', `Bearer ${token({ scope: 'client', role: null })}`)
    assert.equal(res.status, 403, `${path} deveria recusar token do portal`)
  }
})

test('token com scope "client" passa do gate em /api/posts (rota compartilhada)', async () => {
  const res = await request(app)
    .get('/api/posts')
    .set('Authorization', `Bearer ${token({ scope: 'client', role: null })}`)
  // O gate de escopo não pode ser o bloqueio (403 = recusado pelo gate).
  assert.notEqual(res.status, 403)
})

test('financeiro é exclusivo do admin: owner recebe 403, admin passa', async () => {
  const owner = await request(app)
    .get('/api/financial/dashboard')
    .set('Authorization', `Bearer ${token({ role: 'owner' })}`)
  assert.equal(owner.status, 403)

  const admin = await request(app)
    .get('/api/financial/dashboard')
    .set('Authorization', `Bearer ${token({ role: 'admin' })}`)
  assert.equal(admin.status, 200)
})

test('role legada "member" não é mais aceita na agenda', async () => {
  const res = await request(app)
    .get('/api/calendar/month?year=2026&month=7')
    .set('Authorization', `Bearer ${token({ role: 'member' })}`)
  assert.equal(res.status, 403)
})

test('employee acessa agenda e dashboard de tarefas (fontes do TeamDashboard)', async () => {
  const agenda = await request(app)
    .get('/api/calendar/month?year=2026&month=7')
    .set('Authorization', `Bearer ${token({ role: 'employee' })}`)
  assert.equal(agenda.status, 200)

  const stats = await request(app)
    .get('/api/tasks/dashboard')
    .set('Authorization', `Bearer ${token({ role: 'employee' })}`)
  assert.equal(stats.status, 200)
  assert.ok(stats.body.stats, 'resposta deve conter { stats }')
})

test('owner mantém acesso a propostas e orçamentos', async () => {
  for (const path of ['/api/proposals', '/api/budgets']) {
    const res = await request(app)
      .get(path)
      .set('Authorization', `Bearer ${token({ role: 'owner' })}`)
    assert.equal(res.status, 200, `${path} deveria aceitar owner`)
  }
})

test('header X-Impersonate-Company malformado → 400 (não 500)', async () => {
  const res = await request(app)
    .get('/api/tasks')
    .set('Authorization', `Bearer ${token({ scope: 'global', role: 'developer', company: null })}`)
    .set('X-Impersonate-Company', 'nao-e-um-uuid')
  assert.equal(res.status, 400)
})

test('empresa de outro tenant: token com company_id inexistente → 404, sem vazar dados', async () => {
  const res = await request(app)
    .get('/api/tasks')
    .set('Authorization', `Bearer ${token({ company: '00000000-0000-0000-0000-0000000000ff' })}`)
  assert.equal(res.status, 404)
})
