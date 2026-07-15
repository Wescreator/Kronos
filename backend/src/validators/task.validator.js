const Joi = require('joi')

// due_date é uma data pura (YYYY-MM-DD). Mantida como STRING de propósito:
// Joi.date() coagia "2026-07-15" para um Date em meia-noite UTC e, ao gravar
// na coluna DATE num servidor a oeste de UTC (ex.: America/Sao_Paulo), o
// Postgres convertia para o dia ANTERIOR (bug de fuso: o prazo voltava 1 dia
// a cada criação/edição). Como string literal, o Postgres grava a data
// exatamente como veio. '' é aceito e normalizado para null no service.
const dueDate = Joi.string()
  .pattern(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD')
  .optional()
  .allow(null, '')
  .messages({ 'string.pattern.name': 'due_date deve estar no formato YYYY-MM-DD' })

const create = Joi.object({
  title:       Joi.string().min(3).max(300).required(),
  description: Joi.string().optional().allow(''),
  project_id:  Joi.string().uuid().optional().allow(null),
  priority:    Joi.string().valid('low','medium','high','critical').default('medium'),
  due_date:    dueDate,
  assignees:   Joi.array().items(Joi.string().uuid()).optional()
})

const update = Joi.object({
  title:       Joi.string().min(3).max(300).optional(),
  description: Joi.string().optional().allow(''),
  project_id:  Joi.string().uuid().optional().allow(null),
  priority:    Joi.string().valid('low','medium','high','critical').optional(),
  status:      Joi.string().valid('open','in_progress','review','completed','cancelled').optional(),
  due_date:    dueDate,
  assignees:   Joi.array().items(Joi.string().uuid()).optional()
})

module.exports = { create, update }