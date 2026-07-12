import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Send, Plus, MessageSquare, Hash, Search, ArrowLeft, Smile, CheckCheck, MoreHorizontal, Trash2 } from 'lucide-react'
import EmojiPicker from 'emoji-picker-react'
import { useParams } from 'react-router-dom'
import { getRooms, getMessages, sendMessage, createRoom } from '../../services/chat.service'
import { getUsers } from '../../services/team.service'
import useAuthStore from '../../store/authStore'
import useSocketStore from '../../store/socketStore'
import Avatar from '../../components/ui/Avatar'
import NewChatModal from '../../components/modals/NewChatModal'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import Spinner from '../../components/ui/Spinner'
import useIdempotencyKey from '../../hooks/useIdempotencyKey'
import { toast } from 'react-hot-toast'
import api from '../../services/api'

// Componente visual unificado para garantir que o estilo do ícone seja respeitado
const StatusIcon = ({ icon: Icon, label }) => (
  <div className="flex flex-col items-center justify-center h-full pb-10 px-6 text-center">
    <div
      className="p-4 rounded-3xl mb-4"
      style={{
        backgroundColor: '#9CA3AF',
        border: '1px solid #D1D5DB',
        opacity: '1'
      }}
    >
      <Icon size={24} style={{ color: '#ffffff', opacity: '1' }} />
    </div>
    <p className="text-xs" style={{ color: '#374151', opacity: '1' }}>{label}</p>
  </div>
)

const deleteRoom = (id) => api.delete(`/chat/rooms/${id}`)

function formatMessageTime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function formatRoomTime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const diff = now - d
  if (diff < 60_000) return 'agora'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}min`
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

function RoomItem({ room, active, onClick, currentUserId, onDelete }) {
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef(null)

  const name = getRoomDisplayName(room, currentUserId)
  const avatarSrc = getRoomAvatar(room)
  const isGroup = room.type === 'group'

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
        className={`w-full text-left px-3 md:px-4 py-3 flex gap-3 border-b border-[#f0f2f5] transition ${
          active ? 'bg-[#e3e5e8]' : 'bg-white hover:bg-[#f5f6f6]'
        }`}
      >
        <div className="shrink-0">
          {isGroup ? (
            <div className="w-11 h-11 md:w-12 md:h-12 rounded-full bg-[#e9edef] flex items-center justify-center">
              <Hash size={18} className="text-[#54656f]" />
            </div>
          ) : (
            <Avatar name={name} src={avatarSrc} size="md" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <span className="text-[14px] md:text-[15px] font-medium text-[#111b21] truncate">
              {name}
            </span>

            {room.last_message_at && (
              <span className="text-[11px] shrink-0 text-[#667781]">
                {formatRoomTime(room.last_message_at)}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 mt-1">
            <p className="text-[12px] md:text-[13px] text-[#667781] truncate">
              {room.last_message || (isGroup ? 'Grupo' : 'Conversa privada')}
            </p>
          </div>
        </div>
      </button>

      <div
        ref={menuRef}
        className="absolute right-2 top-1/2 -translate-y-1/2 opacity-100 md:opacity-0 md:group-hover/room:opacity-100 transition-opacity"
        style={{ zIndex: 10 }}
      >
        <button
          onClick={(e) => {
            e.stopPropagation()
            setShowMenu(v => !v)
          }}
          className="w-8 h-8 rounded-full flex items-center justify-center bg-white hover:bg-[#f0f2f5] text-[#54656f] shadow-sm"
        >
          <MoreHorizontal size={16} />
        </button>

        {showMenu && (
          <div
            className="absolute right-0 top-full mt-1 py-1 rounded-xl overflow-hidden bg-white border border-[#e9edef] shadow-lg"
            style={{ minWidth: 150, zIndex: 50 }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowMenu(false)
                onDelete(room)
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm font-medium text-red-500 hover:bg-[#f8f9fa]"
            >
              <Trash2 size={14} />
              {isGroup ? 'Excluir grupo' : 'Excluir conversa'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function DateSeparator({ dateStr }) {
  const d = new Date(dateStr)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const isYesterday = d.toDateString() === new Date(now - 86400000).toDateString()
  const label = isToday ? 'Hoje' : isYesterday ? 'Ontem' : d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })

  return (
    <div className="flex items-center gap-3 my-5">
      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
      <span className="text-[10px] font-semibold uppercase tracking-widest px-3 py-1 rounded-full" style={{ color: 'rgba(255,255,255,0.6)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', letterSpacing: '0.10em' }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
    </div>
  )
}

function MessageBubble({ msg, isMe, showAvatar, prevIsMe }) {
  const time = formatMessageTime(msg.created_at)

  return (
    <div
      className={`flex gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}
      style={{ marginTop: prevIsMe === isMe ? 4 : 12 }}
    >
      {!isMe && (
        <div className="w-8 shrink-0 flex items-end hidden sm:flex">
          {showAvatar ? <Avatar name={msg.user_name} src={msg.avatar_url} size="sm" /> : null}
        </div>
      )}

      <div
        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
        style={{ maxWidth: window.innerWidth < 768 ? '88%' : '72%' }}
      >
        {showAvatar && !isMe && (
          <span className="text-[11px] font-semibold mb-1 px-1 text-[#667781] hidden sm:block">
            {msg.user_name}
          </span>
        )}

        <div
          className={`relative px-4 py-2.5 shadow-sm ${
            isMe ? 'bg-[#d9fdd3] text-[#111b21]' : 'bg-white text-[#111b21]'
          }`}
          style={{
            borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
            minWidth: 90
          }}
        >
          <p className="text-[14px] leading-relaxed pr-14 whitespace-pre-wrap break-words">
            {msg.content}
          </p>

          <div className="absolute right-3 bottom-2 flex items-center gap-1">
            <span className="text-[11px] text-[#667781]">{time}</span>
            {isMe && <CheckCheck size={13} className="text-[#8696a0]" />}
          </div>
        </div>
      </div>
    </div>
  )
}

function TypingIndicator({ names }) {
  const label = names.length === 1 ? `${names[0]} está digitando` : `${names.join(', ')} estão digitando`

  return (
    <div className="flex items-center gap-2.5 px-4 py-2 mx-4 mb-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', width: 'fit-content', maxWidth: 280 }}>
      <div className="flex gap-1 items-center">
        {[0, 1, 2].map(i => (
          <div key={i} className="h-1.5 w-1.5 rounded-full" style={{ background: '#A78BFA', animation: `typingBounce 1.2s ease-in-out ${i * 0.15}s infinite` }} />
        ))}
      </div>
      <span className="text-xs" style={{ color: '#ffffff' }}>{label}...</span>
    </div>
  )
}

// Substitua a função EmptyConversation atual por esta:
function EmptyConversation({ onNewChat }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8 bg-[#f8f9fa]">
      <div className="w-24 h-24 rounded-full bg-[#e9edef] flex items-center justify-center mb-6">
        <MessageSquare size={34} className="text-[#54656f]" />
      </div>

      <h3 className="text-[28px] font-light text-[#41525d] mb-3">
        Kronos Chat
      </h3>

      <p className="text-sm text-[#667781] max-w-[420px] leading-7 mb-8">
        Envie mensagens privadas, acompanhe grupos de projeto e centralize a comunicação da equipe em um único lugar.
      </p>

      <button
        onClick={onNewChat}
        className="h-11 px-5 rounded-lg bg-[#374151] text-white text-sm font-medium hover:brightness-95 transition"
      >
        Nova conversa
      </button>
    </div>
  )
}

export default function ChatPage() {
  const { user } = useAuthStore()
  const { roomId } = useParams()
  const socketConnected = useSocketStore((s) => s.connected)
  const role = user?.role || 'member'

  const [rooms, setRooms] = useState([])
  const [activeRoom, setActiveRoom] = useState(null)
  const [messages, setMessages] = useState([])
  const [users, setUsers] = useState([])
  const [onlineUsers, setOnlineUsers] = useState(new Set())
  const [typingUsers, setTypingUsers] = useState({})
  const [loadingRooms, setLoadingRooms] = useState(true)
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [showSidebar, setShowSidebar] = useState(true)
  const [search, setSearch] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [content, setContent] = useState('')

  // Chave de idempotência da mensagem em digitação — ver useIdempotencyKey.
  const [msgIdemKey, renewMsgIdemKey] = useIdempotencyKey(true)

  const messagesEnd = useRef(null)
  const inputRef = useRef(null)
  const emojiRef = useRef(null)
  const typingTimers = useRef({})
  const sendTypingTimer = useRef(null)
  const activeRoomRef = useRef(null)

  useEffect(() => { activeRoomRef.current = activeRoom }, [activeRoom])

  useEffect(() => {
    useSocketStore.getState().ensureConnected()

    const unsubscribe = useSocketStore.getState().subscribe((msg) => {
      if (msg.type === 'new_message') {
        if (activeRoomRef.current?.id === msg.roomId) {
          setMessages(prev => {
            if (prev.some(m => m.id === msg.message.id)) return prev
            return [...prev, msg.message]
          })
        }
        setRooms(prev => {
          const exists = prev.some(r => r.id === msg.roomId)
          if (!exists) return prev
          const mapped = prev.map(r =>
            r.id === msg.roomId
              ? { ...r, last_message: msg.message.content, last_message_at: msg.message.created_at }
              : r
          )
          return [...mapped].sort((a, b) => new Date(b.last_message_at || 0) - new Date(a.last_message_at || 0))
        })
        if (activeRoomRef.current?.id === msg.roomId) {
          setTimeout(() => messagesEnd.current?.scrollIntoView({ behavior: 'smooth' }), 30)
        }
      }

      if (msg.type === 'typing' && msg.userId !== user?.id) {
        if (activeRoomRef.current?.id === msg.roomId) {
          setTypingUsers(prev => ({ ...prev, [msg.userId]: msg.userName || 'Alguém' }))
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

      if (msg.type === 'presence') {
        setOnlineUsers(prev => {
          const next = new Set(prev)
          if (msg.status === 'online') next.add(msg.userId)
          if (msg.status === 'offline') next.delete(msg.userId)
          return next
        })
      }

      if (msg.type === 'online_users' && Array.isArray(msg.userIds)) {
        setOnlineUsers(new Set(msg.userIds))
      }
    })

    return () => {
      unsubscribe()
      Object.values(typingTimers.current).forEach(clearTimeout)
      clearTimeout(sendTypingTimer.current)
    }
  }, [user?.id])

  useEffect(() => {
    const handler = (e) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target)) {
        setShowEmoji(false)
      }
    }
    if (showEmoji) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showEmoji])

  const loadRooms = useCallback(async () => {
    setLoadingRooms(true)
    try {
      const { data } = await getRooms()
      let all = data.rooms || []
      if (role === 'member') {
        all = all.filter(r => r.created_by === user?.id || r.type === 'private')
      }
      const sorted = [...all].sort((a, b) => new Date(b.last_message_at || 0) - new Date(a.last_message_at || 0))
      setRooms(sorted)
    } catch { }
    finally { setLoadingRooms(false) }
  }, [role, user?.id])

  useEffect(() => {
    loadRooms()
    getUsers({ limit: 200 })
      .then(r => setUsers(r.data.data || []))
      .catch(() => toast.error('Erro ao carregar lista de membros'))
  }, [loadRooms])

  useEffect(() => {
    if (!roomId || loadingRooms) return
    if (activeRoom?.id === roomId) return
    const target = rooms.find(r => r.id === roomId)
    if (target) {
      openRoom(target)
    } else if (rooms.length > 0) {
      toast.error('Conversa não encontrada ou sem acesso')
    }
  }, [roomId, rooms, loadingRooms])

  const openRoom = useCallback(async (room) => {
    setActiveRoom(room)
    if (window.innerWidth < 768) setShowSidebar(false)
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
      setTimeout(() => messagesEnd.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    }
  }, [])

  const handleSend = async (e) => {
    e?.preventDefault()
    const text = content.trim()
    if (!text || !activeRoom) return

    setContent('')
    setShowEmoji(false)
    inputRef.current?.focus()
    clearTimeout(sendTypingTimer.current)

    try {
      // Chave renovada a cada envio: protege a MESMA mensagem contra reenvio
      // duplicado (retry/reconexão), sem impedir o usuário de mandar a mesma
      // frase duas vezes de propósito.
      const { data } = await sendMessage(activeRoom.id, { content: text }, msgIdemKey)
      renewMsgIdemKey()
      setMessages(prev => {
        if (prev.some(m => m.id === data.message?.id)) return prev
        return data.message ? [...prev, data.message] : prev
      })
      setRooms(prev => {
        const mapped = prev.map(r => r.id === activeRoom.id ? { ...r, last_message: text, last_message_at: new Date().toISOString() } : r)
        return [...mapped].sort((a, b) => new Date(b.last_message_at || 0) - new Date(a.last_message_at || 0))
      })
    } catch { toast.error('Erro ao enviar mensagem') }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleTyping = (e) => {
    setContent(e.target.value)
    if (!activeRoom) return
    clearTimeout(sendTypingTimer.current)
    sendTypingTimer.current = setTimeout(() => {
      useSocketStore.getState().send({
        type: 'typing',
        roomId: activeRoom.id,
        userId: user?.id,
        userName: user?.name,
      })
    }, 400)
  }

  const handleEmojiClick = (emojiData) => {
    const emoji = emojiData.emoji
    const input = inputRef.current
    if (!input) { setContent(c => c + emoji); return }
    const start = input.selectionStart
    const end = input.selectionEnd
    setContent(c => c.slice(0, start) + emoji + c.slice(end))
    setTimeout(() => {
      input.focus()
      input.setSelectionRange(start + emoji.length, start + emoji.length)
    }, 0)
  }

  const handleCreateRoom = async (payload, idemKey) => {
    const { data } = await createRoom(payload, idemKey)
    setRooms(prev => {
      if (prev.some(r => r.id === data.room.id)) return prev
      return [data.room, ...prev]
    })
    openRoom(data.room)
  }

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

  const filteredRooms = rooms.filter(r =>
    getRoomDisplayName(r, user?.id).toLowerCase().includes(search.toLowerCase())
  )
  const privateRooms = filteredRooms.filter(r => r.type === 'private')
  const groupRooms = filteredRooms.filter(r => r.type === 'group')

  const activeRoomName = activeRoom ? getRoomDisplayName(activeRoom, user?.id) : ''
  const activeRoomAvatar = activeRoom ? getRoomAvatar(activeRoom) : null
  const activeIsGroup = activeRoom?.type === 'group'
  const typingNames = Object.values(typingUsers)
  const otherUserId = activeRoom?.other_user_id
  const isOtherOnline = otherUserId ? onlineUsers.has(otherUserId) : false

  return (
    <>
      <style>{`
  @keyframes typingBounce {
    0%, 80%, 100% { transform: translateY(0); opacity: 0.45; }
    40% { transform: translateY(-4px); opacity: 1; }
  }

  @keyframes fadeInMsg {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .msg-appear {
    animation: fadeInMsg 0.18s ease forwards;
  }

  .chat-scroll::-webkit-scrollbar {
    width: 6px;
  }

  .chat-scroll::-webkit-scrollbar-track {
    background: transparent;
  }

  .chat-scroll::-webkit-scrollbar-thumb {
    background: rgba(17, 27, 33, 0.16);
    border-radius: 999px;
  }

  .chat-scroll::-webkit-scrollbar-thumb:hover {
    background: rgba(17, 27, 33, 0.24);
  }

  @media (max-width: 767px) {
    .chat-scroll::-webkit-scrollbar {
      width: 4px;
    }
  }
`}</style>

      <div
  className="fade-in flex overflow-hidden w-full h-full rounded-none md:rounded-2xl"
  style={{
    height: 'calc(100vh - 5rem)',
    background: '#e9edef',
    position: 'relative',
    border: '1px solid #d1d7db'
  }}
>
  {/* SIDEBAR */}
  <div
    className={`
      ${activeRoom && !showSidebar ? 'hidden' : 'flex'}
      md:flex flex-col shrink-0
      w-full md:w-[360px] lg:w-[380px]
      bg-white
      relative z-[2]
    `}
    style={{
      borderRight: '1px solid #d1d7db'
    }}
  >
    {/* topo sidebar */}
    <div
      className="px-4 shrink-0 flex items-center justify-between"
      style={{
        height: 72,
        background: '#f0f2f5',
        borderBottom: '1px solid #e9edef'
      }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <Avatar name={user?.name || ''} src={user?.avatar_url} size="md" />
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-[#111b21] truncate">{user?.name}</p>
          <p className="text-[12px]" style={{ color: socketConnected ? '#00a884' : '#667781' }}>
            {socketConnected ? 'Online' : 'Conectando...'}
          </p>
        </div>
      </div>

      <button
        onClick={() => setShowNew(true)}
        className="w-10 h-10 rounded-full hover:bg-black/5 flex items-center justify-center text-[#54656f]"
        title="Nova conversa"
      >
        <Plus size={18} />
      </button>
    </div>

    {/* busca */}
    <div className="p-3 border-b border-[#e9edef] bg-white">
      <div className="h-11 rounded-xl bg-[#f0f2f5] flex items-center gap-3 px-4 text-[#667781]">
        <Search size={16} />
        <input
          className="bg-transparent outline-none border-none w-full text-sm text-[#111b21]"
          placeholder="Pesquisar ou começar uma nova conversa"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>
    </div>

    {/* lista */}
    <div className="flex-1 overflow-y-auto chat-scroll bg-white">
      {loadingRooms ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : filteredRooms.length === 0 ? (
        <StatusIcon icon={MessageSquare} label="Nenhuma conversa encontrada" />
      ) : (
        <>
          {privateRooms.length > 0 && (
            <div>
              {privateRooms.map(room => (
                <RoomItem
                  key={room.id}
                  room={room}
                  active={activeRoom?.id === room.id}
                  onClick={() => {
                    openRoom(room)
                    if (window.innerWidth < 768) setShowSidebar(false)
                  }}
                  currentUserId={user?.id}
                  onDelete={setDeleteTarget}
                />
              ))}
            </div>
          )}

          {groupRooms.length > 0 && (
            <div className="border-t border-[#f0f2f5]">
              {groupRooms.map(room => (
                <RoomItem
                  key={room.id}
                  room={room}
                  active={activeRoom?.id === room.id}
                  onClick={() => {
                    openRoom(room)
                    if (window.innerWidth < 768) setShowSidebar(false)
                  }}
                  currentUserId={user?.id}
                  onDelete={setDeleteTarget}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  </div>

  {/* ÁREA PRINCIPAL */}
  <div
    className={`
      ${activeRoom && !showSidebar ? 'flex' : 'hidden'}
      md:flex flex-1 flex-col min-w-0
    `}
    style={{
      position: 'relative',
      zIndex: 1,
      background: '#efeae2'
    }}
  >
    {!activeRoom ? (
      <EmptyConversation onNewChat={() => setShowNew(true)} />
    ) : (
      <>
        {/* HEADER */}
        <div
          className="flex items-center gap-3 px-3 md:px-4 shrink-0"
          style={{
            borderBottom: '1px solid #d1d7db',
            minHeight: 64,
            background: '#f0f2f5'
          }}
        >
          <button
            onClick={() => setShowSidebar(true)}
            className="md:hidden w-10 h-10 rounded-full hover:bg-black/5 flex items-center justify-center text-[#54656f] shrink-0"
          >
            <ArrowLeft size={18} />
          </button>

          <div className="relative shrink-0">
            {activeIsGroup ? (
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-[#e9edef] flex items-center justify-center">
                <Hash size={18} className="text-[#54656f]" />
              </div>
            ) : (
              <Avatar name={activeRoomName} src={activeRoomAvatar} size="md" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-[14px] md:text-[15px] font-medium truncate text-[#111b21]">
              {activeRoomName}
            </p>
            <p
              className="text-[11px] md:text-[12px]"
              style={{ color: activeIsGroup ? '#667781' : (isOtherOnline ? '#00a884' : '#667781') }}
            >
              {activeIsGroup ? 'Grupo' : (isOtherOnline ? 'online' : 'offline')}
            </p>
          </div>
        </div>

        {/* MENSAGENS */}
        <div
          className="flex-1 overflow-y-auto chat-scroll"
          style={{
            padding: window.innerWidth < 768 ? '14px 12px 10px' : '24px 32px 12px',
            position: 'relative',
            background: '#efeae2'
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              opacity: 0.12,
              pointerEvents: 'none',
              backgroundImage:
                'radial-gradient(circle, rgba(0,0,0,0.06) 1px, transparent 1px)',
              backgroundSize: '22px 22px'
            }}
          />

          <div style={{ position: 'relative', zIndex: 1 }}>
            {loadingMsgs ? (
              <div className="flex justify-center py-16">
                <Spinner />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <p className="text-sm font-semibold mb-1 text-[#41525d]">Início da conversa</p>
                <p className="text-xs text-[#667781]">Diga olá para {activeRoomName} 👋</p>
              </div>
            ) : (
              messages.map((msg, i) => {
                const isMe = msg.user_id === user?.id
                const prevMsg = i > 0 ? messages[i - 1] : null
                const prevIsMe = prevMsg?.user_id === user?.id
                const showAvatar = !isMe && (prevMsg?.user_id !== msg.user_id)
                const msgDate = msg.created_at ? new Date(msg.created_at).toDateString() : null
                const prevDate = prevMsg?.created_at ? new Date(prevMsg.created_at).toDateString() : null

                return (
                  <React.Fragment key={msg.id}>
                    {msgDate && msgDate !== prevDate && <DateSeparator dateStr={msg.created_at} />}
                    <div className="msg-appear">
                      <MessageBubble
                        msg={msg}
                        isMe={isMe}
                        showAvatar={showAvatar}
                        prevIsMe={prevIsMe}
                      />
                    </div>
                  </React.Fragment>
                )
              })
            )}

            {typingNames.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <TypingIndicator names={typingNames} />
              </div>
            )}

            <div ref={messagesEnd} />
          </div>
        </div>

        {/* INPUT */}
        <div
          className="shrink-0 relative"
          style={{
            borderTop: '1px solid #d1d7db',
            background: '#f0f2f5',
            padding: window.innerWidth < 768 ? '10px 10px 12px' : '12px 20px 16px'
          }}
        >
          <div style={{ position: 'relative' }}>
            {showEmoji && (
              <div
                ref={emojiRef}
                className="absolute z-50"
                style={{
                  bottom: '100%',
                  left: window.innerWidth < 768 ? 0 : 16,
                  marginBottom: 8
                }}
              >
                <EmojiPicker
                  onEmojiClick={handleEmojiClick}
                  theme="light"
                  width={window.innerWidth < 768 ? 290 : 300}
                  height={360}
                  searchPlaceholder="Pesquisar emoji..."
                  previewConfig={{ showPreview: false }}
                  skinTonesDisabled
                />
              </div>
            )}

            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={() => setShowEmoji(v => !v)}
                className="w-10 h-10 rounded-full hover:bg-black/5 flex items-center justify-center text-[#54656f] shrink-0"
              >
                <Smile size={20} />
              </button>

              <div className="flex-1 flex items-end rounded-2xl px-4 py-3 bg-white border border-[#d1d7db]">
                <textarea
                  ref={inputRef}
                  className="flex-1 bg-transparent outline-none resize-none text-sm leading-relaxed text-[#111b21]"
                  style={{ maxHeight: 120, minHeight: 24 }}
                  placeholder={`Mensagem para ${activeRoomName}...`}
                  value={content}
                  rows={1}
                  onChange={handleTyping}
                  onKeyDown={handleKeyDown}
                />
              </div>

              <button
                type="button"
                onClick={handleSend}
                disabled={!content.trim()}
                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition"
                style={
                  content.trim()
                    ? { background: '#00a884', color: '#fff' }
                    : { background: '#dfe5e7', color: '#9aa7b0', cursor: 'not-allowed' }
                }
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      </>
    )}
  </div>
</div>

      <NewChatModal open={showNew} onClose={() => setShowNew(false)} users={users} onCreate={handleCreateRoom} currentUserId={user?.id} role={role} />
      <ConfirmDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDeleteRoom} title={deleteTarget?.type === 'group' ? 'Excluir grupo' : 'Excluir conversa'} message={deleteTarget?.type === 'group' ? `Tem certeza que deseja excluir o grupo?` : `Tem certeza que deseja excluir esta conversa?`} danger={true} deleteLoading={deleteLoading} />
    </>
  )
}