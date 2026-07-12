const router   = require('express').Router()
const ctrl     = require('../controllers/task.controller')
const { authenticate } = require('../middlewares/auth.middleware')
const tenantMiddleware = require('../middlewares/tenant.middleware')
const validate = require('../middlewares/validate.middleware')
const V        = require('../validators/task.validator')
// uploadDriveFile = memoryStorage (buffer) — o anexo sobe para o R2 no
// task.service; o antigo uploadFile gravava no disco efêmero do Render.
const { uploadDriveFile } = require('../config/multer')
const logger   = require('../middlewares/logger.middleware')
const idempotency = require('../middlewares/idempotency.middleware')

router.use(authenticate, tenantMiddleware, logger)

router.get('/dashboard', ctrl.getDashboard)
router.get('/',          ctrl.getAll)
router.get('/:id',       ctrl.getById)
router.post('/',   validate(V.create), idempotency(), ctrl.create)
router.patch('/:id', validate(V.update), ctrl.update)
router.delete('/:id', ctrl.remove)
router.post('/:id/comments', uploadDriveFile.single('file'), idempotency(), ctrl.addComment)

module.exports = router