const express = require('express')
const router = express.Router()
const postController = require('../controllers/post.controller')
const { authenticate } = require('../middlewares/auth.middleware')
const tenantMiddleware = require('../middlewares/tenant.middleware')
const { uploadDriveFile } = require('../config/multer')

// authenticate decodifica o JWT (aceita scope 'company' e 'client' — ambos
// carregam company_id no payload). tenantMiddleware resolve req.tenant a
// partir do company_id do token, funcionando igualmente para os dois
// escopos (não depende de req.user.role).
router.use(authenticate)
router.use(tenantMiddleware)

// Permissões de "admin ou criador" (editar/excluir/anexar no post) e a
// restrição de "só empresa pode criar post" são verificadas dentro do
// post.service.js — não dá para expressar "quem criou" como uma lista
// estática de roles, por isso não há authorize(...) aqui.

router.get('/',                          postController.getFeed)
router.get('/:id',                       postController.getById)
router.post('/',                         uploadDriveFile.array('files', 10), postController.create)
router.patch('/:id',                     postController.update)
router.delete('/:id',                    postController.remove)

router.post('/:id/attachments',          uploadDriveFile.array('files', 10), postController.addAttachments)
router.delete('/:id/attachments/:attachmentId', postController.removeAttachment)

router.post('/:id/comments',             uploadDriveFile.array('files', 10), postController.addComment)
router.delete('/:id/comments/:commentId', postController.removeComment)

module.exports = router