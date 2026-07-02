// src/middlewares/auth.middleware.js
const jwt = require('jsonwebtoken')
const jwtConfig = require('../config/jwt')
const R = require('../utils/response')
const { runWithTenant } = require('../config/tenantContext')

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

    return runWithTenant(
      {
        userId: decoded.user_id,
        companyId: decoded.company_id || null,
        scope: decoded.scope,
        role: decoded.role,
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

module.exports = { authenticate, authorize, BYPASS_ROLES }