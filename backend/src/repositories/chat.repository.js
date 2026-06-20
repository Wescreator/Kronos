const pool = require('../config/database')

const findRoomsByUser = async (userId) => {
  const { rows } = await pool.query(
    `SELECT cr.*,
            crm2.user_id    AS other_user_id,
            u.name          AS other_user_name,
            u.avatar_url    AS other_user_avatar,
            (SELECT content    FROM chat_messages cm WHERE cm.room_id = cr.id ORDER BY cm.created_at DESC LIMIT 1) AS last_message,
            (SELECT created_at FROM chat_messages cm WHERE cm.room_id = cr.id ORDER BY cm.created_at DESC LIMIT 1) AS last_message_at
     FROM chat_rooms cr
     JOIN chat_room_members crm   ON crm.room_id  = cr.id AND crm.user_id  = $1
     LEFT JOIN chat_room_members crm2 ON crm2.room_id = cr.id AND crm2.user_id != $1
     LEFT JOIN users u ON u.id = crm2.user_id
     ORDER BY last_message_at DESC NULLS LAST`,
    [userId]
  )
  return rows
}

const findRoomByIdAndMember = async (roomId, userId) => {
  const { rows } = await pool.query(
    `SELECT cr.*
     FROM chat_rooms cr
     JOIN chat_room_members crm ON crm.room_id = cr.id AND crm.user_id = $1
     WHERE cr.id = $2`,
    [userId, roomId]
  )
  return rows[0] || null
}

const createRoom = async ({ name, type, createdBy, companyId }) => {
  const { rows } = await pool.query(
    `INSERT INTO chat_rooms (name, type, created_by, company_id) VALUES ($1,$2,$3,$4) RETURNING *`,
    [name, type, createdBy, companyId]
  )
  return rows[0]
}

const addMember = async (roomId, userId) => {
  await pool.query(
    `INSERT INTO chat_room_members (room_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
    [roomId, userId]
  )
}

const deleteRoom = async (roomId) => {
  await pool.query(`DELETE FROM chat_messages     WHERE room_id = $1`, [roomId])
  await pool.query(`DELETE FROM chat_room_members WHERE room_id = $1`, [roomId])
  await pool.query(`DELETE FROM chat_rooms        WHERE id      = $1`, [roomId])
}

const findMessages = async (roomId, limit, offset) => {
  const { rows } = await pool.query(
    `SELECT cm.*, u.name AS user_name, u.avatar_url
     FROM chat_messages cm
     JOIN users u ON u.id = cm.user_id
     WHERE cm.room_id = $1 AND cm.is_deleted = FALSE
     ORDER BY cm.created_at DESC
     LIMIT $2 OFFSET $3`,
    [roomId, limit, offset]
  )
  return rows.reverse()
}

const createMessage = async ({ roomId, userId, content }) => {
  const { rows } = await pool.query(
    `INSERT INTO chat_messages (room_id, user_id, content) VALUES ($1,$2,$3) RETURNING *`,
    [roomId, userId, content]
  )
  return rows[0]
}

const findRoomMemberIds = async (roomId) => {
  const { rows } = await pool.query(
    `SELECT user_id FROM chat_room_members WHERE room_id = $1`,
    [roomId]
  )
  return rows.map(r => r.user_id)
}

module.exports = {
  findRoomsByUser,
  findRoomByIdAndMember,
  createRoom,
  addMember,
  deleteRoom,
  findMessages,
  createMessage,
  findRoomMemberIds,
}