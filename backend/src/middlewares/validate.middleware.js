const R = require('../utils/response')

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false })
  if (error) {
    const messages = error.details.map(d => d.message)
    return R.badRequest(res, messages.join('; '))
  }
  next()
}

module.exports = validate