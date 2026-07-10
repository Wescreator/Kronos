const express = require('express')
const cors    = require('cors')
const helmet  = require('helmet')
const path    = require('path')
require('dotenv').config()
const { authenticate } = require('./middlewares/auth.middleware')

// Permite serializar BigInt em respostas JSON (o Prisma retorna BigInt
// para colunas int8/COUNT em consultas raw).
BigInt.prototype.toJSON = function () { return Number(this) }

/**
 * Monta e exporta o app Express SEM dar listen. O server.js faz o
 * bootstrap real (porta, WebSocket, cron); os testes de integração
 * importam este módulo direto no supertest — sem abrir porta nem
 * disparar efeitos colaterais.
 */
const app = express()

// Atrás de 1 camada de proxy (Render): sem isso, req.ip é o IP do proxy
// e o rate limiting de /login vira um bucket único compartilhado por
// TODOS os usuários — inócuo contra brute force e fácil de esgotar.
app.set('trust proxy', 1)

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
    // cb(null, false) nega sem lançar erro: o browser bloqueia a resposta
    // por falta dos headers CORS. Lançar Error aqui caía no error handler
    // global como 500 — origin não permitida é recusa, não falha interna.
    return cb(null, false)
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
app.use('/api/auth',        require('./routes/auth.routes'))
app.use('/api/users',       require('./routes/users.routes'))
app.use('/api/projects',    require('./routes/projects.routes'))
app.use('/api/tasks',       require('./routes/tasks.routes'))
app.use('/api/financial',   require('./routes/financial.routes'))
app.use('/api/chat',        require('./routes/chat.routes'))
app.use('/api/notifications', require('./routes/notifications.routes'))
app.use('/api/calendar',    authenticate, require('./routes/calendar.routes'))
app.use('/api/proposals',   require('./routes/proposals.routes'))
app.use('/api/platform',    require('./routes/platform.routes'))

// Novas rotas adicionadas no lugar correto (Antes do Error Handler)
app.use('/api/clients',     require('./routes/client.routes'))
app.use('/api/posts',       require('./routes/post.routes'))

// NOVO — autenticação do portal do cliente (rotas públicas, sem authenticate)
app.use('/api/client-portal/auth', require('./routes/client-portal-auth.routes'))
app.use('/api/budgets', require('./routes/budget.routes'))
app.use('/api/budget-config', require('./routes/budgetConfig.routes'))

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

module.exports = app
module.exports.allowedOrigins = allowedOrigins
