const Joi = require('joi')

// O upload é multipart (multer memoryStorage): o arquivo chega em req.file
// (validado por MIME/magic bytes no multer) e os campos de texto em
// req.body — aqui só o módulo de destino.
const createImport = Joi.object({
  module: Joi.string()
    .valid('financeiro_despesas', 'financeiro_receitas', 'clientes')
    .required()
    .messages({
      'any.only': 'Módulo inválido — use financeiro_despesas, financeiro_receitas ou clientes',
      'any.required': 'Informe o módulo de destino da importação',
    }),
})

// PUT /:id/mapping — conjunto COMPLETO de colunas mapeadas (substituição
// integral). Colunas não mapeadas simplesmente não são enviadas. A validação
// semântica (coluna existe, campo existe no módulo, obrigatórios presentes)
// fica no service, que conhece o job.
const saveMapping = Joi.object({
  mappings: Joi.array()
    .items(Joi.object({
      source_column_name: Joi.string().max(255).required(),
      target_field: Joi.string().max(50).required(),
    }))
    .min(1)
    .required()
    .messages({ 'array.min': 'Mapeie ao menos uma coluna' }),
})

// PATCH /:id/rows/:rowId — ação de revisão sobre uma linha da preview.
// A validação de aplicabilidade (duplicata vs linha comum, e-mail
// duplicado nunca aceita 'import', ungroup só em receitas) fica no service.
const rowAction = Joi.object({
  action: Joi.string()
    .valid('import', 'skip', 'update', 'restore', 'ungroup')
    .required()
    .messages({ 'any.only': 'Ação inválida — use import, skip, update, restore ou ungroup' }),
})

// POST /:id/rows/bulk — ações em massa da preview.
const bulkRowAction = Joi.object({
  action: Joi.string()
    .valid('skip_duplicates')
    .required()
    .messages({ 'any.only': 'Ação em massa inválida — use skip_duplicates' }),
})

module.exports = { createImport, saveMapping, rowAction, bulkRowAction }
