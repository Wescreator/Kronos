const { Pool } = require('pg')

// Valida o certificado TLS do banco por padrão. Defina
// DB_SSL_REJECT_UNAUTHORIZED=false apenas se o provedor exigir.
const rejectUnauthorized = process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized,
    ca: process.env.DB_SSL_CA || undefined,
  },
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 30000
})

pool.on('error', (err) => {
  console.error('PostgreSQL pool error:', err.message)
})

module.exports = pool