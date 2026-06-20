const express = require('express')
const cors    = require('cors')
const helmet  = require('helmet')
const path    = require('path')
require('dotenv').config()
const { authenticate } = require('./middlewares/auth.middleware')

// Permite serializar BigInt em respostas JSON (o Prisma retorna BigInt
// para colunas int8/COUNT em consultas raw).
BigInt.prototype.toJSON = function () { return Number(this) }

const app = express()

// ── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://kronos-neon.vercel.app',
  process.env.FRONTEND_URL,
].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i)

const corsOptions = {
  origin: (origin, cb) => {
    // Permite requisições sem Origin (curl, health checks, server-to-server)
    if (!origin || allowedOrigins.includes(origin)) {
      return cb(null, true)
    }
    return cb(new Error('Origin não permitida pelo CORS'))
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Impersonate-Company'],
}

app.use(cors(corsOptions))
app.options('*', cors(corsOptions))

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// ── Uploads estáticos ─────────────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')))

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', ts: new Date().toISOString() })
})

// ── Rotas ─────────────────────────────────────────────────────────────────────
app.use('/api/auth',          require('./routes/auth.routes'))
app.use('/api/users',         require('./routes/users.routes'))
app.use('/api/projects',      require('./routes/projects.routes'))
app.use('/api/tasks',         require('./routes/tasks.routes'))
app.use('/api/financial',     require('./routes/financial.routes'))
app.use('/api/chat',          require('./routes/chat.routes'))
app.use('/api/notifications', require('./routes/notifications.routes'))
app.use('/api/calendar',      authenticate, require('./routes/calendarRoutes'))
app.use('/api/proposals',     require('./routes/proposals.routes'))
app.use('/api/platform',      require('./routes/platform.routes'))

// ── Error handler global ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.stack || err.message)
  const status = err.status || 500
  // Em produção não expõe detalhes internos para erros 5xx
  const isClientError = status < 500
  const message = (isClientError || process.env.NODE_ENV !== 'production')
    ? (err.message || 'Erro interno do servidor')
    : 'Erro interno do servidor'
  res.status(status).json({ success: false, message })
})

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001
const server = app.listen(PORT, () => {
  console.log(`✓ Kronos backend [${process.env.NODE_ENV}] porta ${PORT}`)
  console.log(`✓ CORS liberado para: ${allowedOrigins.join(', ')}`)
})

require('./config/websocket')(server)

module.exports = server