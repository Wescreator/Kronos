// src/middlewares/auth.middleware.js
const jwt = require('jsonwebtoken')
const jwtConfig = require('../config/jwt')
const R = require('../utils/response')
const { runWithTenant } = require('../config/tenantContext')

const BYPASS_ROLES = ['developer']

// Escopos aceitos por padrão nas rotas internas. Os tokens do portal do
// cliente (scope 'client', emitidos em /api/client-portal/auth) são
// assinados com o MESMO secret dos tokens internos — a verificação de
// assinatura sozinha não distingue os dois. Sem esta checagem, um cliente
// do portal acessaria qualquer rota interna que não tenha authorize()
// (tarefas, clientes, orçamentos...).
const INTERNAL_SCOPES = ['company', 'global']

const buildAuthenticate = (allowedScopes) => (req, res, next) => {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return R.unauthorized(res, 'Token não fornecido')
  }

  const token = header.split(' ')[1]
  try {
    const decoded = jwt.verify(token, jwtConfig.secret)

    if (!allowedScopes.includes(decoded.scope)) {
      return R.forbidden(res, 'Este token não tem acesso a este recurso')
    }

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

// Padrão das rotas internas: recusa tokens do portal do cliente.
const authenticate = buildAuthenticate(INTERNAL_SCOPES)

// Exceção explícita: rotas compartilhadas com o portal do cliente
// (hoje apenas /api/posts). O controle fino do que um 'client' pode
// fazer continua no service (post.service.js).
const authenticateAllowClient = buildAuthenticate([...INTERNAL_SCOPES, 'client'])

const authorize = (...roles) => (req, res, next) => {
  if (BYPASS_ROLES.includes(req.user.role)) {
    return next()
  }
  if (!roles.includes(req.user.role)) {
    return R.forbidden(res, 'Você não tem permissão para esta ação')
  }
  next()
}

module.exports = { authenticate, authenticateAllowClient, authorize, BYPASS_ROLES }
