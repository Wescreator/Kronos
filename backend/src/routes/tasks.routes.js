const router   = require('express').Router()
const ctrl     = require('../controllers/task.controller')
const { authenticate } = require('../middlewares/auth.middleware')
const tenantMiddleware = require('../middlewares/tenant.middleware')
const validate = require('../middlewares/validate.middleware')
const V        = require('../validators/task.validator')
const { uploadFile } = require('../config/multer')
const logger   = require('../middlewares/logger.middleware')

router.use(authenticate, tenantMiddleware, logger)

router.get('/dashboard', ctrl.getDashboard)
router.get('/',          ctrl.getAll)
router.get('/:id',       ctrl.getById)
router.post('/',   validate(V.create), ctrl.create)
router.patch('/:id', validate(V.update), ctrl.update)
router.delete('/:id', ctrl.remove)
router.post('/:id/comments', uploadFile.single('file'), ctrl.addComment)

module.exports = router