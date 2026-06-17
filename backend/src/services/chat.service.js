const chatRepo = require('../repositories/chat.repository')

const getRooms = async (userId) => {
  return chatRepo.findRoomsByUser(userId)
}

const createRoom = async ({ name, type = 'private', members = [] }, createdBy) => {
  const room = await chatRepo.createRoom({ name, type, createdBy })
  const allMembers = [...new Set([createdBy, ...members])]
  for (const uid of allMembers) {
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

const getMessages = async (roomId, limit, offset) => {
  return chatRepo.findMessages(roomId, limit, offset)
}

const createMessage = async ({ roomId, userId, content }) => {
  const message = await chatRepo.createMessage({ roomId, userId, content })
  const allMemberIds  = await chatRepo.findRoomMemberIds(roomId)
  const otherMemberIds = allMemberIds.filter(id => id !== userId)
  global.broadcastToRoom(otherMemberIds, { type: 'new_message', roomId, message })
  return message
}

module.exports = { getRooms, createRoom, deleteRoom, getMessages, createMessage }