const Joi = require('joi')

const login = Joi.object({
  email:    Joi.string().email().required().messages({
    'string.email': 'E-mail inválido',
    'any.required': 'E-mail é obrigatório'
  }),
  password: Joi.string().min(8).required().messages({
    'string.min':   'Senha deve ter no mínimo 8 caracteres',
    'any.required': 'Senha é obrigatória'
  })
})

const register = Joi.object({
  name:     Joi.string().min(3).max(150).required(),
  email:    Joi.string().email().required(),
  password: Joi.string().min(8).required().messages({
    'string.min':   'Senha deve ter no mínimo 8 caracteres',
    'any.required': 'Senha é obrigatória'
  }),
  position: Joi.string().max(100).optional().allow(''),
  phone:    Joi.string().max(30).optional().allow(''),
  // Consumido por auth.service.register (admittedAt) — precisa estar no
  // schema porque o validate agora descarta campos desconhecidos.
  admitted_at: Joi.date().iso().optional().allow(null)
})

module.exports = { login, register }