require('dotenv').config() // precisa vir antes de config/database (lê DATABASE_URL)

const test = require('node:test')
const assert = require('node:assert/strict')

const pool = require('../src/config/database')
const chatRepo = require('../src/repositories/chat.repository')

/**
 * Visibilidade das salas de chat na listagem do sidebar.
 *
 * A regra que está sendo testada mora numa cláusula SQL (findRoomsByUser) e
 * quebra em SILÊNCIO se alguém editar a query: o sintoma seria uma conversa
 * vazia aparecendo no sidebar de quem nunca foi chamado — nada estoura, nada
 * loga. Por isso vale um teste de verdade contra o Postgres.
 *
 * ATENÇÃO — como em idempotency.test.js, este teste ESCREVE no banco (os demais
 * só leem). A escrita se limita a salas de chat criadas aqui, todas removidas no
 * final; nenhum registro pré-existente é tocado.
 */

let creator, recipient, companyId
const createdRoomIds = []

const track = (room) => { createdRoomIds.push(room.id); return room }

const seesRoom = async (userId, roomId) => {
  const rooms = await chatRepo.findRoomsByUser(userId)
  return rooms.some(r => r.id === roomId)
}

test.before(async () => {
  // Dois usuários da MESMA empresa (o chat é sempre intra-empresa).
  const { rows } = await pool.query(
    `SELECT id, company_id FROM users
      WHERE company_id = (
        SELECT company_id FROM users
         WHERE company_id IS NOT NULL
         GROUP BY company_id HAVING count(*) >= 2
         LIMIT 1
      )
      LIMIT 2`
  )
  assert.ok(rows.length === 2, 'é necessária uma empresa com ao menos dois usuários')
  creator   = rows[0].id
  recipient = rows[1].id
  companyId = rows[0].company_id
})

test.after(async () => {
  for (const id of createdRoomIds) {
    await chatRepo.deleteRoom(id)
  }
  await pool.end()
})

test('conversa privada sem mensagens só aparece para quem a criou', async () => {
  const room = track(await chatRepo.createRoomWithMembers({
    name: null,
    type: 'private',
    createdBy: creator,
    companyId,
    memberIds: [creator, recipient],
  }))

  assert.equal(await seesRoom(creator, room.id), true,
    'quem criou a conversa deve vê-la imediatamente')
  assert.equal(await seesRoom(recipient, room.id), false,
    'o destinatário NÃO deve ver a conversa antes da primeira mensagem')
})

test('a primeira mensagem revela a conversa para o destinatário', async () => {
  const room = track(await chatRepo.createRoomWithMembers({
    name: null,
    type: 'private',
    createdBy: creator,
    companyId,
    memberIds: [creator, recipient],
  }))

  assert.equal(await seesRoom(recipient, room.id), false)

  await chatRepo.createMessage({
    roomId: room.id,
    userId: creator,
    content: 'olá',
    companyId,
  })

  assert.equal(await seesRoom(recipient, room.id), true,
    'depois da primeira mensagem a conversa passa a existir para o destinatário')
  assert.equal(await seesRoom(creator, room.id), true)
})

test('apagar a última mensagem não esconde de novo a conversa já revelada', async () => {
  const room = track(await chatRepo.createRoomWithMembers({
    name: null,
    type: 'private',
    createdBy: creator,
    companyId,
    memberIds: [creator, recipient],
  }))

  const msg = await chatRepo.createMessage({
    roomId: room.id,
    userId: creator,
    content: 'mensagem que será apagada',
    companyId,
  })
  await pool.query(`UPDATE chat_messages SET is_deleted = TRUE WHERE id = $1`, [msg.id])

  assert.equal(await seesRoom(recipient, room.id), true,
    'a conversa continua no sidebar do destinatário — ele já sabe que ela existe')
})

test('grupo aparece para os membros desde a criação, mesmo sem mensagens', async () => {
  const room = track(await chatRepo.createRoomWithMembers({
    name: 'Grupo de teste',
    type: 'group',
    createdBy: creator,
    companyId,
    memberIds: [creator, recipient],
  }))

  assert.equal(await seesRoom(recipient, room.id), true,
    'entrar num canal já é a informação relevante — não depende de mensagem')
})
