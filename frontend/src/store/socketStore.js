import { create } from 'zustand'
import useAuthStore from './authStore'

/*
 * Conexão WebSocket única e compartilhada da aplicação.
 *
 * Por que isso existe: o backend mantém apenas UMA conexão ativa por
 * usuário (`clients.set(userId, ws)` sobrescreve qualquer conexão
 * anterior do mesmo usuário). Se cada componente (Topbar, ChatPage)
 * abrisse sua própria conexão, a mais recente substituiria a anterior
 * no backend e o componente mais antigo pararia de receber mensagens
 * silenciosamente. Este store garante uma única conexão viva, e
 * qualquer componente pode assinar mensagens via subscribe().
 */

let socket = null
let connectedToken = null
let reconnectTimer = null
const listeners = new Set()

const buildWsUrl = (token) =>
  import.meta.env.PROD
    ? `wss://${new URL(import.meta.env.VITE_API_URL).host}/ws?token=${token}`
    : `ws://localhost:3001/ws?token=${token}`

function openSocket(token) {
  connectedToken = token
  socket = new WebSocket(buildWsUrl(token))

  socket.onopen = () => {
    useSocketStore.getState()._setConnected(true)
    // Presença agora é detectada automaticamente pelo backend a partir da
    // própria conexão/desconexão do socket — não precisa mais ser enviada
    // manualmente aqui (o handleMessage do backend nunca repassava esse
    // tipo de mensagem para os outros usuários).
  }

  socket.onmessage = (e) => {
    let msg
    try {
      msg = JSON.parse(e.data)
    } catch {
      return
    }
    listeners.forEach((fn) => fn(msg))
  }

  socket.onclose = () => {
    useSocketStore.getState()._setConnected(false)
    clearTimeout(reconnectTimer)
    // Só tenta reconectar se a queda não foi por um disconnect()
    // explícito (ex: logout) — disconnect() zera connectedToken antes.
    if (connectedToken) {
      reconnectTimer = setTimeout(() => {
        const token = useAuthStore.getState().accessToken
        if (token) openSocket(token)
      }, 3000)
    }
  }
}

const useSocketStore = create((set) => ({
  connected: false,
  _setConnected: (v) => set({ connected: v }),

  // Idempotente — pode ser chamado por vários componentes (Topbar,
  // ChatPage) sem criar conexões duplicadas.
  ensureConnected: () => {
    const token = useAuthStore.getState().accessToken
    if (!token) return
    if (
      socket &&
      connectedToken === token &&
      (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)
    ) {
      return
    }
    if (socket) socket.close()
    openSocket(token)
  },

  // Envia payload bruto (usado para 'typing', 'presence' etc.)
  send: (payload) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(payload))
    }
  },

  // Registra um listener de mensagens recebidas; retorna função de cleanup
  subscribe: (fn) => {
    listeners.add(fn)
    return () => listeners.delete(fn)
  },

  // Fecha a conexão de propósito (ex: logout) e não tenta reconectar
  disconnect: () => {
    clearTimeout(reconnectTimer)
    connectedToken = null
    if (socket) socket.close()
    socket = null
    set({ connected: false })
  },
}))

export default useSocketStore