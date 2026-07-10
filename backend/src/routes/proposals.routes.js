const router = require('express').Router()

const ctrl = require('../controllers/proposal.controller')
const fileCtrl = require('../controllers/proposal.file.controller')

const { authenticate, authorize } = require('../middlewares/auth.middleware')
const tenantMiddleware = require('../middlewares/tenant.middleware')
const { uploadDriveFile } = require('../config/multer')

// Todas as rotas exigem autenticação e escopo de empresa
router.use(authenticate, tenantMiddleware)

// Listagem e criação. authorize() não tem hierarquia de roles ('owner'
// não é implícito) — as listas abaixo espelham utils/permissions.js do
// frontend; mantenha os dois em sincronia.
router.get('/', ctrl.getAll)
router.post('/', authorize('owner', 'admin', 'manager'), ctrl.create)

// Operações por ID
router.get('/:id', ctrl.getById)
router.put('/:id', authorize('owner', 'admin', 'manager'), ctrl.update)
router.post('/:id/duplicate', authorize('owner', 'admin', 'manager'), ctrl.duplicate)
router.delete('/:id', authorize('owner', 'admin'), ctrl.remove)

// Arquivos da proposta
router.get('/:id/files', fileCtrl.listFiles)
router.post(
  '/:id/files',
  authorize('owner', 'admin', 'manager'),
  uploadDriveFile.single('file'),
  fileCtrl.uploadFile
)
router.delete(
  '/:id/files/:fileId',
  authorize('owner', 'admin', 'manager'),
  fileCtrl.deleteFile
)

module.exports = router