const router = require('express').Router()
const ctrl   = require('../controllers/financial.controller')
const { authenticate } = require('../middlewares/auth.middleware')
const validate = require('../middlewares/validate.middleware')
const V        = require('../validators/financial.validator')
const logger   = require('../middlewares/logger.middleware')
const pool     = require('../config/database')

router.use(authenticate, logger)

router.get('/dashboard',  ctrl.getDashboard)
router.get('/dre',        ctrl.getDRE)
router.get('/projects',   ctrl.getProjectFinancials)

router.get('/expenses',              ctrl.getExpenses)
router.post('/expenses', validate(V.createExpense), ctrl.createExpense)
router.patch('/expenses/:id',        ctrl.updateExpense)
router.delete('/expenses/:id',       ctrl.deleteExpense)
router.patch('/expenses/:id/pay', validate(V.confirmPayment), ctrl.confirmPayment)

router.get('/revenues',              ctrl.getRevenues)
router.post('/revenues', validate(V.createRevenue), ctrl.createRevenue)
router.patch('/revenues/installments/:id/receive', validate(V.confirmReceipt), ctrl.confirmReceipt)
router.patch('/revenues/installments/:id',         ctrl.updateInstallment)

router.delete('/revenues/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM revenue_installments WHERE revenue_id = $1', [req.params.id])
    await pool.query('DELETE FROM revenues WHERE id = $1', [req.params.id])
    return res.json({ success: true, message: 'Receita excluída' })
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message })
  }
})

router.get('/categories',              ctrl.getCategories)
router.post('/categories', validate(V.createCategory), ctrl.createCategory)
router.patch('/categories/:id',        ctrl.updateCategory)
router.delete('/categories/:id',       ctrl.deleteCategory)

module.exports = router