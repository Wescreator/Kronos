const router = require('express').Router()
const ctrl   = require('../controllers/platform.controller')
const { authenticate, authorize } = require('../middlewares/auth.middleware')

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

// Empresas
router.get('/companies',            ctrl.listCompanies)
router.post('/companies',           ctrl.createCompany)
router.patch('/companies/:id/active', ctrl.setCompanyActive)
router.patch('/companies/:id',      ctrl.updateCompany)

// Usuarios de uma empresa
router.get('/companies/:id/users',             ctrl.listCompanyUsers)
router.post('/companies/:id/users',            ctrl.createCompanyUser)
router.patch('/companies/:id/users/:userId',   ctrl.updateCompanyUser)
router.delete('/companies/:id/users/:userId',  ctrl.deleteCompanyUser)

module.exports = router
