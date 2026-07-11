const R = require('../utils/response')

/**
 * Token Bucket em memória (proteção contra exaustão da API / DoS).
 *
 * Complementa o rateLimit (sliding window) das rotas de auth: aquele é
 * agressivo e pontual (anti brute force); este é uma rede de proteção
 * ampla contra excesso de requisições em QUALQUER rota — loop no client,
 * scraper, aba travada re-tentando, etc.
 *
 * Modelo Token Bucket: cada chave (por padrão o IP, ou o user_id quando
 * já autenticado) tem um balde com `capacity` tokens. Cada requisição
 * consome 1 token; o balde reabastece `refillPerSec` tokens por segundo
 * até `capacity`. Rajadas curtas passam (burst = capacity); abuso
 * sustentado é limitado à taxa de reabastecimento.
 *
 * Estado por processo (Map). Adequado ao porte atual (uma única instância,
 * ~80 usuários). Em cenário multi-instância, trocar por store compartilhada.
 *
 * Configurável por env:
 *   API_RATE_CAPACITY       — rajada máxima (default 120)
 *   API_RATE_REFILL_PER_SEC — taxa sustentada por segundo (default 10)
 *
 * @param {object}   opts
 * @param {number}   opts.capacity       Tokens máximos no balde (burst)
 * @param {number}   opts.refillPerSec   Tokens repostos por segundo
 * @param {function} opts.keyGenerator   (req) => string  chave do balde
 * @param {string}   opts.message        Mensagem ao exceder
 */
function tokenBucket({
  capacity = parseInt(process.env.API_RATE_CAPACITY) || 120,
  refillPerSec = parseInt(process.env.API_RATE_REFILL_PER_SEC) || 10,
  keyGenerator = (req) => req.user?.user_id || req.ip || 'unknown',
  message = 'Muitas requisições em pouco tempo. Aguarde um instante.',
} = {}) {
  const buckets = new Map() // key -> { tokens, updatedAt }

  // Limpeza periódica: remove baldes cheios e inativos para não vazar
  // memória. Um balde cheio há mais de 5 min não guarda estado útil.
  const IDLE_MS = 5 * 60 * 1000
  const interval = setInterval(() => {
    const now = Date.now()
    for (const [key, b] of buckets) {
      if (b.tokens >= capacity && now - b.updatedAt > IDLE_MS) {
        buckets.delete(key)
      }
    }
  }, IDLE_MS)
  if (interval.unref) interval.unref()

  return (req, res, next) => {
    const key = keyGenerator(req)
    const now = Date.now()
    let b = buckets.get(key)

    if (!b) {
      b = { tokens: capacity, updatedAt: now }
      buckets.set(key, b)
    } else {
      // Reabastece proporcional ao tempo decorrido, sem estourar capacity.
      const elapsedSec = (now - b.updatedAt) / 1000
      b.tokens = Math.min(capacity, b.tokens + elapsedSec * refillPerSec)
      b.updatedAt = now
    }

    if (b.tokens < 1) {
      const retryAfter = Math.ceil((1 - b.tokens) / refillPerSec)
      res.set('Retry-After', String(retryAfter))
      return R.error(res, message, 429)
    }

    b.tokens -= 1
    next()
  }
}

module.exports = tokenBucket
