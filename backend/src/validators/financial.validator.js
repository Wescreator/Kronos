const Joi = require('joi')

const createExpense = Joi.object({
  title:        Joi.string().min(3).max(200).required(),
  description:  Joi.string().optional().allow(''),
  project_id:   Joi.string().uuid().optional().allow(null),
  category_id:  Joi.string().uuid().optional().allow(null),
  amount:       Joi.number().positive().required(),
  due_date:     Joi.date().iso().required(),
  // Novo campo — opcional, padrão false, não quebra chamadas existentes
  is_recurring: Joi.boolean().default(false)
})

const confirmPayment = Joi.object({
  paid_date: Joi.date().iso().required()
})

const createRevenue = Joi.object({
  title:        Joi.string().min(3).max(200).required(),
  client:       Joi.string().max(200).optional().allow(''),
  project_id:   Joi.string().uuid().optional().allow(null),
  total_amount: Joi.number().positive().required(),
  description:  Joi.string().optional().allow(''),

  // Formato antigo
  installments: Joi.number().integer().min(1).max(60),
  due_date:     Joi.date().iso(),

  // Formato novo
  installments_list: Joi.array().items(
    Joi.object({
      amount:   Joi.number().positive().required(),
      due_date: Joi.date().iso().required()
    })
  ).min(1)
}).or('installments_list', 'due_date')

const confirmReceipt = Joi.object({
  received_date: Joi.date().iso().required()
})

const createCategory = Joi.object({
  name:  Joi.string().min(2).max(100).required(),
  color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).default('#6366f1')
})

module.exports = {
  createExpense,
  confirmPayment,
  createRevenue,
  confirmReceipt,
  createCategory
}