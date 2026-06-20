const chatRepo = require('../repositories/chat.repository')
const companyRepo = require('../repositories/company.repository')

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
  if (!room) throw { status: 404, message: 'Sala não encontrada ou acesso negado' }
  if (room.created_by !== userId && userRole !== 'admin') {
    throw { status: 403, message: 'Apenas o criador pode excluir esta conversa' }
  }
  await chatRepo.deleteRoom(roomId)
}

const getMessages = async (roomId, userId, limit, offset) => {
  const room = await chatRepo.findRoomByIdAndMember(roomId, userId)
  if (!room) throw { status: 403, message: 'Sala não encontrada ou acesso negado' }
  return chatRepo.findMessages(roomId, limit, offset)
}

const createMessage = async ({ roomId, userId, content }) => {
  const room = await chatRepo.findRoomByIdAndMember(roomId, userId)
  if (!room) throw { status: 403, message: 'Sala não encontrada ou acesso negado' }
  const message = await chatRepo.createMessage({ roomId, userId, content })
  const allMemberIds  = await chatRepo.findRoomMemberIds(roomId)
  const otherMemberIds = allMemberIds.filter(id => id !== userId)
  global.broadcastToRoom(otherMemberIds, { type: 'new_message', roomId, message })
  return message
}

module.exports = { getRooms, createRoom, deleteRoom, getMessages, createMessage }