const router   = require('express').Router()
const ctrl     = require('../controllers/auth.controller')
const validate = require('../middlewares/validate.middleware')
const { authenticate, authorize } = require('../middlewares/auth.middleware')
const rateLimit = require('../middlewares/rateLimit.middleware')
const V        = require('../validators/auth.validator')

// Limites mais agressivos nas rotas sensíveis (anti brute force / abuso)
const authLimiter  = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: 'Muitas tentativas. Aguarde alguns minutos.' })
const emailLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 5,  message: 'Muitas solicitações. Tente novamente mais tarde.' })

router.post('/login',    authLimiter, validate(V.login),    ctrl.login)

// Criação de membro: deixou de ser rota pública (evita enumeração de
// e-mails via 409 e criação de usuários por anônimos). Agora exige login e
// papel owner/admin — o mesmo que a tela de Equipe (TeamPage) usa, enviando
// o Bearer token. O developer (global) tem bypass no authorize.
router.post('/register', authenticate, authorize('owner', 'admin'), validate(V.register), ctrl.register)
router.post('/refresh',  authLimiter, ctrl.refresh)
router.get('/me',        authenticate,         ctrl.me)
// Logout "de todos os dispositivos": invalida os refresh tokens ativos.
router.post('/logout',   authenticate,         ctrl.logout)

// Recuperação de senha
router.post('/forgot-password', emailLimiter, ctrl.forgotPassword)
router.post('/reset-password',  authLimiter,  ctrl.resetPassword)

module.exports = router