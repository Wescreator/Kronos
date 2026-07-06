const { WebSocketServer } = require('ws')
const jwt = require('jsonwebtoken')
const jwtConfig = require('./jwt')
const pool = require('./database')

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

    // Manda pro recém-conectado quem já está online agora, e avisa todo
    // mundo que este usuário também acabou de ficar online. A presença
    // é determinada pela conexão real do socket, não por uma mensagem
    // que o client precisa lembrar de enviar (isso nunca era repassado
    // antes — o handleMessage só tratava 'ping').
    ws.send(JSON.stringify({ type: 'online_users', userIds: [...clients.keys()] }))
    broadcastPresence(ws.userId, 'online')

    ws.on('message', (raw) => {
      let msg
      try {
        msg = JSON.parse(raw)
      } catch {
        return // ignora mensagens malformadas
      }
      handleMessage(ws, msg)
    })

    ws.on('close', () => {
      clients.delete(ws.userId)
      broadcastPresence(ws.userId, 'offline')
    })
  })

  global.wsClients = clients
  global.wss = wss
}

// Avisa todos os conectados (exceto o próprio) que um usuário mudou de
// status. Simples e adequado para o tamanho de equipe do Kronos — se a
// base crescer muito, dá pra restringir a "contatos" (quem compartilha
// sala) em vez de broadcast geral.
function broadcastPresence(userId, status) {
  for (const [otherId, client] of clients) {
    if (otherId !== userId && client.readyState === 1) {
      client.send(JSON.stringify({ type: 'presence', status, userId }))
    }
  }
}

async function handleMessage(ws, msg) {
  if (msg.type === 'ping') {
    ws.send(JSON.stringify({ type: 'pong' }))
    return
  }

  if (msg.type === 'typing' && msg.roomId) {
    try {
      const { rows } = await pool.query(
        `SELECT user_id FROM chat_room_members WHERE room_id = $1 AND user_id != $2`,
        [msg.roomId, ws.userId]
      )
      for (const r of rows) {
        global.sendToUser(r.user_id, msg)
      }
    } catch (err) {
      console.error('[websocket] erro ao repassar typing:', err.message)
    }
    return
  }

  // 'presence' enviado pelo client é ignorado de propósito: a presença
  // real agora é 100% derivada da conexão/desconexão do próprio socket
  // (veja broadcastPresence acima), que é mais confiável.
}

// Utilitário para enviar mensagem a um usuário específico
global.sendToUser = function(userId, payload) {
  const client = clients.get(userId)
  if (client && client.readyState === 1) {
    client.send(JSON.stringify(payload))
  }
}

// Utilitário para broadcast a uma lista de usuários (sala de chat, etc.)
global.broadcastToRoom = function(roomMemberIds, payload) {
  for (const userId of roomMemberIds) {
    global.sendToUser(userId, payload)
  }
}