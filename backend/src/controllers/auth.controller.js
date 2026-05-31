const authService = require('../services/auth.service')
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
    const userRepo = require('../repositories/user.repository')
    const user = await userRepo.findById(req.user.id)
    if (!user) return R.notFound(res, 'Usuário não encontrado')
    return R.success(res, { user })
  } catch (err) {
    return R.error(res, err.message)
  }
}

module.exports = { login, register, refresh, me }