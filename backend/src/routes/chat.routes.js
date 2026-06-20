const router      = require('express').Router()
const chatService = require('../services/chat.service')
const { authenticate } = require('../middlewares/auth.middleware')
const R           = require('../utils/response')

router.use(authenticate)

// ── GET /chat/rooms ─────────────────────────────────────────────
router.get('/rooms', async (req, res) => {
  try {
    const rooms = await chatService.getRooms(req.user.user_id)
    return R.success(res, { rooms })
  } catch (err) { return R.error(res, err.message) }
})

// ── POST /chat/rooms ────────────────────────────────────────────
router.post('/rooms', async (req, res) => {
  try {
    const room = await chatService.createRoom(req.body, req.user.user_id, req.user.company_id)
    return R.created(res, { room })
  } catch (err) { return R.error(res, err.message, err.status || 500) }
})

// ── DELETE /chat/rooms/:id ──────────────────────────────────────
router.delete('/rooms/:id', async (req, res) => {
  try {
    await chatService.deleteRoom(req.params.id, req.user.user_id, req.user.role)
    return R.success(res, { deleted: true })
  } catch (err) { return R.error(res, err.message, err.status || 500) }
})

// ── GET /chat/rooms/:id/messages ────────────────────────────────
router.get('/rooms/:id/messages', async (req, res) => {
  try {
    const limit  = parseInt(req.query.limit)  || 50
    const offset = parseInt(req.query.offset) || 0
    const messages = await chatService.getMessages(req.params.id, req.user.user_id, limit, offset)
    return R.success(res, { messages })
  } catch (err) { return R.error(res, err.message, err.status || 500) }
})

// ── POST /chat/rooms/:id/messages ───────────────────────────────
router.post('/rooms/:id/messages', async (req, res) => {
  try {
    const message = await chatService.createMessage({
      roomId:  req.params.id,
      userId:  req.user.user_id,
      content: req.body.content,
    })
    return R.created(res, { message })
  } catch (err) { return R.error(res, err.message) }
})

module.exports = router