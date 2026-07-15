const router = require('express').Router()

const { authenticate, authorize } = require('../middlewares/auth.middleware')
const tenantMiddleware = require('../middlewares/tenant.middleware')
const companyRepo = require('../repositories/company.repository')
const R = require('../utils/response')

// Dados públicos (dentro do tenant) da PRÓPRIA empresa logada — usados nos
// cabeçalhos dos documentos gerados no frontend (relatórios, PDFs).
// authorize com a lista de roles internos bloqueia tokens de portal
// (scope 'client', role null) — mesma postura do calendar.routes.
router.get(
  '/me',
  authenticate,
  tenantMiddleware,
  authorize('owner', 'admin', 'manager', 'employee'),
  async (req, res) => {
    try {
      const c = await companyRepo.findById(req.tenant.id)
      if (!c) return R.notFound(res, 'Empresa não encontrada')
      return R.success(res, {
        company: {
          name: c.name,
          trade_name: c.trade_name,
          document: c.document,
          email: c.email,
          phone: c.phone,
          logo_url: c.logo_url,
          responsible_name: c.responsible_name,
          responsible_role: c.responsible_role,
        },
      })
    } catch (err) {
      return R.error(res, err.message, err.status || 500)
    }
  }
)

module.exports = router
