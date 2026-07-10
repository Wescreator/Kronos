// backend/src/routes/budgetConfig.routes.js
const router = require('express').Router()

const ctrl = require('../controllers/budgetConfig.controller')
const { authenticate, authorize } = require('../middlewares/auth.middleware')
const tenantMiddleware = require('../middlewares/tenant.middleware')

router.use(authenticate, tenantMiddleware)

// Estrutura completa (títulos -> níveis -> taxa vigente)
router.get('/', ctrl.getStructure)

// Títulos — apenas admin mexe na estrutura de precificação
router.post('/titles', authorize('owner', 'admin'), ctrl.createTitle)
router.put('/titles/:id', authorize('owner', 'admin'), ctrl.updateTitle)
router.delete('/titles/:id', authorize('owner', 'admin'), ctrl.removeTitle)

// Níveis
router.post('/levels', authorize('owner', 'admin'), ctrl.createLevel)
router.put('/levels/:id', authorize('owner', 'admin'), ctrl.updateLevel)
router.delete('/levels/:id', authorize('owner', 'admin'), ctrl.removeLevel)

// Taxa vigente (cria nova versão, nunca sobrescreve)
router.put('/levels/:id/rate', authorize('owner', 'admin'), ctrl.setLevelRate)

module.exports = router