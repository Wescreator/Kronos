const chatRepo = require('../repositories/chat.repository')
const AppError = require('../utils/AppError')
const companyRepo = require('../repositories/company.repository')
const userRepo = require('../repositories/user.repository')
const notificationService = require('./notification.service')
const { broadcastToRoom } = require('../config/websocket')

const getRooms = async (userId) => {
  return chatRepo.findRoomsByUser(userId)
}

const createRoom = async ({ name, type = 'private', members = [] }, createdBy, companyId) => {
  // Valida os membros ANTES de criar qualquer coisa: o criador entra sempre;
  // os demais precisam pertencer à mesma empresa.
  const requested = [...new Set(members)].filter(uid => uid !== createdBy)
  const validMembers = []
  for (const uid of requested) {
    const link = await companyRepo.findCompanyUser(companyId, uid)
    if (link) validMembers.push(uid)
  }

  // Conversa privada entre duas pessoas é uma IDENTIDADE, não um registro que
  // faça sentido duplicar: se A e B já conversam, reabrir a conversa existente
  // em vez de criar uma segunda sala (onde metade das mensagens se perderia).
  if (type === 'private' && validMembers.length === 1) {
    const existing = await chatRepo.findPrivateRoomBetween(companyId, createdBy, validMembers[0])
    if (existing) return existing
  }

  return chatRepo.createRoomWithMembers({
    name,
    type,
    createdBy,
    companyId,
    memberIds: [createdBy, ...validMembers],
  })
}

const deleteRoom = async (roomId, userId, userRole) => {
  const room = await chatRepo.findRoomByIdAndMember(roomId, userId)
  if (!room) throw new AppError(404, 'Sala não encontrada ou acesso negado')
  if (room.created_by !== userId && userRole !== 'admin') {
    throw new AppError(403, 'Apenas o criador pode excluir esta conversa')
  }
  await chatRepo.deleteRoom(roomId)
}

const getMessages = async (roomId, userId, limit, offset) => {
  const room = await chatRepo.findRoomByIdAndMember(roomId, userId)
  if (!room) throw new AppError(403, 'Sala não encontrada ou acesso negado')
  return chatRepo.findMessages(roomId, limit, offset)
}

const createMessage = async ({ roomId, userId, content }) => {
  const room = await chatRepo.findRoomByIdAndMember(roomId, userId)
  if (!room) throw new AppError(403, 'Sala não encontrada ou acesso negado')
  const message = await chatRepo.createMessage({ roomId, userId, content, companyId: room.company_id })
  const allMemberIds  = await chatRepo.findRoomMemberIds(roomId)
  const otherMemberIds = allMemberIds.filter(id => id !== userId)
  broadcastToRoom(otherMemberIds, { type: 'new_message', roomId, message })

  // Uma notificação por usuário, sempre criada (sem dedupe — cada mensagem
  // é um evento novo, diferente do caso de vencidos no cron financeiro).
  const sender = await userRepo.findById(userId)
  const preview = content && content.length > 80 ? `${content.slice(0, 80)}…` : content

  for (const memberId of otherMemberIds) {
    await notificationService.notify({
      companyId: room.company_id,
      userId:    memberId,
      type:      'chat_mention',
      title:     `Nova mensagem de ${sender?.name || 'usuário'}`,
      body:      preview || null,
      link:      `/app/chat/${roomId}`,
    })
  }

  return message
}

module.exports = { getRooms, createRoom, deleteRoom, getMessages, createMessage }