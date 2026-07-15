/**
 * Testes unitários do validador do apontamento de horas
 * (src/validators/timeEntry.validator.js). O start só aceita task_id (uuid);
 * qualquer outro campo é descartado (stripUnknown) — o project_id é derivado
 * da tarefa no service, nunca vindo do cliente.
 *
 * Não toca o banco.
 */
const { test } = require('node:test')
const assert = require('node:assert/strict')

const V = require('../src/validators/timeEntry.validator')

// Mesmas opções do middleware validate (stripUnknown + abortEarly:false).
const run = (body) => V.start.validate(body, { abortEarly: false, stripUnknown: true })

const UUID = '11111111-1111-1111-1111-111111111111'

test('start: task_id uuid válido passa', () => {
  const { error, value } = run({ task_id: UUID })
  assert.equal(error, undefined)
  assert.equal(value.task_id, UUID)
})

test('start: sem task_id → erro', () => {
  const { error } = run({})
  assert.ok(error, 'task_id é obrigatório')
})

test('start: task_id que não é uuid → erro', () => {
  const { error } = run({ task_id: 'nao-e-uuid' })
  assert.ok(error, 'task_id precisa ser uuid')
})

test('start: campos extras são descartados (project_id NÃO vem do cliente)', () => {
  const { error, value } = run({
    task_id: UUID,
    project_id: '22222222-2222-2222-2222-222222222222', // deve ser ignorado
    user_id: '33333333-3333-3333-3333-333333333333',    // deve ser ignorado
    duration_seconds: 99999,                             // deve ser ignorado
  })
  assert.equal(error, undefined)
  assert.equal(value.task_id, UUID)
  assert.equal(value.project_id, undefined)
  assert.equal(value.user_id, undefined)
  assert.equal(value.duration_seconds, undefined)
})
