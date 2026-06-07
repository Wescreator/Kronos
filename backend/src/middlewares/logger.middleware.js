const pool = require('../config/database')

const logger = (req, res, next) => {
  res.on('finish', async () => {
    if (req.user && req.method !== 'GET') {
      try {
        await pool.query(
          `INSERT INTO activity_logs (user_id, entity_type, action, payload, ip_address)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            req.user.id,
            req.baseUrl.split('/').pop(),
            req.method,
            JSON.stringify({ url: req.originalUrl, status: res.statusCode }),
            req.ip
          ]
        )
      } catch { /* não deixa log quebrar a requisição */ }
    }
  })
  next()
}

module.exports = logger