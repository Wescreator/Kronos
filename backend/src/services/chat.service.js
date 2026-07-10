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
  const room = await chatRepo.createRoom({ name, type, createdBy, companyId })

  const allMembers = [...new Set([createdBy, ...members])]
  for (const uid of allMembers) {
    // O criador entra sempre; demais membros precisam ser da mesma empresa
    if (uid !== createdBy) {
      const link = await companyRepo.findCompanyUser(companyId, uid)
      if (!link) continue
    }
    await chatRepo.addMember(room.id, uid)
  }
  return room
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