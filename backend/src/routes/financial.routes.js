const router   = require('express').Router()
const ctrl     = require('../controllers/financial.controller')
const { authenticate, authorize } = require('../middlewares/auth.middleware')
const tenantMiddleware = require('../middlewares/tenant.middleware')
const validate = require('../middlewares/validate.middleware')
const V        = require('../validators/financial.validator')
const logger   = require('../middlewares/logger.middleware')

router.use(authenticate, tenantMiddleware, authorize('admin'), logger)

router.get('/dashboard',            ctrl.getDashboard)
router.get('/dre',                  ctrl.getDRE)
router.get('/projects',             ctrl.getProjectFinancials)
router.get('/expenses-by-category', ctrl.getExpensesByCategory)
router.get('/forecast',             ctrl.getForecast)

router.get('/expenses',                               ctrl.getExpenses)
router.post('/expenses',         validate(V.createExpense),   ctrl.createExpense)
router.patch('/expenses/:id',                         ctrl.updateExpense)
router.delete('/expenses/:id',                        ctrl.deleteExpense)
router.patch('/expenses/:id/pay', validate(V.confirmPayment), ctrl.confirmPayment)

router.get('/revenues',                                         ctrl.getRevenues)
router.post('/revenues',          validate(V.createRevenue),    ctrl.createRevenue)
router.delete('/revenues/:id',                                  ctrl.deleteRevenue)
router.patch('/revenues/installments/:id/receive', validate(V.confirmReceipt), ctrl.confirmReceipt)
router.patch('/revenues/installments/:id',                      ctrl.updateInstallment)

router.get('/categories',                              ctrl.getCategories)
router.post('/categories',        validate(V.createCategory),  ctrl.createCategory)
router.patch('/categories/:id',                        ctrl.updateCategory)
router.delete('/categories/:id',                       ctrl.deleteCategory)

module.exports = router