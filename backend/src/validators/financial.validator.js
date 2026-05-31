const Joi = require('joi')

const createExpense = Joi.object({
  title:       Joi.string().min(3).max(200).required(),
  description: Joi.string().optional().allow(''),
  project_id:  Joi.string().uuid().optional().allow(null),
  category_id: Joi.string().uuid().optional().allow(null),
  amount:      Joi.number().positive().required(),
  due_date:    Joi.date().iso().required()
})

const confirmPayment = Joi.object({
  paid_date:   Joi.date().iso().required()
})

const createRevenue = Joi.object({
  title:        Joi.string().min(3).max(200).required(),
  client:       Joi.string().max(200).optional().allow(''),
  project_id:   Joi.string().uuid().optional().allow(null),
  total_amount: Joi.number().positive().required(),
  installments: Joi.number().integer().min(1).max(60).default(1),
  description:  Joi.string().optional().allow(''),
  due_date:     Joi.date().iso().required()
})

const confirmReceipt = Joi.object({
  received_date: Joi.date().iso().required()
})

const createCategory = Joi.object({
  name:  Joi.string().min(2).max(100).required(),
  color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).default('#6366f1')
})

module.exports = { createExpense, confirmPayment, createRevenue, confirmReceipt, createCategory }