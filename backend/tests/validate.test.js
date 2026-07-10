/**
 * Testes unitários do middleware de validação (Joi): rejeição, strip de
 * campos desconhecidos (anti mass-assignment) e aplicação de defaults.
 */
const { test } = require('node:test')
const assert = require('node:assert/strict')
const Joi = require('joi')

const validate = require('../src/middlewares/validate.middleware')

const schema = Joi.object({
  title:    Joi.string().min(3).required(),
  priority: Joi.string().valid('low', 'medium', 'high').default('medium'),
})

// req/res mínimos para exercitar o middleware sem Express.
const run = (body) => {
  const req = { body }
  let statusCode = null
  let jsonBody = null
  const res = {
    status(code) { statusCode = code; return this },
    json(payload) { jsonBody = payload; return this },
  }
  let nextCalled = false
  validate(schema)(req, res, () => { nextCalled = true })
  return { req, statusCode, jsonBody, nextCalled }
}

test('body inválido → 400 com mensagens, next não é chamado', () => {
  const { statusCode, jsonBody, nextCalled } = run({ title: 'ab' })
  assert.equal(statusCode, 400)
  assert.equal(jsonBody.success, false)
  assert.equal(nextCalled, false)
})

test('campos fora do schema são descartados (anti mass-assignment)', () => {
  const { req, nextCalled } = run({
    title: 'Tarefa válida',
    role: 'admin',            // tentativa de escalar privilégio
    company_id: 'outra-empresa',
  })
  assert.equal(nextCalled, true)
  assert.equal(req.body.role, undefined)
  assert.equal(req.body.company_id, undefined)
  assert.equal(req.body.title, 'Tarefa válida')
})

test('defaults do Joi passam a valer no body validado', () => {
  const { req } = run({ title: 'Tarefa válida' })
  assert.equal(req.body.priority, 'medium')
})
