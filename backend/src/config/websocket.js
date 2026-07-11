const { WebSocketServer } = require('ws')
const jwt = require('jsonwebtoken')
const jwtConfig = require('./jwt')
const pool = require('./database')

// userId -> Set<ws>. Um usuário pode ter várias conexões simultâneas
// (abas/dispositivos); a entrada só some quando a ÚLTIMA fecha. Antes o
// mapa era userId -> ws único: a segunda aba sobrescrevia a primeira e o
// close da aba antiga apagava a conexão nova — o usuário ficava "offline"
// e parava de receber mensagens mesmo com uma aba aberta.
const clients = new Map()

// Escopos internos aceitos no WS. O portal do cliente (scope 'client') usa
// apenas REST (/api/posts); chat e presença são internos. Sem esta checagem
// um token de portal abriria conexão WS e apareceria na presença da empresa.
const WS_ALLOWED_SCOPES = new Set(['company', 'global'])

// Teto de conexões simultâneas por usuário (abas/dispositivos). Impede que
// um cliente abra sockets sem limite e esgote memória do processo.
const MAX_CONNECTIONS_PER_USER = parseInt(process.env.WS_MAX_CONN_PER_USER) || 10

// Rate limit de mensagens recebidas por socket (anti-flood): máx. de
// mensagens por janela; ao exceder, o socket é encerrado.
const WS_MSG_MAX = parseInt(process.env.WS_MSG_MAX_PER_WINDOW) || 30
const WS_MSG_WINDOW_MS = parseInt(process.env.WS_MSG_WINDOW_MS) || 10000

function initWebSocket(server) {
  const wss = new WebSocketServer({ server, path: '/ws' })

  wss.on('connection', (ws, req) => {
    const token = new URL(req.url, 'http://localhost').searchParams.get('token')

    try {
      const decoded = jwt.verify(token, jwtConfig.secret)
      // Rejeita escopos não-internos (ex.: portal do cliente).
      if (!WS_ALLOWED_SCOPES.has(decoded.scope)) {
        ws.close(1008, 'Escopo não autorizado')
        return
      }
      ws.userId = decoded.user_id
      // Empresa do token: presença e broadcasts são isolados por tenant.
      // Usuários globais (developer, sem company_id) ficam agrupados sob
      // null e só enxergam uns aos outros.
      ws.companyId = decoded.company_id || null
    } catch {
      ws.close(1008, 'Token inválido')
      return
    }

    let sockets = clients.get(ws.userId)
    const firstConnection = !sockets
    if (firstConnection) {
      sockets = new Set()
      clients.set(ws.userId, sockets)
      console.log(`WS conectado: ${ws.userId}`)
    }
    // Barra novas conexões acima do teto por usuário.
    if (sockets.size >= MAX_CONNECTIONS_PER_USER) {
      ws.close(1013, 'Limite de conexões atingido')
      return
    }
    sockets.add(ws)

    // Estado do rate limit de mensagens deste socket.
    ws.msgCount = 0
    ws.msgWindowStart = Date.now()

    // Manda pro recém-conectado quem DA EMPRESA DELE está online, e avisa
    // só os colegas de empresa que ele entrou (apenas na primeira conexão
    // — abas extras não repetem o aviso). A presença é determinada pela
    // conexão real do socket, não por uma mensagem do client.
    ws.send(JSON.stringify({ type: 'online_users', userIds: onlineUserIdsFor(ws.companyId) }))
    if (firstConnection) broadcastPresence(ws.userId, ws.companyId, 'online')

    ws.on('message', (raw) => {
      // Rate limit por socket: janela deslizante simples. Ao estourar,
      // encerra a conexão (flood proposital ou client em loop).
      const now = Date.now()
      if (now - ws.msgWindowStart > WS_MSG_WINDOW_MS) {
        ws.msgWindowStart = now
        ws.msgCount = 0
      }
      ws.msgCount += 1
      if (ws.msgCount > WS_MSG_MAX) {
        ws.close(1013, 'Muitas mensagens')
        return
      }

      let msg
      try {
        msg = JSON.parse(raw)
      } catch {
        return // ignora mensagens malformadas
      }
      handleMessage(ws, msg)
    })

    ws.on('close', () => {
      const set = clients.get(ws.userId)
      if (!set) return
      set.delete(ws)
      // Só marca offline quando a última conexão do usuário fechar.
      if (set.size === 0) {
        clients.delete(ws.userId)
        broadcastPresence(ws.userId, ws.companyId, 'offline')
      }
    })
  })

  return wss
}

// Usuários online da mesma empresa (qualquer socket ativo conta).
function onlineUserIdsFor(companyId) {
  const ids = []
  for (const [userId, sockets] of clients) {
    for (const s of sockets) {
      if (s.companyId === companyId) {
        ids.push(userId)
        break
      }
    }
  }
  return ids
}

// Avisa os conectados DA MESMA EMPRESA (exceto o próprio) que um usuário
// mudou de status. Num SaaS multi-tenant, presença nunca cruza empresas.
function broadcastPresence(userId, companyId, status) {
  const payload = JSON.stringify({ type: 'presence', status, userId })
  for (const [otherId, sockets] of clients) {
    if (otherId === userId) continue
    for (const s of sockets) {
      if (s.companyId === companyId && s.readyState === 1) {
        s.send(payload)
      }
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
        `SELECT user_id FROM chat_room_members WHERE room_id = $1`,
        [msg.roomId]
      )
      // Só membros da sala podem emitir typing — sem isso, qualquer
      // autenticado poderia spammar salas alheias e sondar membership.
      if (!rows.some((r) => r.user_id === ws.userId)) return

      // Reconstrói o payload em vez de repassar o msg cru: o userId vem
      // do socket autenticado (impede se passar por outro usuário) e
      // campos extras injetados pelo client são descartados.
      const payload = {
        type: 'typing',
        roomId: msg.roomId,
        userId: ws.userId,
        userName: msg.userName,
      }
      for (const r of rows) {
        if (r.user_id !== ws.userId) sendToUser(r.user_id, payload)
      }
    } catch (err) {
      console.error('[websocket] erro ao repassar typing:', err.message)
    }
    return
  }

  // 'presence' enviado pelo client é ignorado de propósito: a presença
  // real é 100% derivada da conexão/desconexão do próprio socket.
}

// Envia mensagem a um usuário específico (todas as abas). Seguro de
// chamar antes de initWebSocket (o mapa apenas estará vazio) — por isso
// os services podem importar direto, sem checar se o WS já subiu.
function sendToUser(userId, payload) {
  const sockets = clients.get(userId)
  if (!sockets) return
  const data = JSON.stringify(payload)
  for (const s of sockets) {
    if (s.readyState === 1) s.send(data)
  }
}

// Broadcast a uma lista de usuários (sala de chat, etc.)
function broadcastToRoom(roomMemberIds, payload) {
  for (const userId of roomMemberIds) {
    sendToUser(userId, payload)
  }
}

// Antes essas funções viviam em global.sendToUser/global.broadcastToRoom —
// exports explícitos deixam a dependência visível para quem importa.
module.exports = initWebSocket
module.exports.sendToUser = sendToUser
module.exports.broadcastToRoom = broadcastToRoom
