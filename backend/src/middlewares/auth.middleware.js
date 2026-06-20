const jwt       = require('jsonwebtoken')
const jwtConfig = require('../config/jwt')
const R         = require('../utils/response')
const { runWithTenant } = require('../config/tenantContext')

// Roles que possuem acesso total, independente da lista de roles
// permitidas em authorize(). Usado pelo Developer da plataforma.
const BYPASS_ROLES = ['developer']

const authenticate = (req, res, next) => {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return R.unauthorized(res, 'Token não fornecido')
  }

  const token = header.split(' ')[1]
  try {
    const decoded = jwt.verify(token, jwtConfig.secret)
    req.user = decoded

    // Abre o contexto de tenant para toda a cadeia da requisicao.
    // A extensao do Prisma usa este contexto para isolar por empresa.
    // Para escopo global (developer), companyId so e definido se houver
    // impersonacao ativa (tratada no tenantMiddleware).
    return runWithTenant(
      {
        userId:    decoded.user_id,
        companyId: decoded.company_id || null,
        scope:     decoded.scope,
        role:      decoded.role,
      },
      () => next()
    )
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return R.unauthorized(res, 'Token expirado')
    }
    return R.unauthorized(res, 'Token inválido')
  }
}

const authorize = (...roles) => (req, res, next) => {
  if (BYPASS_ROLES.includes(req.user.role)) {
    return next()
  }
  if (!roles.includes(req.user.role)) {
    return R.forbidden(res, 'Você não tem permissão para esta ação')
  }
  next()
}

module.exports = { authenticate, authorize }