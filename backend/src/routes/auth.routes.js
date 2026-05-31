const router   = require('express').Router()
const ctrl     = require('../controllers/auth.controller')
const validate = require('../middlewares/validate.middleware')
const { authenticate } = require('../middlewares/auth.middleware')
const V        = require('../validators/auth.validator')

router.post('/login',   validate(V.login),    ctrl.login)
router.post('/register',validate(V.register), ctrl.register)
router.post('/refresh', ctrl.refresh)
router.get('/me',       authenticate,         ctrl.me)

module.exports = router