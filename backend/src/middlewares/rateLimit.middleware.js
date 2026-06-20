const R = require('../utils/response')

/**
 * Rate limiter simples em memória (sliding window por IP).
 *
 * Observação: o estado é por instância de processo. Em ambientes com
 * múltiplas instâncias, troque por uma store compartilhada (Redis) ou
 * pela lib `express-rate-limit` com store distribuída.
 *
 * @param {object} opts
 * @param {number} opts.windowMs  Janela de tempo em ms
 * @param {number} opts.max       Máx. de requisições por janela
 * @param {string} opts.message   Mensagem ao exceder
 */
function rateLimit({ windowMs = 15 * 60 * 1000, max = 100, message = 'Muitas requisições. Tente novamente mais tarde.' } = {}) {
  const hits = new Map() // key -> { count, resetAt }

  // Limpeza periódica para não vazar memória
  const interval = setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of hits) {
      if (entry.resetAt <= now) hits.delete(key)
    }
  }, windowMs)
  if (interval.unref) interval.unref()

  return (req, res, next) => {
    const key = req.ip || req.connection?.remoteAddress || 'unknown'
    const now = Date.now()
    const entry = hits.get(key)

    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs })
      return next()
    }

    entry.count += 1
    if (entry.count > max) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
      res.set('Retry-After', String(retryAfter))
      return R.error(res, message, 429)
    }
    next()
  }
}

module.exports = rateLimit
