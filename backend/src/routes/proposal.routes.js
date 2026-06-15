const router = require('express').Router()
const ctrl   = require('../controllers/proposal.controller')
const { authenticate, authorize } = require('../middlewares/auth.middleware')

// Todas as rotas exigem autenticação
router.use(authenticate)

// Listagem e criação
router.get('/',    ctrl.getAll)
router.post('/',   authorize('admin', 'manager'), ctrl.create)

// Operações por ID
router.get('/:id',           ctrl.getById)
router.put('/:id',           authorize('admin', 'manager'), ctrl.update)
router.post('/:id/duplicate', authorize('admin', 'manager'), ctrl.duplicate)
router.delete('/:id',        authorize('admin'),             ctrl.remove)

module.exports = router