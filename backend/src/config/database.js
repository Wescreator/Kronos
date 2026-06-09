const { Pool } = require('pg')
require('dotenv').config()

const isProduction = process.env.NODE_ENV === 'production'

// Garante SSL sempre que usar Supabase
const sslConfig = { rejectUnauthorized: false }

const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: sslConfig,
        max: isProduction ? 5 : 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      }
    : {
        host:     process.env.DB_HOST,
        port:     parseInt(process.env.DB_PORT) || 5432,
        database: process.env.DB_NAME,
        user:     process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        ssl:      false,
        max:      10,
        idleTimeoutMillis:       30000,
        connectionTimeoutMillis: 10000,
      }
)

pool.on('error', (err) => {
  console.error('✗ Erro inesperado no pool:', err.message)
})

pool.query('SELECT NOW()')
  .then(() => console.log('✓ Banco de dados conectado'))
  .catch(err => {
    console.error('✗ Falha na conexão com o banco:', err.message)
    process.exit(1)
  })

module.exports = pool