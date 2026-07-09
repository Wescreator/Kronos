const router = require('express').Router()

const ctrl = require('../controllers/budget.controller')
const { authenticate, authorize } = require('../middlewares/auth.middleware')
const tenantMiddleware = require('../middlewares/tenant.middleware')

router.use(authenticate, tenantMiddleware)

// Listagem e criação
router.get('/', ctrl.getAll)
router.post('/', authorize('admin', 'manager'), ctrl.create)

// Preview de cálculo (leitura, qualquer autenticado da empresa)
router.post('/calculate-preview', ctrl.calculatePreview)

// Operações por ID
router.get('/:id', ctrl.getById)
router.put('/:id', authorize('admin', 'manager'), ctrl.update)
router.delete('/:id', authorize('admin'), ctrl.remove)

// Ciclo de vida do orçamento
router.post('/:id/finalize', authorize('admin', 'manager'), ctrl.finalize)
router.get('/:id/divergence', ctrl.checkDivergence)
router.post('/:id/apply-current-rates', authorize('admin', 'manager'), ctrl.applyCurrentRates)
router.post('/:id/recalculate', authorize('admin', 'manager'), ctrl.recalculate)

// Snapshot vigente completo (usado para geração de PDF)
router.get('/:id/snapshot/latest', ctrl.getLatestSnapshot)

module.exports = router