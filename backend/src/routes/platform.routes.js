const router = require('express').Router()
const ctrl   = require('../controllers/platform.controller')
const { authenticate, authorize } = require('../middlewares/auth.middleware')
const { runWithTenant } = require('../config/tenantContext')
// Caminho corrigido: o multer e configurado em config/multer.js
// (confirmado pelo uso em project.routes.js). uploadImageMemory usa
// memoryStorage — necessario para o upload direto ao R2 (sem disco).
const { uploadImageMemory } = require('../config/multer')

/**
 * Rotas de plataforma (super admin).
 *
 * Restritas ao escopo global (role `developer`). O `authorize('developer')`
 * bloqueia qualquer outro papel; o developer ja tem bypass no authorize.
 *
 * Estas rotas operam apenas sobre empresas e seus usuarios - nao tocam
 * em dados multi-tenant.
 */
router.use(authenticate, authorize('developer'))

/**
 * NOVO — Ativa o contexto de tenant (AsyncLocalStorage) da empresa-alvo
 * para qualquer rota que tenha o parâmetro :id (o id da empresa sendo
 * gerenciada no Admin).
 *
 * Por quê: a extensão do Prisma em config/prisma.js bloqueia qualquer
 * operação em modelos de TENANT_MODELS (ex: Project, ClientLead) se
 * getTenant().companyId estiver vazio. Como o Developer normalmente NÃO
 * está impersonando quando usa o Admin (tenantMiddleware não roda aqui
 * de propósito — estas rotas trabalham com múltiplas empresas conforme
 * o :id de cada requisição, não uma única empresa fixa por sessão), o
 * contexto ficava sempre nulo e qualquer chamada Prisma nova a um modelo
 * tenant-aware (como Project) era bloqueada — foi exatamente o que
 * aconteceu com listCompanyProjects.
 *
 * Isso NÃO reduz a proteção: continua sendo impossível ler dados de uma
 * empresa sem um companyId explícito no contexto — só que agora esse
 * companyId é o da própria empresa que a rota está manipulando (:id),
 * e authorize('developer') já rodou (via router.use acima) antes deste
 * ponto, então só developer chega aqui.
 */
router.param('id', (req, res, next, companyId) => {
  return runWithTenant(
    { userId: req.user.user_id, companyId, scope: req.user.scope, role: req.user.role },
    next
  )
})

// Empresas
router.get('/companies',              ctrl.listCompanies)
router.post('/companies',             ctrl.createCompany)
router.patch('/companies/:id/active', ctrl.setCompanyActive)
router.patch('/companies/:id',        ctrl.updateCompany)
router.post('/companies/:id/logo',    uploadImageMemory.single('logo'), ctrl.uploadCompanyLogo)
router.get('/companies/:id/history', ctrl.getCompanyHistory)

// Usuarios de uma empresa
router.get('/companies/:id/users',             ctrl.listCompanyUsers)
router.post('/companies/:id/users',            ctrl.createCompanyUser)
router.patch('/companies/:id/users/:userId',   ctrl.updateCompanyUser)
router.delete('/companies/:id/users/:userId',  ctrl.deleteCompanyUser)

// Projetos de uma empresa (usado para popular o seletor de projetos no
// modal de acesso de cliente ao portal)
router.get('/companies/:id/projects', ctrl.listCompanyProjects)

// NOVO — Clientes com acesso ao portal de postagens
router.get('/companies/:id/clients',                     ctrl.listCompanyClients)
router.post('/companies/:id/clients/:clientId/access',   ctrl.createClientPortalAccess)
router.patch('/companies/:id/clients/:clientId/access',  ctrl.updateClientPortalAccess)
router.delete('/companies/:id/clients/:clientId/access', ctrl.revokeClientPortalAccess)

module.exports = router