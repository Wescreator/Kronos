const router   = require('express').Router()
const ctrl     = require('../controllers/timeEntry.controller')
const { authenticate, authorize } = require('../middlewares/auth.middleware')
const tenantMiddleware = require('../middlewares/tenant.middleware')
const validate = require('../middlewares/validate.middleware')
const V        = require('../validators/timeEntry.validator')
const logger   = require('../middlewares/logger.middleware')
const idempotency = require('../middlewares/idempotency.middleware')

// Mesma postura de tasks.routes.js: authenticate + tenantMiddleware, sem
// authorize() (todos os perfis internos podem apontar horas). Decisão do
// produto: não adicionar authorize aqui, espelhando o módulo de Tarefas.
router.use(authenticate, tenantMiddleware, logger)

// Rotas específicas antes da genérica '/' para não colidirem.
router.get('/active',        ctrl.getActive)
router.post('/start',        validate(V.start), idempotency(), ctrl.start)
router.post('/stop',         ctrl.stop)
router.delete('/active',     ctrl.discard)
// Horas da EQUIPE (agregados de outros membros) são exclusivas do ADM —
// espelha a UI: TeamActivity (ExecutiveDashboard) e módulo de Relatórios
// são visíveis só para admin/developer. Os demais papéis continuam com o
// próprio timer (/active, /start, /stop) e o histórico por tarefa (/task/:id).
router.get('/summary',       authorize('admin'), ctrl.summary)
router.get('/team',          authorize('admin'), ctrl.team)
router.get('/task/:taskId',  ctrl.getByTask)
router.get('/',              ctrl.list)

module.exports = router
