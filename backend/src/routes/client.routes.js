const express = require('express')
const router = express.Router()
const clientController = require('../controllers/client.controller')
const { authenticate } = require('../middlewares/auth.middleware')
// ⚠️ AJUSTE o caminho/nome deste arquivo se for diferente no seu projeto.
const tenantMiddleware = require('../middlewares/tenant.middleware')
const logger = require('../middlewares/logger.middleware')
const idempotency = require('../middlewares/idempotency.middleware')

// authenticate decodifica o JWT e popula req.user.
// tenantMiddleware resolve req.tenant (empresa ativa, com suporte a
// impersonação) e DEVE vir sempre depois de authenticate.
router.use(authenticate)
router.use(tenantMiddleware)
router.use(logger)

router.get('/', clientController.getAll)
router.get('/:id', clientController.getById)
router.post('/', idempotency(), clientController.create)
router.put('/:id', clientController.update)
router.delete('/:id', clientController.remove)

module.exports = router