const Joi = require('joi')

const create = Joi.object({
  title:       Joi.string().min(3).max(300).required(),
  description: Joi.string().optional().allow(''),
  project_id:  Joi.string().uuid().optional().allow(null),
  priority:    Joi.string().valid('low','medium','high','critical').default('medium'),
  due_date:    Joi.date().iso().optional().allow(null),
  assignees:   Joi.array().items(Joi.string().uuid()).optional()
})

const update = Joi.object({
  title:       Joi.string().min(3).max(300).optional(),
  description: Joi.string().optional().allow(''),
  project_id:  Joi.string().uuid().optional().allow(null),
  priority:    Joi.string().valid('low','medium','high','critical').optional(),
  status:      Joi.string().valid('open','in_progress','review','completed','cancelled').optional(),
  due_date:    Joi.date().iso().optional().allow(null),
  assignees:   Joi.array().items(Joi.string().uuid()).optional()
})

module.exports = { create, update }