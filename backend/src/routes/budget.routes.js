const router = require('express').Router()

const ctrl = require('../controllers/budget.controller')
const { authenticate, authorize } = require('../middlewares/auth.middleware')
const tenantMiddleware = require('../middlewares/tenant.middleware')
const logger = require('../middlewares/logger.middleware')
const idempotency = require('../middlewares/idempotency.middleware')

router.use(authenticate, tenantMiddleware, logger)

// Listagem e criação
router.get('/', ctrl.getAll)
router.post('/', authorize('owner', 'admin', 'manager'), idempotency(), ctrl.create)

// Preview de cálculo (leitura, qualquer autenticado da empresa)
router.post('/calculate-preview', ctrl.calculatePreview)

// Operações por ID
router.get('/:id', ctrl.getById)
router.put('/:id', authorize('owner', 'admin', 'manager'), ctrl.update)
router.delete('/:id', authorize('owner', 'admin'), ctrl.remove)

// Ciclo de vida do orçamento
router.post('/:id/finalize', authorize('owner', 'admin', 'manager'), idempotency(), ctrl.finalize)
router.get('/:id/divergence', ctrl.checkDivergence)
router.post('/:id/apply-current-rates', authorize('owner', 'admin', 'manager'), ctrl.applyCurrentRates)
// Recalcular gera um NOVO snapshot a cada chamada (por desenho) — sem a chave
// de idempotência, um duplo clique criaria duas versões idênticas no histórico.
router.post('/:id/recalculate', authorize('owner', 'admin', 'manager'), idempotency(), ctrl.recalculate)

// Snapshot vigente completo (usado para geração de PDF)
router.get('/:id/snapshot/latest', ctrl.getLatestSnapshot)

module.exports = router