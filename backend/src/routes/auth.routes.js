const router   = require('express').Router()
const ctrl     = require('../controllers/auth.controller')
const validate = require('../middlewares/validate.middleware')
const { authenticate } = require('../middlewares/auth.middleware')
const rateLimit = require('../middlewares/rateLimit.middleware')
const V        = require('../validators/auth.validator')

// Limites mais agressivos nas rotas sensíveis (anti brute force / abuso)
const authLimiter  = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: 'Muitas tentativas. Aguarde alguns minutos.' })
const emailLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 5,  message: 'Muitas solicitações. Tente novamente mais tarde.' })

router.post('/login',    authLimiter, validate(V.login),    ctrl.login)
router.post('/register', authLimiter, validate(V.register), ctrl.register)
router.post('/refresh',  authLimiter, ctrl.refresh)
router.get('/me',        authenticate,         ctrl.me)

// Recuperação de senha
router.post('/forgot-password', emailLimiter, ctrl.forgotPassword)
router.post('/reset-password',  authLimiter,  ctrl.resetPassword)

module.exports = router