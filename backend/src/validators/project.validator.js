const Joi = require('joi')

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
  status:         Joi.string().valid('planning','in_progress','review','paused','completed','cancelled').optional(),
  progress:       Joi.number().min(0).max(100).optional(),
  start_date:     Joi.date().iso().optional().allow(null),
  expected_date:  Joi.date().iso().optional().allow(null),
  completed_date: Joi.date().iso().optional().allow(null),
  owner_id:       Joi.string().uuid().optional()
})

module.exports = { create, update }