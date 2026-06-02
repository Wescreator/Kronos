const Joi = require('joi')

// Status legados mantidos para compatibilidade com registros antigos
const ALL_STATUSES = [
  'in_progress', 'paused', 'completed', 'cancelled',
  'planning', 'review' // mantidos como legado
]

const create = Joi.object({
  title:         Joi.string().min(3).max(200).required(),
  client:        Joi.string().max(200).optional().allow(''),
  description:   Joi.string().optional().allow(''),
  budget:        Joi.number().min(0).default(0),
  start_date:    Joi.date().iso().optional().allow(null),
  expected_date: Joi.date().iso().optional().allow(null),
  owner_id:      Joi.string().uuid().optional()
})

const update = Joi.object({
  title:          Joi.string().min(3).max(200).optional(),
  client:         Joi.string().max(200).optional().allow(''),
  description:    Joi.string().optional().allow(''),
  budget:         Joi.number().min(0).optional(),
  status:         Joi.string().valid(...ALL_STATUSES).optional(),
  start_date:     Joi.date().iso().optional().allow(null),
  expected_date:  Joi.date().iso().optional().allow(null),
  completed_date: Joi.date().iso().optional().allow(null),
  owner_id:       Joi.string().uuid().optional(),
  status_note:    Joi.string().optional().allow('')
})

module.exports = { create, update }