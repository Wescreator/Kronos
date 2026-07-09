const router              = require('express').Router()
const ctrl                 = require('../controllers/project.controller')
const stageCtrl            = require('../controllers/stage.controller')
const fileCtrl             = require('../controllers/project-file.controller')
const phaseCommentCtrl     = require('../controllers/phase-comment.controller')
const phaseAttachmentCtrl  = require('../controllers/phase-attachment.controller')
const { authenticate, authorize } = require('../middlewares/auth.middleware')
const tenantMiddleware = require('../middlewares/tenant.middleware')
const validate    = require('../middlewares/validate.middleware')
const V           = require('../validators/project.validator')
const { uploadImageMemory, uploadDriveFile } = require('../config/multer')
const logger      = require('../middlewares/logger.middleware')

router.use(authenticate, tenantMiddleware, logger)


router.delete('/:id/members/:userId', ctrl.removeMember)
router.post('/:id/members',           ctrl.addMember)
router.post('/:id/cover',             uploadImageMemory.single('cover'), ctrl.uploadCover)
router.get('/:id/history',            ctrl.getStatusHistory)
router.get('/:id',                    ctrl.getById)
router.patch('/:id',                  validate(V.update), ctrl.update)
router.delete('/:id',                 authorize('owner', 'admin'), ctrl.remove)
router.get('/',                       ctrl.getAll)
router.post('/',                      validate(V.create), ctrl.create)

// Arquivos do projeto (Cloudflare R2)
router.get('/:id/files',              fileCtrl.listFiles)
router.post('/:id/files', uploadDriveFile.single('file'), fileCtrl.uploadFile)
router.delete('/:id/files/:fileId', authorize('owner', 'admin'), fileCtrl.deleteFile)

// Etapas — CRUD completo. IMPORTANTE: a rota de reorder precisa vir ANTES
// de '/:id/stages/:stageId', senão o Express casaria "reorder" como se
// fosse um stageId (primeira rota compatível ganha).
router.get('/:id/stages',              stageCtrl.getStages)
router.patch('/:id/stages/reorder',    stageCtrl.reorderStages)
router.post('/:id/stages',             stageCtrl.createStage)
router.patch('/:id/stages/:stageId',   stageCtrl.updateStage)
router.delete('/:id/stages/:stageId',  stageCtrl.deleteStage)

// Fases — mesmo cuidado com a ordem da rota de reorder.
router.patch('/:id/stages/:stageId/phases/reorder',   stageCtrl.reorderPhases)
router.post('/:id/stages/:stageId/phases',            stageCtrl.addPhase)
router.patch('/:id/stages/:stageId/phases/:phaseId',  stageCtrl.updatePhase)
router.delete('/:id/stages/:stageId/phases/:phaseId', stageCtrl.deletePhase)

// Comentários de fase (histórico — autor, data e hora)
router.post('/:id/stages/:stageId/phases/:phaseId/comments',              phaseCommentCtrl.addComment)
router.patch('/:id/stages/:stageId/phases/:phaseId/comments/:commentId',  phaseCommentCtrl.updateComment)
router.delete('/:id/stages/:stageId/phases/:phaseId/comments/:commentId', phaseCommentCtrl.deleteComment)

// Anexos de fase (mesma arquitetura R2 usada nos arquivos do projeto)
router.post('/:id/stages/:stageId/phases/:phaseId/attachments', uploadDriveFile.single('file'), phaseAttachmentCtrl.uploadAttachment)
router.delete('/:id/stages/:stageId/phases/:phaseId/attachments/:attachmentId', phaseAttachmentCtrl.deleteAttachment)

module.exports = router