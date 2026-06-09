const router   = require('express').Router()
const ctrl     = require('../controllers/auth.controller')
const validate = require('../middlewares/validate.middleware')
const { authenticate } = require('../middlewares/auth.middleware')
const V        = require('../validators/auth.validator')

// Rotas existentes — inalteradas
router.post('/login',    validate(V.login),    ctrl.login)
router.post('/register', validate(V.register), ctrl.register)
router.post('/refresh',  ctrl.refresh)
router.get('/me',        authenticate,         ctrl.me)

// Novas rotas — recuperação de senha
router.post('/forgot-password', ctrl.forgotPassword)
router.post('/reset-password',  ctrl.resetPassword)

router.post('/test-email', async (req, res) => {
  try {
    const emailService = require('../services/email.service')

    await emailService.sendPasswordResetEmail({
      to: process.env.GMAIL_USER,
      name: 'Wesley',
      resetLink: 'https://kronos-neon.vercel.app/reset-password?token=teste'
    })

    return res.json({
      success: true,
      message: 'Email enviado'
    })
  } catch (err) {
    console.error(err)
    return res.status(500).json({
      success: false,
      message: err.message
    })
  }
})

module.exports = router