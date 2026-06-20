const { WebSocketServer } = require('ws')
const jwt = require('jsonwebtoken')
const jwtConfig = require('./jwt')

const clients = new Map()

module.exports = function initWebSocket(server) {
  const wss = new WebSocketServer({ server, path: '/ws' })

  wss.on('connection', (ws, req) => {
    const token = new URL(req.url, 'http://localhost').searchParams.get('token')

    try {
      const decoded = jwt.verify(token, jwtConfig.secret)
      ws.userId = decoded.user_id
      clients.set(decoded.user_id, ws)
      console.log(`WS conectado: ${decoded.user_id}`)
    } catch {
      ws.close(1008, 'Token inválido')
      return
    }

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw)
        handleMessage(ws, msg)
      } catch { /* ignora mensagens malformadas */ }
    })

    ws.on('close', () => {
      clients.delete(ws.userId)
    })
  })

  global.wsClients = clients
  global.wss = wss
}

function handleMessage(ws, msg) {
  if (msg.type === 'ping') {
    ws.send(JSON.stringify({ type: 'pong' }))
  }
}

// Utilitário para enviar mensagem a um usuário específico
global.sendToUser = function(userId, payload) {
  const client = clients.get(userId)
  if (client && client.readyState === 1) {
    client.send(JSON.stringify(payload))
  }
}

// Utilitário para broadcast em uma sala de chat
global.broadcastToRoom = function(roomMemberIds, payload) {
  for (const userId of roomMemberIds) {
    global.sendToUser(userId, payload)
  }
}