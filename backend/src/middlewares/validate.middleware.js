const R = require('../utils/response')

/**
 * Valida req.body contra o schema Joi e SUBSTITUI o body pelo valor
 * validado. Isso garante duas coisas que a validação "só rejeita" não
 * garantia:
 *   - stripUnknown: campos fora do schema são descartados — proteção
 *     contra mass-assignment na entrada, sem depender de whitelist
 *     manual em cada service;
 *   - coerções e defaults do Joi passam a valer (ex.: priority default
 *     'medium', datas ISO convertidas).
 *
 * Consequência prática: todo campo que o service consome PRECISA estar
 * declarado no schema — campo fora do schema chega como undefined.
 */
const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true,
  })
  if (error) {
    const messages = error.details.map(d => d.message)
    return R.badRequest(res, messages.join('; '))
  }
  req.body = value
  next()
}

module.exports = validate
