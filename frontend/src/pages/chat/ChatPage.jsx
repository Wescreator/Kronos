import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Send, Plus, MessageSquare, Hash, Lock,
  Search, Users, ArrowLeft, Smile, Check, CheckCheck
} from 'lucide-react'
import EmojiPicker from 'emoji-picker-react'
import { getRooms, getMessages, sendMessage, createRoom } from '../../services/chat.service'
import { getUsers }   from '../../services/team.service'
import useAuthStore   from '../../store/authStore'
import Avatar         from '../../components/ui/Avatar'
import Modal          from '../../components/ui/Modal'
import Spinner        from '../../components/ui/Spinner'
import { formatDateTime } from '../../utils/format'
import { toast }      from 'react-hot-toast'

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
  if (diff < 60_000)        return 'agora'
  if (diff < 3_600_000)     return `${Math.floor(diff / 60_000)}min`
  if (diff < 86_400_000)    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

// Nome correto da sala: usuário real em privadas, nome do grupo em grupos
function getRoomDisplayName(room, currentUserId) {
  if (room.type === 'group') {
    return room.name || 'Grupo'
  }
  // Conversa privada — exibe o nome do outro participante
  return room.other_user_name || room.name || 'Conversa'
}

function getRoomAvatar(room) {
  if (room.type === 'group') return null
  return room.other_user_avatar || null
}

// ── Componente: Item da lista de conversas ────────────────────────
function RoomItem({ room, active, onClick, currentUserId }) {
  const name      = getRoomDisplayName(room, currentUserId)
  const avatarSrc = getRoomAvatar(room)
  const isGroup   = room.type === 'group'

  return (
    <button
      onClick={onClick}
      className="w-full text-left flex items-center gap-3 px-4 py-3 transition-all duration-150 relative"
      style={{
        background:  active ? 'rgba(124,92,252,0.12)' : 'transparent',
        borderLeft:  active ? '3px solid #7C5CFC' : '3px solid transparent',
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        {isGroup ? (
          <div
            className="h-10 w-10 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(124,92,252,0.15)', border: '1px solid rgba(124,92,252,0.25)' }}
          >
            <Hash size={16} style={{ color: '#A78BFA' }} />
          </div>
        ) : (
          <Avatar name={name} src={avatarSrc} size="md" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <span
            className="text-sm font-semibold truncate"
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
        <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
          {room.last_message || (isGroup ? `Grupo · ${room.type}` : 'Conversa privada')}
        </p>
      </div>
    </button>
  )
}

// ── Componente: Balão de mensagem ─────────────────────────────────
function MessageBubble({ msg, isMe, showAvatar, prevIsMe }) {
  const time = formatMessageTime(msg.created_at)

  return (
    <div
      className={`flex gap-2.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
      style={{ marginTop: prevIsMe === isMe ? 2 : 12 }}
    >
      {/* Avatar — apenas primeira mensagem de um bloco */}
      <div className="w-8 shrink-0 flex items-end pb-1">
        {showAvatar && !isMe && (
          <Avatar name={msg.user_name} src={msg.avatar_url} size="sm" />
        )}
      </div>

      <div
        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
        style={{ maxWidth: '70%' }}
      >
        {/* Nome — apenas primeira mensagem do bloco em grupos */}
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
          className="px-4 py-2.5 text-sm leading-relaxed"
          style={isMe ? {
            background:   'linear-gradient(135deg, #7C5CFC, #6A4CE6)',
            color:        '#fff',
            borderRadius: '18px 18px 4px 18px',
            boxShadow:    '0 4px 16px rgba(124,92,252,0.30)',
          } : {
            background:   'rgba(255,255,255,0.07)',
            color:        'var(--text-primary)',
            border:       '1px solid rgba(255,255,255,0.07)',
            borderRadius: '18px 18px 18px 4px',
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
function TypingIndicator() {
  return (
    <div className="flex items-center gap-2 px-4 py-2">
      <div className="flex gap-1">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="h-1.5 w-1.5 rounded-full"
            style={{
              background: 'var(--text-muted)',
              animation:  `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>
      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>digitando...</span>
    </div>
  )
}

// ── Componente: Estado vazio da área de conversa ──────────────────
function EmptyConversation({ onNewChat }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      <div
        className="p-6 rounded-3xl mb-6"
        style={{
          background: 'rgba(124,92,252,0.06)',
          border:     '1px solid rgba(124,92,252,0.12)',
        }}
      >
        <MessageSquare size={40} style={{ color: 'rgba(124,92,252,0.5)' }} />
      </div>
      <h3 className="text-base font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
        Suas mensagens
      </h3>
      <p className="text-sm mb-6" style={{ color: 'var(--text-muted)', maxWidth: 240 }}>
        Envie mensagens privadas ou crie grupos com a sua equipe.
      </p>
      <button onClick={onNewChat} className="btn-primary">
        <Plus size={15} /> Nova conversa
      </button>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────
export default function ChatPage() {
  const { user, accessToken } = useAuthStore()
  const role                  = user?.role || 'member'

  // Dados
  const [rooms,         setRooms]         = useState([])
  const [activeRoom,    setActiveRoom]    = useState(null)
  const [messages,      setMessages]      = useState([])
  const [users,         setUsers]         = useState([])

  // UI
  const [loadingRooms,  setLoadingRooms]  = useState(true)
  const [loadingMsgs,   setLoadingMsgs]   = useState(false)
  const [showSidebar,   setShowSidebar]   = useState(true) // mobile toggle
  const [search,        setSearch]        = useState('')
  const [showNew,       setShowNew]       = useState(false)
  const [showEmoji,     setShowEmoji]     = useState(false)
  const [isTyping,      setIsTyping]      = useState(false)

  // Formulário nova conversa
  const [selectedUsers, setSelectedUsers] = useState([])
  const [groupName,     setGroupName]     = useState('')
  const [roomType,      setRoomType]      = useState('private')

  // Input de mensagem
  const [content, setContent] = useState('')

  // Refs
  const messagesEnd  = useRef(null)
  const inputRef     = useRef(null)
  const emojiRef     = useRef(null)
  const wsRef        = useRef(null)
  const typingTimer  = useRef(null)

  // ── WebSocket ──────────────────────────────────────────────────
  useEffect(() => {
    if (!accessToken) return

    const wsUrl = import.meta.env.PROD
      ? `wss://${new URL(import.meta.env.VITE_API_URL).host}/ws?token=${accessToken}`
      : `ws://localhost:3001/ws?token=${accessToken}`

    const ws = new WebSocket(wsUrl)

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data)
        if (msg.type === 'new_message') {
          // Adiciona à conversa ativa sem duplicar
          setMessages(prev => {
            if (prev.some(m => m.id === msg.message.id)) return prev
            return [...prev, msg.message]
          })
          // Atualiza preview da última mensagem na lista
          setRooms(prev => prev.map(r =>
            r.id === msg.roomId
              ? { ...r, last_message: msg.message.content, last_message_at: msg.message.created_at }
              : r
          ))
          scrollToBottom()
        }
        if (msg.type === 'typing') {
          if (msg.userId !== user?.id) {
            setIsTyping(true)
            clearTimeout(typingTimer.current)
            typingTimer.current = setTimeout(() => setIsTyping(false), 2000)
          }
        }
      } catch { /* ignora mensagens malformadas */ }
    }

    ws.onerror  = () => {}
    ws.onclose  = () => {}
    wsRef.current = ws

    return () => {
      ws.close()
      clearTimeout(typingTimer.current)
    }
  }, [accessToken])

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

      // Estagiário só vê suas próprias salas privadas
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
    setShowSidebar(false) // em mobile, esconde a lista
    setLoadingMsgs(true)
    setMessages([])
    setShowEmoji(false)
    try {
      const { data } = await getMessages(room.id, { limit: 100 })
      setMessages(data.messages || [])
    } catch { toast.error('Erro ao carregar mensagens') }
    finally {
      setLoadingMsgs(false)
      setTimeout(scrollToBottom, 80)
    }
  }, [])

  // ── Scroll automático ─────────────────────────────────────────
  const scrollToBottom = () => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => { scrollToBottom() }, [messages])

  // ── Enviar mensagem ───────────────────────────────────────────
  const handleSend = async (e) => {
    e?.preventDefault()
    const text = content.trim()
    if (!text || !activeRoom) return

    setContent('')
    setShowEmoji(false)
    inputRef.current?.focus()

    try {
      const { data } = await sendMessage(activeRoom.id, { content: text })
      // Adiciona otimisticamente (o WS também vai trazer, mas checamos duplicata)
      setMessages(prev => {
        if (prev.some(m => m.id === data.message?.id)) return prev
        return data.message ? [...prev, data.message] : prev
      })
    } catch { toast.error('Erro ao enviar mensagem') }
  }

  // Enter envia, Shift+Enter quebra linha
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // ── Emoji picker ──────────────────────────────────────────────
  const handleEmojiClick = (emojiData) => {
    const emoji  = emojiData.emoji
    const input  = inputRef.current
    if (!input) { setContent(c => c + emoji); return }
    const start  = input.selectionStart
    const end    = input.selectionEnd
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
      openRoom(data.room)
    } catch { toast.error('Erro ao criar conversa') }
  }

  // ── Filtro de busca ───────────────────────────────────────────
  const filteredRooms = rooms.filter(r => {
    const name = getRoomDisplayName(r, user?.id).toLowerCase()
    return name.includes(search.toLowerCase())
  })

  // Separa privadas e grupos para exibição organizada
  const privateRooms = filteredRooms.filter(r => r.type === 'private')
  const groupRooms   = filteredRooms.filter(r => r.type === 'group')

  // Tipos de sala disponíveis por perfil
  const availableTypes = role === 'member'
    ? [{ key: 'private', label: 'Privado', icon: Lock }]
    : [
        { key: 'private', label: 'Privado', icon: Lock  },
        { key: 'group',   label: 'Grupo',   icon: Hash  },
      ]

  // Título e info do cabeçalho da conversa ativa
  const activeRoomName    = activeRoom ? getRoomDisplayName(activeRoom, user?.id) : ''
  const activeRoomAvatar  = activeRoom ? getRoomAvatar(activeRoom) : null
  const activeIsGroup     = activeRoom?.type === 'group'

  // IsMobile heurístico
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

  return (
    <>
      {/* CSS de animação do indicador de digitação */}
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40%            { transform: translateY(-6px); }
        }
      `}</style>

      <div
        className="fade-in flex overflow-hidden"
        style={{
          height:         'calc(100vh - 5rem)',
          background:     'linear-gradient(180deg, rgba(255,255,255,0.025), rgba(255,255,255,0.008))',
          backdropFilter: 'blur(20px)',
          border:         '1px solid rgba(255,255,255,0.06)',
          borderRadius:   24,
          boxShadow:      '0 10px 30px rgba(0,0,0,0.35)',
        }}
      >
        {/* ══════════════════════════════════════════════════════
            SIDEBAR ESQUERDA — Lista de conversas
        ══════════════════════════════════════════════════════ */}
        <div
          className={`flex flex-col shrink-0 transition-all duration-200 ${
            showSidebar ? 'w-[300px]' : 'w-0 md:w-[300px]'
          } overflow-hidden`}
          style={{ borderRight: '1px solid rgba(255,255,255,0.05)', background: 'rgba(8,16,36,0.65)' }}
        >
          {/* Header da sidebar */}
          <div
            className="px-4 pt-4 pb-3 shrink-0"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                Mensagens
              </h2>
              <button
                onClick={() => setShowNew(true)}
                className="p-1.5 rounded-xl transition-all duration-150"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(124,92,252,0.12)'; e.currentTarget.style.color = '#A78BFA' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
                title="Nova conversa"
              >
                <Plus size={17} />
              </button>
            </div>

            {/* Campo de busca */}
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <Search size={13} style={{ color: 'var(--text-muted)', shrink: 0 }} />
              <input
                className="bg-transparent text-sm outline-none flex-1"
                style={{ color: 'var(--text-primary)' }}
                placeholder="Pesquisar..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Lista */}
          <div className="flex-1 overflow-y-auto py-1">
            {loadingRooms ? (
              <div className="flex justify-center py-10"><Spinner /></div>
            ) : filteredRooms.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full pb-10 px-6 text-center">
                <MessageSquare size={28} style={{ color: 'rgba(255,255,255,0.12)', marginBottom: 10 }} />
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {search ? 'Nenhuma conversa encontrada' : 'Nenhuma conversa ainda'}
                </p>
              </div>
            ) : (
              <>
                {/* Mensagens diretas */}
                {privateRooms.length > 0 && (
                  <>
                    <p
                      className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-[0.12em]"
                      style={{ color: 'var(--text-muted)' }}
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
                      />
                    ))}
                  </>
                )}

                {/* Grupos */}
                {groupRooms.length > 0 && (
                  <>
                    <p
                      className="px-4 pt-4 pb-1 text-[10px] font-bold uppercase tracking-[0.12em]"
                      style={{ color: 'var(--text-muted)' }}
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
                      />
                    ))}
                  </>
                )}
              </>
            )}
          </div>

          {/* Perfil do usuário logado */}
          <div
            className="flex items-center gap-3 px-4 py-3 shrink-0"
            style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
          >
            <div className="relative">
              <Avatar name={user?.name || ''} src={user?.avatar_url} size="sm" />
              <div
                className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full"
                style={{ background: '#34D399', border: '2px solid #081024' }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                {user?.name}
              </p>
              <p className="text-[10px]" style={{ color: '#34D399' }}>Online</p>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════
            ÁREA DE CONVERSA
        ══════════════════════════════════════════════════════ */}
        <div className="flex-1 flex flex-col min-w-0">
          {!activeRoom ? (
            <EmptyConversation onNewChat={() => setShowNew(true)} />
          ) : (
            <>
              {/* Cabeçalho da conversa */}
              <div
                className="flex items-center gap-3 px-5 py-3.5 shrink-0"
                style={{
                  borderBottom:   '1px solid rgba(255,255,255,0.05)',
                  background:     'rgba(8,16,36,0.40)',
                  backdropFilter: 'blur(10px)',
                }}
              >
                {/* Botão voltar — mobile */}
                <button
                  onClick={() => setShowSidebar(true)}
                  className="md:hidden p-1.5 rounded-xl mr-1 transition-all duration-150"
                  style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                >
                  <ArrowLeft size={18} />
                </button>

                {/* Avatar da conversa */}
                <div className="relative">
                  {activeIsGroup ? (
                    <div
                      className="h-9 w-9 rounded-full flex items-center justify-center"
                      style={{ background: 'rgba(124,92,252,0.15)', border: '1px solid rgba(124,92,252,0.25)' }}
                    >
                      <Hash size={16} style={{ color: '#A78BFA' }} />
                    </div>
                  ) : (
                    <div className="relative">
                      <Avatar name={activeRoomName} src={activeRoomAvatar} size="sm" />
                      {/* Indicador online */}
                      <div
                        className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full"
                        style={{ background: '#34D399', border: '2px solid #081024' }}
                      />
                    </div>
                  )}
                </div>

                {/* Nome e info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                    {activeRoomName}
                  </p>
                  <p className="text-[11px]" style={{ color: activeIsGroup ? 'var(--text-muted)' : '#34D399' }}>
                    {activeIsGroup ? 'Grupo' : 'Online'}
                  </p>
                </div>
              </div>

              {/* Mensagens */}
              <div
                className="flex-1 overflow-y-auto px-5 py-4"
                style={{ background: 'transparent' }}
              >
                {loadingMsgs ? (
                  <div className="flex justify-center py-10"><Spinner /></div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full">
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                      Nenhuma mensagem ainda. Diga olá! 👋
                    </p>
                  </div>
                ) : (
                  messages.map((msg, i) => {
                    const isMe    = msg.user_id === user?.id
                    const prevMsg = i > 0 ? messages[i - 1] : null
                    const nextMsg = i < messages.length - 1 ? messages[i + 1] : null
                    const prevIsMe     = prevMsg?.user_id === user?.id
                    const showAvatar   = !isMe && (prevMsg?.user_id !== msg.user_id)
                    return (
                      <MessageBubble
                        key={msg.id}
                        msg={msg}
                        isMe={isMe}
                        showAvatar={showAvatar}
                        prevIsMe={prevIsMe}
                      />
                    )
                  })
                )}

                {/* Indicador de digitação */}
                {isTyping && <TypingIndicator />}

                <div ref={messagesEnd} />
              </div>

              {/* Input de mensagem */}
              <div
                className="px-4 py-3 shrink-0 relative"
                style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
              >
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
                      width={320}
                      height={380}
                      searchPlaceholder="Pesquisar emoji..."
                      previewConfig={{ showPreview: false }}
                      skinTonesDisabled
                      style={{
                        '--epr-bg-color':             '#0D152B',
                        '--epr-category-label-bg-color': '#081024',
                        '--epr-search-background-color': 'rgba(255,255,255,0.05)',
                        '--epr-hover-bg-color':       'rgba(124,92,252,0.12)',
                        '--epr-text-color':           'rgba(255,255,255,0.70)',
                        '--epr-border-color':         'rgba(255,255,255,0.06)',
                        borderRadius: '16px',
                        border: '1px solid rgba(255,255,255,0.08)',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.45)',
                      }}
                    />
                  </div>
                )}

                <form onSubmit={handleSend} className="flex items-end gap-2">
                  {/* Botão emoji */}
                  <button
                    type="button"
                    onClick={() => setShowEmoji(v => !v)}
                    className="p-2.5 rounded-xl transition-all duration-150 shrink-0 mb-0.5"
                    style={{
                      color:      showEmoji ? '#A78BFA' : 'var(--text-muted)',
                      background: showEmoji ? 'rgba(124,92,252,0.12)' : 'transparent',
                    }}
                    onMouseEnter={e => { if (!showEmoji) { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#A78BFA' } }}
                    onMouseLeave={e => { if (!showEmoji) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' } }}
                    title="Emojis"
                  >
                    <Smile size={19} />
                  </button>

                  {/* Campo de texto */}
                  <div
                    className="flex-1 flex items-end rounded-2xl px-4 py-2.5 gap-2"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border:     '1px solid rgba(255,255,255,0.08)',
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={e => e.currentTarget.style.borderColor = 'rgba(124,92,252,0.40)'}
                    onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
                  >
                    <textarea
                      ref={inputRef}
                      className="flex-1 bg-transparent outline-none resize-none text-sm leading-relaxed"
                      style={{ color: 'var(--text-primary)', maxHeight: 120, minHeight: 24 }}
                      placeholder={`Mensagem para ${activeRoomName}...`}
                      value={content}
                      rows={1}
                      onChange={e => {
                        setContent(e.target.value)
                        // Auto-resize
                        e.target.style.height = 'auto'
                        e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
                      }}
                      onKeyDown={handleKeyDown}
                    />
                  </div>

                  {/* Botão enviar */}
                  <button
                    type="submit"
                    disabled={!content.trim()}
                    className="p-2.5 rounded-xl transition-all duration-150 shrink-0 mb-0.5"
                    style={content.trim() ? {
                      background: 'linear-gradient(135deg, #7C5CFC, #6A4CE6)',
                      color:      '#fff',
                      boxShadow:  '0 4px 16px rgba(124,92,252,0.30)',
                    } : {
                      background: 'rgba(255,255,255,0.04)',
                      color:      'rgba(255,255,255,0.25)',
                      cursor:     'not-allowed',
                    }}
                  >
                    <Send size={17} />
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          MODAL — Nova conversa
      ══════════════════════════════════════════════════════════ */}
      <Modal
        open={showNew}
        onClose={() => {
          setShowNew(false)
          setSelectedUsers([])
          setGroupName('')
          setRoomType('private')
        }}
        title="Nova conversa"
        size="md"
      >
        <div className="space-y-5">
          {/* Tipo */}
          <div>
            <label className="label">Tipo</label>
            <div className="flex gap-2 mt-1">
              {availableTypes.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setRoomType(key)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150"
                  style={roomType === key
                    ? { background: 'rgba(124,92,252,0.20)', color: '#A78BFA', border: '1px solid rgba(124,92,252,0.30)' }
                    : { background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.06)' }
                  }
                >
                  <Icon size={14} /> {label}
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

          {/* Participantes */}
          <div>
            <label className="label">
              Participantes
              {selectedUsers.length > 0 && (
                <span
                  className="ml-2 text-[10px] px-2 py-0.5 rounded-full font-bold"
                  style={{ background: 'rgba(124,92,252,0.15)', color: '#A78BFA' }}
                >
                  {selectedUsers.length} selecionado{selectedUsers.length > 1 ? 's' : ''}
                </span>
              )}
            </label>
            <div className="flex flex-wrap gap-2 mt-2 max-h-48 overflow-y-auto pr-1">
              {users
                .filter(u => u.id !== user?.id)
                .map(u => {
                  const selected = selectedUsers.includes(u.id)
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => setSelectedUsers(s =>
                        s.includes(u.id) ? s.filter(x => x !== u.id) : [...s, u.id]
                      )}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150"
                      style={selected
                        ? { background: 'rgba(124,92,252,0.20)', color: '#A78BFA', border: '1px solid rgba(124,92,252,0.30)' }
                        : { background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.06)' }
                      }
                    >
                      <Avatar name={u.name} src={u.avatar_url} size="sm" />
                      {u.name}
                      {selected && <Check size={11} style={{ color: '#A78BFA' }} />}
                    </button>
                  )
                })
              }
            </div>
          </div>

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
    </>
  )
}