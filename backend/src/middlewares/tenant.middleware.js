const companyRepo = require('../repositories/company.repository')
const R            = require('../utils/response')
const { setCompanyId } = require('../config/tenantContext')

// Valida formato UUID antes de consultar o banco. Sem essa checagem, um
// header malformado (ex: "X-Impersonate-Company: abc123") chega cru no
// Postgres, gera erro de driver (22P02) e cairia no catch genérico como
// 500 — quando na verdade é erro de input do client (400).
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * TenantMiddleware
 *
 * Deve ser registrado SEMPRE depois de `authenticate` nas rotas
 * que acessam dados de empresa.
 *
 * Popula req.tenant = { id, name, plan } com a empresa do usuário.
 *
 * scope === 'global'  (developer/support):
 *   - Sem header X-Impersonate-Company → req.tenant = null
 *     (acesso de plataforma, sem filtro de empresa)
 *   - Com header X-Impersonate-Company → carrega a empresa
 *     informada e popula req.tenant normalmente
 *
 * scope === 'company':
 *   - Carrega a empresa do próprio usuário (req.user.company_id)
 *   - Bloqueia se a empresa estiver inativa/suspensa
 */
const tenantMiddleware = async (req, res, next) => {
  try {
    if (req.user.scope === 'global') {
      const impersonateId = req.headers['x-impersonate-company']

      if (!impersonateId) {
        req.tenant = null
        return next()
      }

      if (!UUID_REGEX.test(impersonateId)) {
        return R.error(res, 'Identificador de empresa para impersonação é inválido.', 400)
      }

      const company = await companyRepo.findById(impersonateId)
      if (!company) return R.notFound(res, 'Empresa não encontrada')
      if (!company.is_active) return R.forbidden(res, 'Empresa inativa ou suspensa')

      // Impersonacao: passa a isolar tudo pela empresa-alvo.
      setCompanyId(company.id)
      req.tenant = { id: company.id, name: company.name, plan: company.plan }
      return next()
    }

    // scope === 'company'
    if (!req.user.company_id) {
      return R.forbidden(res, 'Usuário sem empresa vinculada')
    }

    const company = await companyRepo.findById(req.user.company_id)
    if (!company) return R.notFound(res, 'Empresa não encontrada')
    if (!company.is_active) return R.forbidden(res, 'Empresa inativa ou suspensa')

    setCompanyId(company.id)
    req.tenant = { id: company.id, name: company.name, plan: company.plan }
    return next()

  } catch (err) {
    // Erros inesperados (ex: falha de conexão com o banco) ficam só no
    // log do servidor — o client nunca recebe err.message cru.
    console.error('[tenantMiddleware] Erro inesperado:', err)
    return R.error(res, 'Erro interno ao processar a solicitação.', 500)
  }
}

module.exports = tenantMiddleware