const repo = require('../repositories/notification.repository')
const { sendToUser } = require('../config/websocket')

// Empurra a notificação recém-criada pro usuário via WebSocket, se ele
// estiver conectado (mesma conexão compartilhada usada pelo chat).
const pushRealtime = (userId, notification) => {
  sendToUser(userId, { type: 'new_notification', notification })
}

// Cria sempre. Usar para eventos únicos: nova mensagem de chat, atribuição
// de tarefa, membro adicionado ao projeto. Cada chamada representa um
// evento novo e não deve ser deduplicada.
const notify = async ({ companyId, userId, type, title, body, link }) => {
  const notification = await repo.create({ companyId, userId, type, title, body, link })
  pushRealtime(userId, notification)
  return notification
}

// Cria só se ainda não existir notificação igual (mesmo user/type/link).
// Usar exclusivamente para o cron de vencidos, que roda diariamente sobre
// o mesmo item enquanto ele continuar em aberto.
//
// A unicidade é garantida pelo índice parcial no banco (ON CONFLICT DO NOTHING),
// não por um SELECT prévio: o check-then-insert anterior duplicaria as
// notificações assim que houvesse mais de uma instância rodando o cron.
const notifyIfNew = async ({ companyId, userId, type, title, body, link }) => {
  const notification = await repo.createIfNew({ companyId, userId, type, title, body, link })
  if (!notification) return null // já existia — nada a notificar
  pushRealtime(userId, notification)
  return notification
}

// Remove a notificação de vencido quando o item é resolvido.
const resolveEntity = (companyId, type, link) => repo.removeForEntity(companyId, type, link)

const getForUser  = (userId) => repo.findByUser(userId)
const markRead    = (id, userId) => repo.markRead(id, userId)
const markAllRead = (userId) => repo.markAllRead(userId)
const remove      = (id, userId) => repo.remove(id, userId)
const removeAllForUser = (userId) => repo.removeAllForUser(userId)

module.exports = {
  notify,
  notifyIfNew,
  resolveEntity,
  getForUser,
  markRead,
  markAllRead,
  remove,
  removeAllForUser,
}