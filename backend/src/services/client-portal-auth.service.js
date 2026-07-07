const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const jwtConfig = require('../config/jwt')
const clientRepo = require('../repositories/client.repository')

/**
 * Login do cliente no portal de postagens.
 *
 * Gera um JWT com scope: 'client' e role: null — distinto do payload de
 * usuário interno (buildAuthPayload em auth.service.js, que não é tocado
 * por este arquivo). user_id aqui é o id de clients_leads.
 */
const login = async (portalEmail, password) => {
  if (!portalEmail || !password) {
    throw { status: 400, message: 'Informe usuário e senha.' }
  }

  const client = await clientRepo.findByPortalEmail(portalEmail.toLowerCase().trim())
  if (!client || !client.portal_password_hash) {
    throw { status: 401, message: 'Credenciais inválidas' }
  }

  const valid = await bcrypt.compare(password, client.portal_password_hash)
  if (!valid) throw { status: 401, message: 'Credenciais inválidas' }

  await clientRepo.updatePortalLastLogin(client.id)

  const payload = {
    user_id: client.id,
    company_id: client.company_id,
    scope: 'client',
    role: null,
  }

  const accessToken = jwt.sign(payload, jwtConfig.secret, { expiresIn: jwtConfig.expiresIn })
  const refreshToken = jwt.sign(payload, jwtConfig.refreshSecret, { expiresIn: jwtConfig.refreshExpiresIn })

  return {
    user: {
      id: client.id,
      user_id: client.id,
      name: client.name,
      email: client.portal_email,
      scope: 'client',
      company_id: client.company_id,
      role: null,
    },
    accessToken,
    refreshToken,
  }
}

const refreshToken = async (token) => {
  try {
    const decoded = jwt.verify(token, jwtConfig.refreshSecret)
    if (decoded.scope !== 'client') {
      throw { status: 401, message: 'Token inválido' }
    }

    const payload = {
      user_id: decoded.user_id,
      company_id: decoded.company_id,
      scope: 'client',
      role: null,
    }
    const accessToken = jwt.sign(payload, jwtConfig.secret, { expiresIn: jwtConfig.expiresIn })
    return { accessToken }
  } catch (err) {
    if (err.status) throw err
    throw { status: 401, message: 'Refresh token inválido ou expirado' }
  }
}

module.exports = { login, refreshToken }