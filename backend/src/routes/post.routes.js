const express = require('express')
const router = express.Router()
const postController = require('../controllers/post.controller')
const { authenticateAllowClient } = require('../middlewares/auth.middleware')
const tenantMiddleware = require('../middlewares/tenant.middleware')
const logger = require('../middlewares/logger.middleware')
const idempotency = require('../middlewares/idempotency.middleware')
const { uploadDriveFile } = require('../config/multer')

// authenticateAllowClient decodifica o JWT aceitando scope 'company',
// 'global' E 'client' — o portal do cliente compartilha estas rotas.
// (O authenticate padrão recusa tokens do portal.) tenantMiddleware
// resolve req.tenant a partir do company_id do token, funcionando
// igualmente para os dois escopos (não depende de req.user.role).
router.use(authenticateAllowClient)
router.use(tenantMiddleware)
router.use(logger)

// Permissões de "admin ou criador" (editar/excluir/anexar no post) e a
// restrição de "só empresa pode criar post" são verificadas dentro do
// post.service.js — não dá para expressar "quem criou" como uma lista
// estática de roles, por isso não há authorize(...) aqui.

router.get('/',                          postController.getFeed)
router.get('/:id',                       postController.getById)
router.post('/',                         uploadDriveFile.array('files', 10), idempotency(), postController.create)
router.patch('/:id',                     postController.update)
router.delete('/:id',                    postController.remove)

router.post('/:id/attachments',          uploadDriveFile.array('files', 10), idempotency(), postController.addAttachments)
router.delete('/:id/attachments/:attachmentId', postController.removeAttachment)

router.post('/:id/comments',             uploadDriveFile.array('files', 10), idempotency(), postController.addComment)
router.delete('/:id/comments/:commentId', postController.removeComment)

module.exports = router