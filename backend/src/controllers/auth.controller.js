const authService = require('../services/auth.service')
const userRepo    = require('../repositories/user.repository')
const R = require('../utils/response')
const { logAuthEvent } = require('../utils/activityLog')

const login = async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.toLowerCase().trim() : null
  try {
    const result = await authService.login(req.body.email, req.body.password)
    // Auditoria de login bem-sucedido (fire-and-forget, nunca derruba a resposta).
    logAuthEvent({
      action: 'login_success',
      userId: result.user.user_id,
      companyId: result.user.company_id,
      payload: { email, ip: req.ip },
    })
    return R.success(res, result)
  } catch (err) {
    // Auditoria de falha (sem senha). Ajuda a detectar brute force por conta.
    logAuthEvent({ action: 'login_failed', payload: { email, ip: req.ip } })
    return R.error(res, err.message, err.status || 500)
  }
}

const register = async (req, res) => {
  try {
    const user = await authService.register(req.body)
    return R.created(res, { user })
  } catch (err) {
    return R.error(res, err.message, err.status || 500)
  }
}

const logout = async (req, res) => {
  try {
    const result = await authService.logout(req.user.user_id)
    logAuthEvent({
      action: 'logout',
      userId: req.user.user_id,
      companyId: req.user.company_id || null,
      payload: { ip: req.ip },
    })
    return R.success(res, result)
  } catch (err) {
    return R.error(res, err.message, err.status || 500)
  }
}

const refresh = async (req, res) => {
  try {
    const result = await authService.refreshToken(req.body.refreshToken)
    return R.success(res, result)
  } catch (err) {
    return R.error(res, err.message, err.status || 500)
  }
}

const me = async (req, res) => {
  try {
    const user = await userRepo.findById(req.user.user_id)

    if (!user) {
      return R.notFound(res, 'Usuário não encontrado')
    }

    // Enriquece com dados de escopo/tenant vindos do próprio JWT —
    // evita uma segunda consulta a company_users.
    return R.success(res, {
      user: {
        ...user,
        scope:      req.user.scope,
        role:       req.user.role,
        company_id: req.user.company_id,
      },
    })
  } catch (err) {
    return R.error(res, err.message, err.status || 500)
  }
}

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body

    if (!email || typeof email !== 'string') {
      return R.error(res, 'Email é obrigatório.', 400)
    }

    const result = await authService.forgotPassword(email.toLowerCase().trim())
    return R.success(res, result)

  } catch (err) {
    return R.error(res, err.message, err.status || 500)
  }
}

const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body

    if (!token || !password) {
      return R.error(res, 'Token e nova senha são obrigatórios.', 400)
    }

    const result = await authService.resetPassword(token, password)
    logAuthEvent({ action: 'password_reset', payload: { ip: req.ip } })
    return R.success(res, result)

  } catch (err) {
    return R.error(res, err.message, err.status || 500)
  }
}

module.exports = { login, register, logout, refresh, me, forgotPassword, resetPassword }