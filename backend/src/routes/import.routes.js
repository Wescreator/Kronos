const router = require('express').Router()
const ctrl = require('../controllers/import.controller')
const { authenticate } = require('../middlewares/auth.middleware')
const tenantMiddleware = require('../middlewares/tenant.middleware')
const validate = require('../middlewares/validate.middleware')
const V = require('../validators/import.validator')
const logger = require('../middlewares/logger.middleware')
const idempotency = require('../middlewares/idempotency.middleware')
const { uploadDriveFile } = require('../config/multer')
const importService = require('../services/import.service')
const R = require('../utils/response')

router.use(authenticate, tenantMiddleware, logger)

// A permissão depende do MÓDULO DE DESTINO (vem no body do multipart), não
// da rota — por isso um middleware próprio em vez de authorize(...roles):
// financeiro_* exige admin (espelho do router do Financeiro), clientes é
// liberado para qualquer papel da empresa. Roda depois do validate, que já
// garantiu um module válido.
const authorizeImportModule = (req, res, next) => {
  if (!importService.canAccessModule(req.user.role, req.body.module)) {
    return R.forbidden(res, 'Sem permissão para importar neste módulo')
  }
  next()
}

// multer primeiro (multipart → req.file + req.body), depois Joi no body.
router.post('/', uploadDriveFile.single('file'), validate(V.createImport), authorizeImportModule, ctrl.createImport)

// Leituras: o escopo por papel é aplicado no service (lista filtra os
// módulos permitidos; detalhe devolve 403 para módulo sem acesso).
router.get('/', ctrl.listImports)
router.get('/:id', ctrl.getImport)

// Mapeamento (Fase 2): GET devolve colunas + amostras + sugestão automática
// (+ mapeamento salvo, se reaberto); PUT salva, converte as linhas e avança
// o job para preview.
router.get('/:id/mapping', ctrl.getMapping)
router.put('/:id/mapping', validate(V.saveMapping), ctrl.saveMapping)

// Preview (Fase 3): grid paginado com duplicatas marcadas + ações de
// revisão linha a linha e em massa (só com o job em preview).
router.get('/:id/rows', ctrl.getRows)
router.patch('/:id/rows/:rowId', validate(V.rowAction), ctrl.setRowAction)
router.post('/:id/rows/bulk', validate(V.bulkRowAction), ctrl.bulkRowAction)

// Confirmação final (Fase 4): claim atômico preview → processing e gravação
// transacional nos módulos de destino. idempotency(): a chave é por intenção
// (gerada ao abrir a revisão) — duplo clique devolve a mesma resposta.
router.post('/:id/confirm', idempotency(), ctrl.confirmImport)

module.exports = router
