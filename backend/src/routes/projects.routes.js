const router              = require('express').Router()
const ctrl                 = require('../controllers/project.controller')
const stageCtrl            = require('../controllers/stage.controller')
const fileCtrl             = require('../controllers/project-file.controller')
const phaseCommentCtrl     = require('../controllers/phase-comment.controller')
const phaseAttachmentCtrl  = require('../controllers/phase-attachment.controller')
const reportCtrl           = require('../controllers/projectReport.controller')
const RV                   = require('../validators/projectReport.validator')
const { authenticate, authorize } = require('../middlewares/auth.middleware')
const tenantMiddleware = require('../middlewares/tenant.middleware')
const validate    = require('../middlewares/validate.middleware')
const V           = require('../validators/project.validator')
const { uploadImageMemory, uploadDriveFile } = require('../config/multer')
const logger      = require('../middlewares/logger.middleware')
const idempotency = require('../middlewares/idempotency.middleware')

router.use(authenticate, tenantMiddleware, logger)


router.delete('/:id/members/:userId', ctrl.removeMember)
router.post('/:id/members',           ctrl.addMember)
router.post('/:id/cover',             uploadImageMemory.single('cover'), idempotency(), ctrl.uploadCover)
router.get('/:id/history',            ctrl.getStatusHistory)
router.get('/:id',                    ctrl.getById)
router.patch('/:id',                  validate(V.update), ctrl.update)
router.delete('/:id',                 authorize('owner', 'admin'), ctrl.remove)
router.get('/',                       ctrl.getAll)
router.post('/',                      validate(V.create), idempotency(), ctrl.create)

// Arquivos do projeto (Cloudflare R2)
router.get('/:id/files',              fileCtrl.listFiles)
router.post('/:id/files', uploadDriveFile.single('file'), idempotency(), fileCtrl.uploadFile)
router.delete('/:id/files/:fileId', authorize('owner', 'admin'), fileCtrl.deleteFile)

// Etapas — CRUD completo. IMPORTANTE: a rota de reorder precisa vir ANTES
// de '/:id/stages/:stageId', senão o Express casaria "reorder" como se
// fosse um stageId (primeira rota compatível ganha).
router.get('/:id/stages',              stageCtrl.getStages)
router.patch('/:id/stages/reorder',    stageCtrl.reorderStages)
router.post('/:id/stages',             idempotency(), stageCtrl.createStage)
router.patch('/:id/stages/:stageId',   stageCtrl.updateStage)
router.delete('/:id/stages/:stageId',  stageCtrl.deleteStage)

// Fases — mesmo cuidado com a ordem da rota de reorder.
router.patch('/:id/stages/:stageId/phases/reorder',   stageCtrl.reorderPhases)
router.post('/:id/stages/:stageId/phases',            idempotency(), stageCtrl.addPhase)
router.patch('/:id/stages/:stageId/phases/:phaseId',  stageCtrl.updatePhase)
router.delete('/:id/stages/:stageId/phases/:phaseId', stageCtrl.deletePhase)

// Relatório de Projeto (documento p/ PDF) — EXCLUSIVO do Admin (developer
// bypassa authorize). GET faz get-or-seed; PUT salva a árvore editada.
router.get('/:id/report', authorize('admin'), reportCtrl.getReport)
router.put('/:id/report', authorize('admin'), validate(RV.save), reportCtrl.saveReport)

// Comentários de fase (histórico — autor, data e hora)
router.post('/:id/stages/:stageId/phases/:phaseId/comments',              idempotency(), phaseCommentCtrl.addComment)
router.patch('/:id/stages/:stageId/phases/:phaseId/comments/:commentId',  phaseCommentCtrl.updateComment)
router.delete('/:id/stages/:stageId/phases/:phaseId/comments/:commentId', phaseCommentCtrl.deleteComment)

// Anexos de fase (mesma arquitetura R2 usada nos arquivos do projeto)
router.post('/:id/stages/:stageId/phases/:phaseId/attachments', uploadDriveFile.single('file'), idempotency(), phaseAttachmentCtrl.uploadAttachment)
router.delete('/:id/stages/:stageId/phases/:phaseId/attachments/:attachmentId', phaseAttachmentCtrl.deleteAttachment)

module.exports = router