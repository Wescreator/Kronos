const router = require('express').Router()
const R = require('../utils/response')
const clientPortalAuthService = require('../services/client-portal-auth.service')

// Rotas públicas — não passam por authenticate (o cliente ainda não tem
// token). Mesmo padrão de auth.routes.js (login/register/forgot-password
// também são públicos lá).

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    const result = await clientPortalAuthService.login(email, password)
    return R.success(res, result)
  } catch (err) {
    return R.error(res, err.message, err.status || 500)
  }
})

router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body
    const result = await clientPortalAuthService.refreshToken(refreshToken)
    return R.success(res, result)
  } catch (err) {
    return R.error(res, err.message, err.status || 500)
  }
})

module.exports = router