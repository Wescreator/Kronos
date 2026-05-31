const router = require('express').Router()
const pool   = require('../config/database')
const { authenticate } = require('../middlewares/auth.middleware')
const R      = require('../utils/response')

router.use(authenticate)

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM notifications WHERE user_id = $1
       ORDER BY created_at DESC LIMIT 50`,
      [req.user.id]
    )
    return R.success(res, { notifications: rows })
  } catch (err) { return R.error(res, err.message) }
})

router.patch('/:id/read', async (req, res) => {
  try {
    await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    )
    return R.success(res, { message: 'Notificação marcada como lida' })
  } catch (err) { return R.error(res, err.message) }
})

router.patch('/read-all', async (req, res) => {
  try {
    await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE user_id = $1',
      [req.user.id]
    )
    return R.success(res, { message: 'Todas as notificações marcadas como lidas' })
  } catch (err) { return R.error(res, err.message) }
})

module.exports = router