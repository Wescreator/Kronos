const router      = require('express').Router()
const ctrl        = require('../controllers/project.controller')
const stageCtrl   = require('../controllers/stage.controller')
const fileCtrl    = require('../controllers/project-file.controller')
const { authenticate } = require('../middlewares/auth.middleware')
const tenantMiddleware = require('../middlewares/tenant.middleware')
const validate    = require('../middlewares/validate.middleware')
const V           = require('../validators/project.validator')
const { uploadImage, uploadFile } = require('../config/multer')
const logger      = require('../middlewares/logger.middleware')

router.use(authenticate, tenantMiddleware, logger)

// Projetos
router.get('/',                       ctrl.getAll)
router.get('/:id',                    ctrl.getById)
router.post('/',    validate(V.create), ctrl.create)
router.patch('/:id', validate(V.update), ctrl.update)
router.post('/:id/cover', uploadImage.single('cover'), ctrl.uploadCover)
router.get('/:id/history',            ctrl.getStatusHistory)
router.post('/:id/members',           ctrl.addMember)
router.delete('/:id/members/:userId', ctrl.removeMember)

// Arquivos do projeto (Cloudflare R2)
router.get('/:id/files',              fileCtrl.listFiles)
router.post('/:id/files', uploadFile.single('file'), fileCtrl.uploadFile)

// Etapas e fases
router.get('/:id/stages',                             stageCtrl.getStages)
router.post('/:id/stages/:stageId/phases',            stageCtrl.addPhase)
router.patch('/:id/stages/:stageId/phases/:phaseId',  stageCtrl.updatePhase)
router.delete('/:id/stages/:stageId/phases/:phaseId', stageCtrl.deletePhase)

module.exports = router