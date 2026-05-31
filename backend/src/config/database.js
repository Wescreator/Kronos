const { Pool } = require('pg')
require('dotenv').config()

const isProduction = process.env.NODE_ENV === 'production'

const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      }
    : {
        host:     process.env.DB_HOST,
        port:     parseInt(process.env.DB_PORT) || 5432,
        database: process.env.DB_NAME,
        user:     process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        ssl:      { rejectUnauthorized: false },
        max:      isProduction ? 5 : 20,
        idleTimeoutMillis:    30000,
        connectionTimeoutMillis: 5000,
      }
)

pool.on('connect', (client) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log('✓ PostgreSQL conectado')
  }
})

pool.on('error', (err) => {
  console.error('✗ Erro no pool do PostgreSQL:', err.message)
})

// Testa a conexão na inicialização
pool.query('SELECT NOW()').then(() => {
  console.log('✓ Banco de dados OK')
}).catch(err => {
  console.error('✗ Falha na conexão com o banco:', err.message)
  process.exit(1)
})

module.exports = pool