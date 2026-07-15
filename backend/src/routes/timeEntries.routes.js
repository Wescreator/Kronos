const router   = require('express').Router()
const ctrl     = require('../controllers/timeEntry.controller')
const { authenticate } = require('../middlewares/auth.middleware')
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
router.get('/summary',       ctrl.summary)
router.get('/team',          ctrl.team)
router.get('/task/:taskId',  ctrl.getByTask)
router.get('/',              ctrl.list)

module.exports = router
