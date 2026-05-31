const router = require('express').Router()
const pool   = require('../config/database')
const { authenticate } = require('../middlewares/auth.middleware')
const R      = require('../utils/response')

router.use(authenticate)

router.get('/rooms', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT cr.*, crm2.user_id AS other_user_id, u.name AS other_user_name, u.avatar_url AS other_user_avatar,
              (SELECT content FROM chat_messages cm WHERE cm.room_id = cr.id ORDER BY cm.created_at DESC LIMIT 1) AS last_message,
              (SELECT created_at FROM chat_messages cm WHERE cm.room_id = cr.id ORDER BY cm.created_at DESC LIMIT 1) AS last_message_at
       FROM chat_rooms cr
       JOIN chat_room_members crm  ON crm.room_id = cr.id AND crm.user_id = $1
       LEFT JOIN chat_room_members crm2 ON crm2.room_id = cr.id AND crm2.user_id != $1
       LEFT JOIN users u ON u.id = crm2.user_id
       ORDER BY last_message_at DESC NULLS LAST`,
      [req.user.id]
    )
    return R.success(res, { rooms: rows })
  } catch (err) { return R.error(res, err.message) }
})

router.post('/rooms', async (req, res) => {
  try {
    const { name, type = 'private', members = [] } = req.body
    const { rows } = await pool.query(
      'INSERT INTO chat_rooms (name, type, created_by) VALUES ($1,$2,$3) RETURNING *',
      [name, type, req.user.id]
    )
    const room = rows[0]
    const allMembers = [...new Set([req.user.id, ...members])]
    for (const uid of allMembers) {
      await pool.query(
        'INSERT INTO chat_room_members (room_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
        [room.id, uid]
      )
    }
    return R.created(res, { room })
  } catch (err) { return R.error(res, err.message) }
})

router.get('/rooms/:id/messages', async (req, res) => {
  try {
    const limit  = parseInt(req.query.limit)  || 50
    const offset = parseInt(req.query.offset) || 0
    const { rows } = await pool.query(
      `SELECT cm.*, u.name AS user_name, u.avatar_url
       FROM chat_messages cm
       JOIN users u ON u.id = cm.user_id
       WHERE cm.room_id = $1 AND cm.is_deleted = FALSE
       ORDER BY cm.created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.params.id, limit, offset]
    )
    return R.success(res, { messages: rows.reverse() })
  } catch (err) { return R.error(res, err.message) }
})

router.post('/rooms/:id/messages', async (req, res) => {
  try {
    const { content } = req.body
    const { rows } = await pool.query(
      `INSERT INTO chat_messages (room_id, user_id, content)
       VALUES ($1,$2,$3) RETURNING *`,
      [req.params.id, req.user.id, content]
    )
    const message = rows[0]

    const { rows: members } = await pool.query(
      'SELECT user_id FROM chat_room_members WHERE room_id = $1',
      [req.params.id]
    )
    const memberIds = members.map(m => m.user_id).filter(id => id !== req.user.id)
    global.broadcastToRoom(memberIds, { type: 'new_message', roomId: req.params.id, message })

    return R.created(res, { message })
  } catch (err) { return R.error(res, err.message) }
})

module.exports = router