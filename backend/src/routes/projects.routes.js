const router   = require('express').Router()
const ctrl     = require('../controllers/project.controller')
const { authenticate } = require('../middlewares/auth.middleware')
const validate = require('../middlewares/validate.middleware')
const V        = require('../validators/project.validator')
const { uploadImage } = require('../config/multer')
const logger   = require('../middlewares/logger.middleware')

router.use(authenticate, logger)

router.get('/',                    ctrl.getAll)
router.get('/:id',                 ctrl.getById)
router.post('/',   validate(V.create), ctrl.create)
router.patch('/:id', validate(V.update), ctrl.update)
router.post('/:id/cover', uploadImage.single('cover'), ctrl.uploadCover)
router.get('/:id/history',         ctrl.getStatusHistory)
router.post('/:id/members',        ctrl.addMember)
router.delete('/:id/members/:userId', ctrl.removeMember)

module.exports = router