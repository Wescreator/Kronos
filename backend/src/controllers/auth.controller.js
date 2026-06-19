const authService = require('../services/auth.service')
const userRepo    = require('../repositories/user.repository')
const R = require('../utils/response')

const login = async (req, res) => {
  try {
    const result = await authService.login(req.body.email, req.body.password)
    return R.success(res, result)
  } catch (err) {
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
    return R.success(res, result)

  } catch (err) {
    return R.error(res, err.message, err.status || 500)
  }
}

module.exports = { login, register, refresh, me, forgotPassword, resetPassword }