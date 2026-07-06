const router = require('express').Router()
const pool   = require('../config/database')
const { authenticate } = require('../middlewares/auth.middleware')
const R      = require('../utils/response')

router.use(authenticate)

router.get('/', async (req, res) => {
  try {
    // Filtra por user_id E company_id: reforça o isolamento multi-tenant
    // mesmo que o usuário tenha vínculo com mais de uma empresa no futuro.
    // company_id vem direto do JWT decodificado (req.user), populado pelo
    // authenticate — esta rota não usa tenantMiddleware/req.tenant, pois
    // notificação é escopada pelo usuário, não por impersonação de empresa.
    const companyId = req.user.company_id
    const params = companyId ? [req.user.user_id, companyId] : [req.user.user_id]
    const companyFilter = companyId ? 'AND company_id = $2' : ''

    const { rows } = await pool.query(
      `SELECT * FROM notifications WHERE user_id = $1 ${companyFilter}
       ORDER BY created_at DESC LIMIT 50`,
      params
    )
    return R.success(res, { notifications: rows })
  } catch (err) { return R.error(res, err.message) }
})

router.patch('/:id/read', async (req, res) => {
  try {
    const companyId = req.user.company_id
    const params = companyId
      ? [req.params.id, req.user.user_id, companyId]
      : [req.params.id, req.user.user_id]
    const companyFilter = companyId ? 'AND company_id = $3' : ''

    await pool.query(
      `UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2 ${companyFilter}`,
      params
    )
    return R.success(res, { message: 'Notificação marcada como lida' })
  } catch (err) { return R.error(res, err.message) }
})

router.patch('/read-all', async (req, res) => {
  try {
    const companyId = req.user.company_id
    const params = companyId ? [req.user.user_id, companyId] : [req.user.user_id]
    const companyFilter = companyId ? 'AND company_id = $2' : ''

    await pool.query(
      `UPDATE notifications SET is_read = TRUE WHERE user_id = $1 ${companyFilter}`,
      params
    )
    return R.success(res, { message: 'Todas as notificações marcadas como lidas' })
  } catch (err) { return R.error(res, err.message) }
})

router.delete('/:id', async (req, res) => {
  try {
    const companyId = req.user.company_id
    const params = companyId
      ? [req.params.id, req.user.user_id, companyId]
      : [req.params.id, req.user.user_id]
    const companyFilter = companyId ? 'AND company_id = $3' : ''

    const { rowCount } = await pool.query(
      `DELETE FROM notifications WHERE id = $1 AND user_id = $2 ${companyFilter}`,
      params
    )
    if (rowCount === 0) return R.notFound(res, 'Notificação não encontrada')
    return R.success(res, { deleted: true })
  } catch (err) { return R.error(res, err.message) }
})

module.exports = router