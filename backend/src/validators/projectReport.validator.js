const Joi = require('joi')

// Item do relatório (fase). Etapa é o mesmo + a lista de fases.
// observation limitada a 250 chars — relato curto por item (decisão de produto).
const phase = Joi.object({
  title:        Joi.string().max(300).required(),
  observation:  Joi.string().max(250).allow('', null).optional(),
  is_completed: Joi.boolean().default(false),
  // id da etapa/fase real de onde veio (informativo); null se o ADM adicionou.
  source_id:    Joi.string().uuid().allow(null).optional(),
})

const stage = phase.keys({
  phases: Joi.array().items(phase).default([]),
})

// PUT /projects/:id/report — salva a árvore inteira (replace-all no service).
// doc_title: cabeçalho do documento, editável (ex.: "Termo de Entrega").
const save = Joi.object({
  doc_title: Joi.string().max(120).allow('', null).optional(),
  items:     Joi.array().items(stage).default([]),
})

module.exports = { save }
