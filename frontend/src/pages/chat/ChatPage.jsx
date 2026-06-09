import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Send, Plus, MessageSquare, Hash, Lock,
  Search, ArrowLeft, Smile, CheckCheck,
  MoreHorizontal, Trash2, Users, X, Check,
  Circle
} from 'lucide-react'
import EmojiPicker from 'emoji-picker-react'
import { getRooms, getMessages, sendMessage, createRoom } from '../../services/chat.service'
import { getUsers }   from '../../services/team.service'
import useAuthStore   from '../../store/authStore'
import Avatar         from '../../components/ui/Avatar'
import Modal          from '../../components/ui/Modal'
import ConfirmDialog  from '../../components/ui/ConfirmDialog'
import Spinner        from '../../components/ui/Spinner'
import { toast }      from 'react-hot-toast'
import api            from '../../services/api'

// ── Serviço de exclusão (mínimo, usa estrutura existente) ─────────
const deleteRoom = (id) => api.delete(`/chat/rooms/${id}`)

// ── Utilitários ───────────────────────────────────────────────────

function formatMessageTime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function formatRoomTime(dateStr) {
  if (!dateStr) return ''
  const d    = new Date(dateStr)
  const now  = new Date()
  const diff = now - d
  if (diff < 60_000)     return 'agora'
  if (diff < 3_600_000)  return `${Math.floor(diff / 60_000)}min`
  if (diff < 86_400_000) return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function getRoomDisplayName(room, currentUserId) {
  if (room.type === 'group') return room.name || 'Grupo'
  return room.other_user_name || room.name || 'Conversa'
}

function getRoomAvatar(room) {
  if (room.type === 'group') return null
  return room.other_user_avatar || null
}

// ── Componente: Item da lista de conversas ────────────────────────
function RoomItem({ room, active, onClick, currentUserId, onDelete }) {
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef(null)
  const name      = getRoomDisplayName(room, currentUserId)
  const avatarSrc = getRoomAvatar(room)
  const isGroup   = room.type === 'group'

  // Fecha menu ao clicar fora
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false)
      }
    }
    if (showMenu) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showMenu])

  return (
    <div className="relative group/room">
      <button
        onClick={onClick}
        className="w-full text-left flex items-center gap-3 px-3 py-2.5 transition-all duration-150 rounded-xl mx-1"
        style={{
          width: 'calc(100% - 8px)',
          background: active
            ? 'rgba(124,92,252,0.14)'
            : 'transparent',
          border: active
            ? '1px solid rgba(124,92,252,0.20)'
            : '1px solid transparent',
        }}
        onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
        onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
      >
        {/* Avatar */}
        <div className="relative shrink-0">
          {isGroup ? (
            <div
              className="h-9 w-9 rounded-full flex items-center justify-center shrink-0"
              style={{
                background: 'rgba(124,92,252,0.12)',
                border: '1px solid rgba(124,92,252,0.20)',
              }}
            >
              <Hash size={14} style={{ color: '#A78BFA' }} />
            </div>
          ) : (
            <Avatar name={name} src={avatarSrc} size="sm" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-0.5">
            <span
              className="text-[13px] font-semibold truncate"
              style={{ color: active ? '#fff' : 'var(--text-primary)' }}
            >
              {name}
            </span>
            {room.last_message_at && (
              <span className="text-[10px] shrink-0 ml-2" style={{ color: 'var(--text-muted)' }}>
                {formatRoomTime(room.last_message_at)}
              </span>
            )}
          </div>
          <p className="text-xs truncate" style={{ color: 'var(--text-muted)', maxWidth: 160 }}>
            {room.last_message || (isGroup ? 'Grupo' : 'Conversa privada')}
          </p>
        </div>
      </button>

      {/* Botão de opções — aparece no hover */}
      <div
        ref={menuRef}
        className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover/room:opacity-100 transition-opacity duration-150"
        style={{ zIndex: 10 }}
      >
        <button
          onClick={(e) => { e.stopPropagation(); setShowMenu(v => !v) }}
          className="p-1.5 rounded-lg transition-all duration-150"
          style={{
            color: 'var(--text-muted)',
            background: showMenu ? 'rgba(255,255,255,0.08)' : 'rgba(8,16,36,0.80)',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#fff' }}
          onMouseLeave={e => { if (!showMenu) { e.currentTarget.style.background = 'rgba(8,16,36,0.80)'; e.currentTarget.style.color = 'var(--text-muted)' } }}
        >
          <MoreHorizontal size={13} />
        </button>

        {/* Dropdown menu */}
        {showMenu && (
          <div
            className="absolute right-0 top-full mt-1 py-1 rounded-xl overflow-hidden"
            style={{
              background: '#0D152B',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.50)',
              minWidth: 140,
              zIndex: 50,
            }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowMenu(false)
                onDelete(room)
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium transition-all duration-150"
              style={{ color: '#FB7185' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(251,113,133,0.08)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <Trash2 size={13} />
              {isGroup ? 'Excluir grupo' : 'Excluir conversa'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Componente: Balão de mensagem ─────────────────────────────────
function MessageBubble({ msg, isMe, showAvatar, prevIsMe }) {
  const time = formatMessageTime(msg.created_at)

  return (
    <div
      className={`flex gap-2.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
      style={{ marginTop: prevIsMe === isMe ? 2 : 14 }}
    >
      {/* Avatar — apenas primeira mensagem de um bloco */}
      <div className="w-7 shrink-0 flex items-end pb-0.5">
        {showAvatar && !isMe && (
          <Avatar name={msg.user_name} src={msg.avatar_url} size="sm" />
        )}
      </div>

      <div
        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
        style={{ maxWidth: '65%' }}
      >
        {/* Nome — apenas primeira mensagem do bloco */}
        {showAvatar && !isMe && (
          <span
            className="text-[11px] font-semibold mb-1 px-1"
            style={{ color: '#A78BFA' }}
          >
            {msg.user_name}
          </span>
        )}

        {/* Balão */}
        <div
          className="px-3.5 py-2 text-sm leading-relaxed"
          style={isMe ? {
            background:   'linear-gradient(135deg, #7C5CFC, #6347e0)',
            color:        '#fff',
            borderRadius: '16px 16px 4px 16px',
            boxShadow:    '0 2px 12px rgba(124,92,252,0.25)',
          } : {
            background:   'rgba(255,255,255,0.06)',
            color:        'var(--text-primary)',
            border:       '1px solid rgba(255,255,255,0.07)',
            borderRadius: '16px 16px 16px 4px',
          }}
        >
          {msg.content}
        </div>

        {/* Horário */}
        <div
          className="flex items-center gap-1 mt-1 px-1"
          style={{ color: 'var(--text-muted)' }}
        >
          <span className="text-[10px]">{time}</span>
          {isMe && <CheckCheck size={11} style={{ color: '#A78BFA' }} />}
        </div>
      </div>
    </div>
  )
}

// ── Componente: Indicador de digitação ────────────────────────────
function TypingIndicator({ names }) {
  const label = names.length === 1
    ? `${names[0]} está digitando`
    : `${names.join(', ')} estão digitando`

  return (
    <div
      className="flex items-center gap-2.5 px-4 py-2 mx-4 mb-1 rounded-xl"
      style={{
        background:  'rgba(255,255,255,0.03)',
        border:      '1px solid rgba(255,255,255,0.05)',
        width:       'fit-content',
        maxWidth:    280,
      }}
    >
      <div className="flex gap-1 items-center">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="h-1.5 w-1.5 rounded-full"
            style={{
              background: '#A78BFA',
              animation:  `typingBounce 1.2s ease-in-out ${i * 0.15}s infinite`,
            }}
          />
        ))}
      </div>
      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}...</span>
    </div>
  )
}

// ── Componente: Estado vazio da área de conversa ──────────────────
function EmptyConversation({ onNewChat }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      <div
        className="p-5 rounded-3xl mb-5"
        style={{
          background: 'rgba(124,92,252,0.05)',
          border:     '1px solid rgba(124,92,252,0.10)',
        }}
      >
        <MessageSquare size={36} style={{ color: 'rgba(124,92,252,0.45)' }} />
      </div>
      <h3 className="text-base font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
        Suas mensagens
      </h3>
      <p className="text-sm mb-6" style={{ color: 'var(--text-muted)', maxWidth: 220 }}>
        Envie mensagens privadas ou crie grupos com a sua equipe.
      </p>
      <button onClick={onNewChat} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Plus size={15} /> Nova conversa
      </button>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────
export default function ChatPage() {
  const { user, accessToken } = useAuthStore()
  const role = user?.role || 'member'

  // Dados
  const [rooms,          setRooms]          = useState([])
  const [activeRoom,     setActiveRoom]     = useState(null)
  const [messages,       setMessages]       = useState([])
  const [users,          setUsers]          = useState([])

  // Presença online real
  const [onlineUsers,    setOnlineUsers]    = useState(new Set())

  // Typing: map de userId → nome
  const [typingUsers,    setTypingUsers]    = useState({})

  // UI
  const [loadingRooms,   setLoadingRooms]   = useState(true)
  const [loadingMsgs,    setLoadingMsgs]    = useState(false)
  const [showSidebar,    setShowSidebar]    = useState(true)
  const [search,         setSearch]         = useState('')
  const [showNew,        setShowNew]        = useState(false)
  const [showEmoji,      setShowEmoji]      = useState(false)

  // Exclusão
  const [deleteTarget,   setDeleteTarget]   = useState(null)
  const [deleteLoading,  setDeleteLoading]  = useState(false)

  // Formulário nova conversa
  const [selectedUsers,  setSelectedUsers]  = useState([])
  const [groupName,      setGroupName]      = useState('')
  const [roomType,       setRoomType]       = useState('private')
  const [userSearch,     setUserSearch]     = useState('')

  // Input de mensagem
  const [content, setContent] = useState('')

  // Refs
  const messagesEnd     = useRef(null)
  const inputRef        = useRef(null)
  const emojiRef        = useRef(null)
  const wsRef           = useRef(null)
  const typingTimers    = useRef({})   // { userId: timeoutId }
  const sendTypingTimer = useRef(null) // debounce para envio de typing
  const activeRoomRef   = useRef(null) // ref para uso dentro do WS handler

  // Mantém ref atualizada com a sala ativa
  useEffect(() => { activeRoomRef.current = activeRoom }, [activeRoom])

  // ── WebSocket ──────────────────────────────────────────────────
  useEffect(() => {
    if (!accessToken) return

    const wsUrl = import.meta.env.PROD
      ? `wss://${new URL(import.meta.env.VITE_API_URL).host}/ws?token=${accessToken}`
      : `ws://localhost:3001/ws?token=${accessToken}`

    const ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      // Anuncia presença ao conectar
      ws.send(JSON.stringify({ type: 'presence', status: 'online', userId: user?.id }))
    }

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data)

        // Nova mensagem
        if (msg.type === 'new_message') {
          if (activeRoomRef.current?.id === msg.roomId) {
            setMessages(prev => {
              if (prev.some(m => m.id === msg.message.id)) return prev
              return [...prev, msg.message]
            })
          }
          setRooms(prev => prev.map(r =>
            r.id === msg.roomId
              ? { ...r, last_message: msg.message.content, last_message_at: msg.message.created_at }
              : r
          ))
          if (activeRoomRef.current?.id === msg.roomId) {
            setTimeout(() => messagesEnd.current?.scrollIntoView({ behavior: 'smooth' }), 30)
          }
        }

        // Typing: outro usuário digitando
        if (msg.type === 'typing' && msg.userId !== user?.id) {
          if (activeRoomRef.current?.id === msg.roomId) {
            setTypingUsers(prev => ({ ...prev, [msg.userId]: msg.userName || 'Alguém' }))
            // Limpa após 2.5s sem novo evento
            clearTimeout(typingTimers.current[msg.userId])
            typingTimers.current[msg.userId] = setTimeout(() => {
              setTypingUsers(prev => {
                const next = { ...prev }
                delete next[msg.userId]
                return next
              })
            }, 2500)
          }
        }

        // Presença: online/offline
        if (msg.type === 'presence') {
          setOnlineUsers(prev => {
            const next = new Set(prev)
            if (msg.status === 'online')  next.add(msg.userId)
            if (msg.status === 'offline') next.delete(msg.userId)
            return next
          })
        }

        // Confirmação de lista de usuários online (ao conectar)
        if (msg.type === 'online_users' && Array.isArray(msg.userIds)) {
          setOnlineUsers(new Set(msg.userIds))
        }

      } catch { /* ignora mensagens malformadas */ }
    }

    ws.onerror  = () => {}
    ws.onclose  = () => {
      // Limpa presença local ao desconectar
      setOnlineUsers(new Set())
    }

    wsRef.current = ws

    return () => {
      // Anuncia offline antes de fechar
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'presence', status: 'offline', userId: user?.id }))
      }
      ws.close()
      Object.values(typingTimers.current).forEach(clearTimeout)
      clearTimeout(sendTypingTimer.current)
    }
  }, [accessToken, user?.id])

  // ── Fecha emoji picker ao clicar fora ─────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target)) {
        setShowEmoji(false)
      }
    }
    if (showEmoji) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showEmoji])

  // ── Carrega salas ──────────────────────────────────────────────
  const loadRooms = useCallback(async () => {
    setLoadingRooms(true)
    try {
      const { data } = await getRooms()
      let all = data.rooms || []
      if (role === 'member') {
        all = all.filter(r => r.created_by === user?.id || r.type === 'private')
      }
      setRooms(all)
    } catch { /* silencioso */ }
    finally { setLoadingRooms(false) }
  }, [role, user?.id])

  useEffect(() => {
    loadRooms()
    getUsers({ limit: 200 }).then(r => setUsers(r.data.data || []))
  }, [loadRooms])

  // ── Abre uma conversa ─────────────────────────────────────────
  const openRoom = useCallback(async (room) => {
    setActiveRoom(room)
    setShowSidebar(false)
    setLoadingMsgs(true)
    setMessages([])
    setTypingUsers({})
    setShowEmoji(false)
    try {
      const { data } = await getMessages(room.id, { limit: 100 })
      setMessages(data.messages || [])
    } catch { toast.error('Erro ao carregar mensagens') }
    finally {
      setLoadingMsgs(false)
      setTimeout(() => messagesEnd.current?.scrollIntoView({ behavior: 'instant' }), 80)
    }
  }, [])

  // ── Enviar mensagem ───────────────────────────────────────────
  const handleSend = async (e) => {
    e?.preventDefault()
    const text = content.trim()
    if (!text || !activeRoom) return

    setContent('')
    setShowEmoji(false)
    inputRef.current?.focus()

    // Cancela typing ao enviar
    clearTimeout(sendTypingTimer.current)

    try {
      const { data } = await sendMessage(activeRoom.id, { content: text })
      setMessages(prev => {
        if (prev.some(m => m.id === data.message?.id)) return prev
        return data.message ? [...prev, data.message] : prev
      })
    } catch { toast.error('Erro ao enviar mensagem') }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // ── Envio de evento typing com debounce ───────────────────────
  const handleTyping = (e) => {
    setContent(e.target.value)
    // Auto-resize
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'

    // Dispara typing via WS com debounce de 400ms
    if (!activeRoom || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
    clearTimeout(sendTypingTimer.current)
    sendTypingTimer.current = setTimeout(() => {
      wsRef.current.send(JSON.stringify({
        type:     'typing',
        roomId:   activeRoom.id,
        userId:   user?.id,
        userName: user?.name,
      }))
    }, 400)
  }

  // ── Emoji picker ──────────────────────────────────────────────
  const handleEmojiClick = (emojiData) => {
    const emoji = emojiData.emoji
    const input = inputRef.current
    if (!input) { setContent(c => c + emoji); return }
    const start = input.selectionStart
    const end   = input.selectionEnd
    setContent(c => c.slice(0, start) + emoji + c.slice(end))
    setTimeout(() => {
      input.focus()
      input.setSelectionRange(start + emoji.length, start + emoji.length)
    }, 0)
  }

  // ── Criar nova conversa ───────────────────────────────────────
  const handleCreateRoom = async () => {
    if (selectedUsers.length === 0) return toast.error('Selecione ao menos um participante')
    if (roomType === 'group' && !groupName.trim()) return toast.error('Informe o nome do grupo')
    try {
      const { data } = await createRoom({
        name:    roomType === 'group' ? groupName.trim() : null,
        type:    roomType,
        members: selectedUsers,
      })
      await loadRooms()
      setShowNew(false)
      setSelectedUsers([])
      setGroupName('')
      setRoomType('private')
      setUserSearch('')
      openRoom(data.room)
    } catch { toast.error('Erro ao criar conversa') }
  }

  // ── Excluir conversa / grupo ──────────────────────────────────
  const handleDeleteRoom = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      await deleteRoom(deleteTarget.id)
      setRooms(prev => prev.filter(r => r.id !== deleteTarget.id))
      if (activeRoom?.id === deleteTarget.id) {
        setActiveRoom(null)
        setMessages([])
      }
      toast.success(deleteTarget.type === 'group' ? 'Grupo excluído' : 'Conversa excluída')
    } catch {
      toast.error('Erro ao excluir')
    } finally {
      setDeleteLoading(false)
      setDeleteTarget(null)
    }
  }

  // ── Filtros ───────────────────────────────────────────────────
  const filteredRooms = rooms.filter(r =>
    getRoomDisplayName(r, user?.id).toLowerCase().includes(search.toLowerCase())
  )
  const privateRooms = filteredRooms.filter(r => r.type === 'private')
  const groupRooms   = filteredRooms.filter(r => r.type === 'group')

  const availableTypes = role === 'member'
    ? [{ key: 'private', label: 'Privado', icon: Lock }]
    : [
        { key: 'private', label: 'Privado', icon: Lock },
        { key: 'group',   label: 'Grupo',   icon: Hash },
      ]

  const activeRoomName   = activeRoom ? getRoomDisplayName(activeRoom, user?.id) : ''
  const activeRoomAvatar = activeRoom ? getRoomAvatar(activeRoom) : null
  const activeIsGroup    = activeRoom?.type === 'group'

  // Usuários digitando na sala ativa
  const typingNames = Object.values(typingUsers)

  // Status do outro usuário na conversa ativa
  const otherUserId    = activeRoom?.other_user_id
  const isOtherOnline  = otherUserId ? onlineUsers.has(otherUserId) : false
  const isMeOnline     = onlineUsers.has(user?.id) // sempre true enquanto conectado
  const myOnlineStatus = wsRef.current?.readyState === WebSocket.OPEN

  // Usuários filtrados no modal
  const filteredUsers = users
    .filter(u => u.id !== user?.id)
    .filter(u => u.name.toLowerCase().includes(userSearch.toLowerCase()))

  return (
    <>
      {/* Keyframes globais */}
      <style>{`
        @keyframes typingBounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.5; }
          40%            { transform: translateY(-5px); opacity: 1; }
        }
        @keyframes fadeInMsg {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .msg-appear { animation: fadeInMsg 0.18s ease forwards; }

        /* Scrollbar refinada */
        .chat-scroll::-webkit-scrollbar { width: 4px; }
        .chat-scroll::-webkit-scrollbar-track { background: transparent; }
        .chat-scroll::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.08);
          border-radius: 4px;
        }
        .chat-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.14);
        }
      `}</style>

      <div
        className="fade-in flex overflow-hidden"
        style={{
          height:         'calc(100vh - 5rem)',
          background:     'rgba(8,12,28,0.72)',
          backdropFilter: 'blur(24px)',
          border:         '1px solid rgba(255,255,255,0.06)',
          borderRadius:   20,
          boxShadow:      '0 8px 40px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.04)',
          position:       'relative',
          overflow:       'hidden',
        }}
      >
        {/* Background textura/granulação sutil */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 60% 40% at 20% 0%, rgba(124,92,252,0.07) 0%, transparent 70%),
              radial-gradient(ellipse 40% 30% at 80% 100%, rgba(56,189,248,0.04) 0%, transparent 60%)
            `,
            zIndex: 0,
          }}
        />
        {/* Grain overlay */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E")`,
            zIndex: 0,
            opacity: 0.5,
          }}
        />

        {/* ════════════════════════════════════════════════════════
            SIDEBAR — Lista de conversas
        ════════════════════════════════════════════════════════ */}
        <div
          className={`flex flex-col shrink-0 transition-all duration-200 ${
            showSidebar ? 'w-[280px]' : 'w-0 md:w-[280px]'
          } overflow-hidden`}
          style={{
            borderRight: '1px solid rgba(255,255,255,0.05)',
            background:  'rgba(6,10,22,0.50)',
            position:    'relative',
            zIndex:      1,
          }}
        >
          {/* Header */}
          <div
            className="px-3 pt-4 pb-3 shrink-0"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
          >
            <div className="flex items-center justify-between mb-3 px-1">
              <h2 className="text-[13px] font-bold tracking-wide" style={{ color: 'var(--text-primary)' }}>
                Mensagens
              </h2>
              <button
                onClick={() => setShowNew(true)}
                className="p-1.5 rounded-lg transition-all duration-150"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(124,92,252,0.12)'; e.currentTarget.style.color = '#A78BFA' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
                title="Nova conversa"
              >
                <Plus size={16} />
              </button>
            </div>

            {/* Campo de busca */}
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <Search size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <input
                className="bg-transparent text-xs outline-none flex-1"
                style={{ color: 'var(--text-primary)' }}
                placeholder="Pesquisar..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Lista de conversas */}
          <div className="flex-1 overflow-y-auto py-2 chat-scroll">
            {loadingRooms ? (
              <div className="flex justify-center py-10"><Spinner /></div>
            ) : filteredRooms.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full pb-10 px-6 text-center">
                <MessageSquare size={24} style={{ color: 'rgba(255,255,255,0.10)', marginBottom: 8 }} />
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {search ? 'Nenhuma conversa encontrada' : 'Nenhuma conversa ainda'}
                </p>
              </div>
            ) : (
              <div className="px-1">
                {/* Diretas */}
                {privateRooms.length > 0 && (
                  <>
                    <p
                      className="px-3 pt-2 pb-1.5 text-[10px] font-bold uppercase tracking-[0.14em]"
                      style={{ color: 'rgba(255,255,255,0.25)' }}
                    >
                      Diretas
                    </p>
                    {privateRooms.map(room => (
                      <RoomItem
                        key={room.id}
                        room={room}
                        active={activeRoom?.id === room.id}
                        onClick={() => openRoom(room)}
                        currentUserId={user?.id}
                        onDelete={(r) => setDeleteTarget(r)}
                      />
                    ))}
                  </>
                )}

                {/* Grupos */}
                {groupRooms.length > 0 && (
                  <>
                    <p
                      className="px-3 pt-3 pb-1.5 text-[10px] font-bold uppercase tracking-[0.14em]"
                      style={{ color: 'rgba(255,255,255,0.25)' }}
                    >
                      Grupos
                    </p>
                    {groupRooms.map(room => (
                      <RoomItem
                        key={room.id}
                        room={room}
                        active={activeRoom?.id === room.id}
                        onClick={() => openRoom(room)}
                        currentUserId={user?.id}
                        onDelete={(r) => setDeleteTarget(r)}
                      />
                    ))}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Perfil do usuário logado */}
          <div
            className="flex items-center gap-2.5 px-3 py-3 shrink-0"
            style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
          >
            <div className="relative shrink-0">
              <Avatar name={user?.name || ''} src={user?.avatar_url} size="sm" />
              <div
                className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full"
                style={{
                  background: myOnlineStatus ? '#34D399' : 'rgba(255,255,255,0.25)',
                  border: '2px solid #06080f',
                  transition: 'background 0.4s',
                }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                {user?.name}
              </p>
              <p
                className="text-[10px] font-medium"
                style={{ color: myOnlineStatus ? '#34D399' : 'var(--text-muted)' }}
              >
                {myOnlineStatus ? 'Online' : 'Conectando...'}
              </p>
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════
            ÁREA PRINCIPAL DE CONVERSA
        ════════════════════════════════════════════════════════ */}
        <div className="flex-1 flex flex-col min-w-0" style={{ position: 'relative', zIndex: 1 }}>
          {!activeRoom ? (
            <EmptyConversation onNewChat={() => setShowNew(true)} />
          ) : (
            <>
              {/* Cabeçalho da conversa */}
              <div
                className="flex items-center gap-3 px-5 py-3 shrink-0"
                style={{
                  borderBottom:   '1px solid rgba(255,255,255,0.05)',
                  background:     'rgba(6,10,22,0.40)',
                  backdropFilter: 'blur(12px)',
                }}
              >
                {/* Voltar — mobile */}
                <button
                  onClick={() => setShowSidebar(true)}
                  className="md:hidden p-1.5 rounded-lg mr-1 transition-all duration-150"
                  style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                >
                  <ArrowLeft size={18} />
                </button>

                {/* Avatar */}
                <div className="relative shrink-0">
                  {activeIsGroup ? (
                    <div
                      className="h-8 w-8 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(124,92,252,0.12)', border: '1px solid rgba(124,92,252,0.20)' }}
                    >
                      <Hash size={14} style={{ color: '#A78BFA' }} />
                    </div>
                  ) : (
                    <div className="relative">
                      <Avatar name={activeRoomName} src={activeRoomAvatar} size="sm" />
                      {/* Indicador de presença real */}
                      <div
                        className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full"
                        style={{
                          background: isOtherOnline ? '#34D399' : 'rgba(255,255,255,0.20)',
                          border: '2px solid #06080f',
                          transition: 'background 0.4s',
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Nome e status */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                    {activeRoomName}
                  </p>
                  <p
                    className="text-[11px] font-medium"
                    style={{
                      color: activeIsGroup
                        ? 'var(--text-muted)'
                        : (isOtherOnline ? '#34D399' : 'var(--text-muted)'),
                      transition: 'color 0.4s',
                    }}
                  >
                    {activeIsGroup ? 'Grupo' : (isOtherOnline ? 'Online' : 'Offline')}
                  </p>
                </div>
              </div>

              {/* Área de mensagens */}
              <div
                className="flex-1 overflow-y-auto px-4 py-4 chat-scroll"
                style={{
                  background: 'transparent',
                  // Centraliza levemente com max-width interno
                }}
              >
                <div style={{ maxWidth: 720, margin: '0 auto' }}>
                  {loadingMsgs ? (
                    <div className="flex justify-center py-10"><Spinner /></div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center" style={{ minHeight: 200 }}>
                      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                        Nenhuma mensagem ainda. Diga olá! 👋
                      </p>
                    </div>
                  ) : (
                    messages.map((msg, i) => {
                      const isMe      = msg.user_id === user?.id
                      const prevMsg   = i > 0 ? messages[i - 1] : null
                      const prevIsMe  = prevMsg?.user_id === user?.id
                      const showAvatar = !isMe && (prevMsg?.user_id !== msg.user_id)
                      return (
                        <div key={msg.id} className="msg-appear">
                          <MessageBubble
                            msg={msg}
                            isMe={isMe}
                            showAvatar={showAvatar}
                            prevIsMe={prevIsMe}
                          />
                        </div>
                      )
                    })
                  )}

                  {/* Indicador de digitação */}
                  {typingNames.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <TypingIndicator names={typingNames} />
                    </div>
                  )}

                  <div ref={messagesEnd} />
                </div>
              </div>

              {/* Input de mensagem */}
              <div
                className="px-4 pb-3 pt-2 shrink-0 relative"
                style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
              >
                <div style={{ maxWidth: 720, margin: '0 auto' }}>
                  {/* Emoji picker */}
                  {showEmoji && (
                    <div
                      ref={emojiRef}
                      className="absolute z-50"
                      style={{ bottom: '100%', left: 16, marginBottom: 8 }}
                    >
                      <EmojiPicker
                        onEmojiClick={handleEmojiClick}
                        theme="dark"
                        width={300}
                        height={360}
                        searchPlaceholder="Pesquisar emoji..."
                        previewConfig={{ showPreview: false }}
                        skinTonesDisabled
                        style={{
                          '--epr-bg-color':             '#0A1020',
                          '--epr-category-label-bg-color': '#060A16',
                          '--epr-search-background-color': 'rgba(255,255,255,0.05)',
                          '--epr-hover-bg-color':       'rgba(124,92,252,0.10)',
                          '--epr-text-color':           'rgba(255,255,255,0.65)',
                          '--epr-border-color':         'rgba(255,255,255,0.05)',
                          borderRadius: '14px',
                          border: '1px solid rgba(255,255,255,0.07)',
                          boxShadow: '0 16px 40px rgba(0,0,0,0.55)',
                        }}
                      />
                    </div>
                  )}

                  <div className="flex items-end gap-2">
                    {/* Botão emoji */}
                    <button
                      type="button"
                      onClick={() => setShowEmoji(v => !v)}
                      className="p-2 rounded-xl transition-all duration-150 shrink-0 mb-0.5"
                      style={{
                        color:      showEmoji ? '#A78BFA' : 'var(--text-muted)',
                        background: showEmoji ? 'rgba(124,92,252,0.10)' : 'transparent',
                      }}
                      onMouseEnter={e => { if (!showEmoji) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#A78BFA' } }}
                      onMouseLeave={e => { if (!showEmoji) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' } }}
                      title="Emojis"
                    >
                      <Smile size={18} />
                    </button>

                    {/* Campo de texto */}
                    <div
                      className="flex-1 flex items-end rounded-2xl px-4 py-2.5"
                      style={{
                        background:  'rgba(255,255,255,0.05)',
                        border:      '1px solid rgba(255,255,255,0.07)',
                        transition:  'border-color 0.2s, box-shadow 0.2s',
                      }}
                      onFocusCapture={e => {
                        e.currentTarget.style.borderColor = 'rgba(124,92,252,0.35)'
                        e.currentTarget.style.boxShadow   = '0 0 0 3px rgba(124,92,252,0.07)'
                      }}
                      onBlurCapture={e => {
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'
                        e.currentTarget.style.boxShadow   = 'none'
                      }}
                    >
                      <textarea
                        ref={inputRef}
                        className="flex-1 bg-transparent outline-none resize-none text-sm leading-relaxed"
                        style={{ color: 'var(--text-primary)', maxHeight: 120, minHeight: 24 }}
                        placeholder={`Mensagem para ${activeRoomName}...`}
                        value={content}
                        rows={1}
                        onChange={handleTyping}
                        onKeyDown={handleKeyDown}
                      />
                    </div>

                    {/* Botão enviar */}
                    <button
                      type="button"
                      onClick={handleSend}
                      disabled={!content.trim()}
                      className="p-2 rounded-xl transition-all duration-150 shrink-0 mb-0.5"
                      style={content.trim() ? {
                        background: 'linear-gradient(135deg, #7C5CFC, #6347e0)',
                        color:      '#fff',
                        boxShadow:  '0 2px 12px rgba(124,92,252,0.28)',
                      } : {
                        background: 'rgba(255,255,255,0.04)',
                        color:      'rgba(255,255,255,0.20)',
                        cursor:     'not-allowed',
                      }}
                    >
                      <Send size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════
          MODAL — Nova conversa (modernizado)
      ════════════════════════════════════════════════════════ */}
      <Modal
        open={showNew}
        onClose={() => {
          setShowNew(false)
          setSelectedUsers([])
          setGroupName('')
          setRoomType('private')
          setUserSearch('')
        }}
        title="Nova conversa"
        size="md"
      >
        <div className="space-y-5">
          {/* Tipo de conversa */}
          <div>
            <label className="label">Tipo de conversa</label>
            <div className="flex gap-2 mt-1.5">
              {availableTypes.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setRoomType(key)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150"
                  style={roomType === key ? {
                    background: 'rgba(124,92,252,0.16)',
                    color:      '#A78BFA',
                    border:     '1px solid rgba(124,92,252,0.28)',
                  } : {
                    background: 'rgba(255,255,255,0.03)',
                    color:      'var(--text-muted)',
                    border:     '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <Icon size={13} /> {label}
                </button>
              ))}
            </div>
          </div>

          {/* Nome do grupo */}
          {roomType === 'group' && (
            <div>
              <label className="label">Nome do grupo *</label>
              <input
                className="input"
                placeholder="Ex: Equipe Comercial"
                value={groupName}
                onChange={e => setGroupName(e.target.value)}
              />
            </div>
          )}

          {/* Busca de participantes */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="label" style={{ margin: 0 }}>
                Participantes
              </label>
              {selectedUsers.length > 0 && (
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                  style={{ background: 'rgba(124,92,252,0.12)', color: '#A78BFA' }}
                >
                  {selectedUsers.length} selecionado{selectedUsers.length > 1 ? 's' : ''}
                </span>
              )}
            </div>

            {/* Busca */}
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl mb-3"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <Search size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <input
                className="bg-transparent text-xs outline-none flex-1"
                style={{ color: 'var(--text-primary)' }}
                placeholder="Buscar pessoa..."
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
              />
              {userSearch && (
                <button onClick={() => setUserSearch('')} style={{ color: 'var(--text-muted)' }}>
                  <X size={11} />
                </button>
              )}
            </div>

            {/* Lista de usuários */}
            <div
              className="space-y-1 max-h-48 overflow-y-auto chat-scroll pr-1"
              style={{ marginRight: -4 }}
            >
              {filteredUsers.length === 0 ? (
                <p className="text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>
                  Nenhum usuário encontrado
                </p>
              ) : (
                filteredUsers.map(u => {
                  const selected = selectedUsers.includes(u.id)
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => setSelectedUsers(s =>
                        s.includes(u.id) ? s.filter(x => x !== u.id) : [...s, u.id]
                      )}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150"
                      style={selected ? {
                        background: 'rgba(124,92,252,0.12)',
                        border:     '1px solid rgba(124,92,252,0.22)',
                      } : {
                        background: 'transparent',
                        border:     '1px solid transparent',
                      }}
                      onMouseEnter={e => { if (!selected) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                      onMouseLeave={e => { if (!selected) e.currentTarget.style.background = 'transparent' }}
                    >
                      <Avatar name={u.name} src={u.avatar_url} size="sm" />
                      <span
                        className="flex-1 text-left truncate"
                        style={{ color: selected ? '#A78BFA' : 'var(--text-primary)' }}
                      >
                        {u.name}
                      </span>
                      <div
                        className="h-4 w-4 rounded-full flex items-center justify-center shrink-0 transition-all duration-150"
                        style={selected ? {
                          background: '#7C5CFC',
                          border:     '1px solid #7C5CFC',
                        } : {
                          border: '1px solid rgba(255,255,255,0.15)',
                        }}
                      >
                        {selected && <Check size={9} color="#fff" strokeWidth={3} />}
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </div>

          {/* Ações */}
          <div
            className="flex justify-end gap-3 pt-2"
            style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
          >
            <button
              onClick={() => {
                setShowNew(false)
                setSelectedUsers([])
                setGroupName('')
                setRoomType('private')
                setUserSearch('')
              }}
              className="btn-secondary"
            >
              Cancelar
            </button>
            <button
              onClick={handleCreateRoom}
              disabled={selectedUsers.length === 0}
              className="btn-primary"
            >
              Iniciar conversa
            </button>
          </div>
        </div>
      </Modal>

      {/* ════════════════════════════════════════════════════════
          CONFIRM DIALOG — Exclusão
      ════════════════════════════════════════════════════════ */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteRoom}
        title={deleteTarget?.type === 'group' ? 'Excluir grupo' : 'Excluir conversa'}
        message={
          deleteTarget?.type === 'group'
            ? `Tem certeza que deseja excluir o grupo "${getRoomDisplayName(deleteTarget, user?.id)}"? Esta ação não pode ser desfeita.`
            : `Tem certeza que deseja excluir esta conversa? O histórico de mensagens será perdido.`
        }
        danger
      />
    </>
  )
}