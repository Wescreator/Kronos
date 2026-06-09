const express = require('express')
const cors    = require('cors')
const helmet  = require('helmet')
const path    = require('path')
require('dotenv').config()

const app = express()

// ── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://kronos-neon.vercel.app',
  process.env.FRONTEND_URL,
].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i) // remove duplicatas

app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

// Responde OPTIONS imediatamente (preflight)
app.options('*', cors({
  origin: true,
  credentials: true
}))

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// ── Uploads estáticos ─────────────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')))

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
  status: 'ok',
  ts: new Date().toISOString()
})
})

// ── Rotas ─────────────────────────────────────────────────────────────────────
app.use('/api/auth',          require('./routes/auth.routes'))
app.use('/api/users',         require('./routes/users.routes'))
app.use('/api/projects',      require('./routes/projects.routes'))
app.use('/api/tasks',         require('./routes/tasks.routes'))
app.use('/api/financial',     require('./routes/financial.routes'))
app.use('/api/chat',          require('./routes/chat.routes'))
app.use('/api/notifications', require('./routes/notifications.routes'))

// ── Error handler global ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message)
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Erro interno do servidor'
  })
})

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001
const server = app.listen(PORT, () => {
  console.log(`✓ Kronos backend [${process.env.NODE_ENV}] porta ${PORT}`)
  console.log(`✓ CORS liberado para: ${allowedOrigins.join(', ')}`)
})

require('./config/websocket')(server)

module.exports = server