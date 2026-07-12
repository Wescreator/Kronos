const pool = require('../config/database')

/**
 * Salas visíveis para o usuário.
 *
 * Uma conversa privada AINDA SEM MENSAGENS só aparece para quem a criou: o
 * destinatário só descobre a conversa quando a primeira mensagem chega. Sem
 * isso, escolher alguém na lista de contatos já fazia surgir uma conversa
 * vazia no sidebar do outro — como se ele tivesse sido chamado sem ninguém
 * ter dito nada.
 *
 * A associação em chat_room_members é criada normalmente para os dois desde o
 * início (é ela que dá acesso à sala e traz nome/avatar do outro participante);
 * o que muda aqui é só a VISIBILIDADE na listagem.
 *
 * Grupos/canais seguem visíveis desde a criação — ali entrar no canal já é a
 * informação relevante, mesmo sem mensagem nenhuma.
 *
 * O EXISTS não filtra is_deleted de propósito: depois que a conversa se revelou
 * ao destinatário, apagar a última mensagem não a faz sumir do sidebar dele.
 */
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
     WHERE cr.type <> 'private'
        OR cr.created_by = $1
        OR EXISTS (SELECT 1 FROM chat_messages cm WHERE cm.room_id = cr.id)
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

/**
 * Procura a conversa privada JÁ EXISTENTE entre exatamente dois usuários.
 *
 * Uma conversa 1:1 entre A e B é uma identidade natural — não é "um registro
 * semelhante" que o usuário poderia querer criar de novo. Sem esta busca, duas
 * abas (ou um retry) criavam DUAS salas privadas entre as mesmas pessoas e as
 * mensagens se espalhavam entre elas.
 */
const findPrivateRoomBetween = async (companyId, userA, userB) => {
  const { rows } = await pool.query(
    `SELECT cr.*
       FROM chat_rooms cr
      WHERE cr.type = 'private'
        AND cr.company_id = $1
        AND EXISTS (SELECT 1 FROM chat_room_members m WHERE m.room_id = cr.id AND m.user_id = $2)
        AND EXISTS (SELECT 1 FROM chat_room_members m WHERE m.room_id = cr.id AND m.user_id = $3)
        AND (SELECT count(*) FROM chat_room_members m WHERE m.room_id = cr.id) = 2
      LIMIT 1`,
    [companyId, userA, userB]
  )
  return rows[0] || null
}

/**
 * Cria a sala e adiciona os membros numa ÚNICA transação.
 *
 * Antes eram statements soltos: uma falha entre o INSERT da sala e o dos
 * membros deixava uma sala órfã, sem nenhum membro — invisível e inacessível
 * para todos, inclusive para quem a criou.
 */
const createRoomWithMembers = async ({ name, type, createdBy, companyId, memberIds }) => {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const { rows } = await client.query(
      `INSERT INTO chat_rooms (name, type, created_by, company_id) VALUES ($1,$2,$3,$4) RETURNING *`,
      [name, type, createdBy, companyId]
    )
    const room = rows[0]

    for (const uid of memberIds) {
      await client.query(
        `INSERT INTO chat_room_members (room_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
        [room.id, uid]
      )
    }

    await client.query('COMMIT')
    return room
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
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

// company_id é NOT NULL em chat_messages — vem da sala (chat_rooms.company_id),
// já resolvida pelo service via findRoomByIdAndMember antes de chamar isso.
const createMessage = async ({ roomId, userId, content, companyId }) => {
  const { rows } = await pool.query(
    `INSERT INTO chat_messages (room_id, user_id, content, company_id) VALUES ($1,$2,$3,$4) RETURNING *`,
    [roomId, userId, content, companyId]
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
  findPrivateRoomBetween,
  createRoomWithMembers,
  addMember,
  deleteRoom,
  findMessages,
  createMessage,
  findRoomMemberIds,
}