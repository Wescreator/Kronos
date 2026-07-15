const Joi = require('joi')

// Item do relatório (fase). Etapa é o mesmo + a lista de fases.
const phase = Joi.object({
  title:        Joi.string().max(300).required(),
  observation:  Joi.string().allow('', null).optional(),
  is_completed: Joi.boolean().default(false),
  // id da etapa/fase real de onde veio (informativo); null se o ADM adicionou.
  source_id:    Joi.string().uuid().allow(null).optional(),
})

const stage = phase.keys({
  phases: Joi.array().items(phase).default([]),
})

// PUT /projects/:id/report — salva a árvore inteira (replace-all no service).
const save = Joi.object({
  items: Joi.array().items(stage).default([]),
})

module.exports = { save }
