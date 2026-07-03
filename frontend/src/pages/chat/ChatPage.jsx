import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Send, Plus, MessageSquare, Hash, Search, ArrowLeft, Smile, CheckCheck, MoreHorizontal, Trash2 } from 'lucide-react'
import EmojiPicker from 'emoji-picker-react'
import { getRooms, getMessages, sendMessage, createRoom } from '../../services/chat.service'
import { getUsers } from '../../services/team.service'
import useAuthStore from '../../store/authStore'
import Avatar from '../../components/ui/Avatar'
import NewChatModal from '../../components/modals/NewChatModal'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import Spinner from '../../components/ui/Spinner'
import { toast } from 'react-hot-toast'
import api from '../../services/api'

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
        className="w-full text-left flex items-center gap-3 px-3 py-2.5 transition-all duration-150 rounded-xl mx-1"
        style={{
          width: 'calc(100% - 8px)',
          background: active ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
          border: active ? '1px solid rgba(255, 255, 255, 0.25)' : '1px solid transparent',
        }}
      >
        <div className="relative shrink-0">
          {isGroup ? (
            <div
              className="h-9 w-9 rounded-full flex items-center justify-center shrink-0"
              style={{ background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)' }}
            >
              <Hash size={14} style={{ color: '#ffffff' }} />
            </div>
          ) : (
            <Avatar name={name} src={avatarSrc} size="sm" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[13px] font-semibold truncate" style={{ color: '#ffffff' }}>
              {name}
            </span>
            {room.last_message_at && (
              <span className="text-[10px] shrink-0 ml-2" style={{ color: 'rgba(255,255,255,0.6)' }}>
                {formatRoomTime(room.last_message_at)}
              </span>
            )}
          </div>
          <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.5)', maxWidth: 160 }}>
            {room.last_message || (isGroup ? 'Grupo' : 'Conversa privada')}
          </p>
        </div>
      </button>

      <div ref={menuRef} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover/room:opacity-100 transition-opacity duration-150" style={{ zIndex: 10 }}>
        <button
          onClick={(e) => { e.stopPropagation(); setShowMenu(v => !v) }}
          className="p-1.5 rounded-lg transition-all duration-150"
          style={{ color: '#ffffff', background: showMenu ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.4)' }}
        >
          <MoreHorizontal size={13} />
        </button>

        {showMenu && (
          <div
            className="absolute right-0 top-full mt-1 py-1 rounded-xl overflow-hidden"
            style={{ background: '#2d2d2d', border: '1px solid rgba(255, 255, 255, 0.1)', boxShadow: '0 8px 24px rgba(0,0,0,0.3)', minWidth: 140, zIndex: 50 }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowMenu(false)
                onDelete(room)
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium transition-all duration-150 text-red-400 hover:bg-white/5"
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
    <div className={`flex gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'}`} style={{ marginTop: prevIsMe === isMe ? 3 : 16 }}>
      <div className="w-8 shrink-0 flex items-end pb-1">
        {showAvatar && !isMe && <Avatar name={msg.user_name} src={msg.avatar_url} size="sm" />}
      </div>

      <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`} style={{ maxWidth: '68%' }}>
        {showAvatar && !isMe && (
          <span className="text-[11px] font-semibold mb-1.5 px-1" style={{ color: '#A78BFA', letterSpacing: '0.01em' }}>
            {msg.user_name}
          </span>
        )}

        <div
          className="px-4 py-2.5 text-sm leading-relaxed"
          style={isMe ? {
            background: 'linear-gradient(135deg, #7C5CFC 0%, #5b3fe0 100%)',
            color: '#fff',
            borderRadius: '18px 4px 18px 18px',
            boxShadow: '0 4px 20px rgba(124,92,252,0.35)',
            letterSpacing: '0.01em',
          } : {
            background: 'rgba(255,255,255,0.1)',
            color: '#ffffff',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '4px 18px 18px 18px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            letterSpacing: '0.01em',
          }}
        >
          {msg.content}
        </div>

        <div className="flex items-center gap-1.5 mt-1 px-1">
          <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>{time}</span>
          {isMe && <CheckCheck size={11} style={{ color: '#A78BFA' }} />}
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

function EmptyConversation({ onNewChat }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8" style={{ position: 'relative' }}>
      <div style={{ position: 'absolute', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ width: 72, height: 72, borderRadius: 24, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justify: 'center', marginBottom: 20 }}>
        <MessageSquare size={30} style={{ color: '#ffffff' }} />
      </div>
      <h3 className="text-base font-bold mb-2" style={{ color: '#ffffff' }}>Suas mensagens</h3>
      <p className="text-sm mb-7" style={{ color: 'rgba(255,255,255,0.5)', maxWidth: 220, lineHeight: 1.6 }}>Envie mensagens privadas ou crie grupos com a sua equipe.</p>
      <button onClick={onNewChat} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
        <Plus size={14} /> Nova conversa
      </button>
    </div>
  )
}

export default function ChatPage() {
  const { user, accessToken } = useAuthStore()
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
  const [myOnlineStatus, setMyOnlineStatus] = useState(false)

  const messagesEnd = useRef(null)
  const inputRef = useRef(null)
  const emojiRef = useRef(null)
  const wsRef = useRef(null)
  const typingTimers = useRef({})
  const sendTypingTimer = useRef(null)
  const activeRoomRef = useRef(null)

  useEffect(() => { activeRoomRef.current = activeRoom }, [activeRoom])

  useEffect(() => {
    if (!accessToken) return

    const wsUrl = import.meta.env.PROD
      ? `wss://${new URL(import.meta.env.VITE_API_URL).host}/ws?token=${accessToken}`
      : `ws://localhost:3001/ws?token=${accessToken}`

    const ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      setMyOnlineStatus(true)
      ws.send(JSON.stringify({ type: 'presence', status: 'online', userId: user?.id }))
    }

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data)

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

      } catch { /* erro silenciado */ }
    }

    ws.onclose = () => {
      setMyOnlineStatus(false)
      setOnlineUsers(new Set())
    }

    wsRef.current = ws

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'presence', status: 'offline', userId: user?.id }))
      }
      ws.close()
      Object.values(typingTimers.current).forEach(clearTimeout)
      clearTimeout(sendTypingTimer.current)
    }
  }, [accessToken, user?.id])

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
    } catch { /* erro silenciado */ }
    finally { setLoadingRooms(false) }
  }, [role, user?.id])

  useEffect(() => {
    loadRooms()
    getUsers({ limit: 200 })
      .then(r => setUsers(r.data.data || []))
      .catch(() => toast.error('Erro ao carregar lista de membros'))
  }, [loadRooms])

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
      const { data } = await sendMessage(activeRoom.id, { content: text })
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
    if (!activeRoom || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
    clearTimeout(sendTypingTimer.current)
    sendTypingTimer.current = setTimeout(() => {
      wsRef.current.send(JSON.stringify({
        type: 'typing',
        roomId: activeRoom.id,
        userId: user?.id,
        userName: user?.name,
      }))
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

  const handleCreateRoom = async (payload) => {
    const { data } = await createRoom(payload)
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
        @keyframes typingBounce { 0%, 80%, 100% { transform: translateY(0); opacity: 0.5; } 40% { transform: translateY(-5px); opacity: 1; } }
        @keyframes fadeInMsg { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        .msg-appear { animation: fadeInMsg 0.18s ease forwards; }
        .chat-scroll::-webkit-scrollbar { width: 4px; }
        .chat-scroll::-webkit-scrollbar-track { background: transparent; }
        .chat-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 4px; }
      `}</style>

      {/* BACKGROUND TOTALMENTE TRANSPARENTE AQUI */}
      <div className="fade-in flex overflow-hidden w-full h-full" style={{ height: 'calc(100vh - 5rem)', background: 'transparent', position: 'relative' }}>
        
        {/* Sidebar Esquerda Transparente */}
        <div className={`flex flex-col shrink-0 transition-all duration-200 ${showSidebar ? 'w-[280px]' : 'w-0 md:w-[280px]'} md:w-[280px] overflow-hidden`} style={{ borderRight: '1px solid rgba(255,255,255,0.1)', background: 'transparent', position: 'relative', zIndex: 1 }}>
          <div className="px-3 shrink-0" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: 20, paddingBottom: 14 }}>
            <div className="flex items-center justify-between px-1" style={{ marginBottom: 12 }}>
              <h2 className="text-[13px] font-bold tracking-wide" style={{ color: '#ffffff' }}>Mensagens</h2>
              <button onClick={() => setShowNew(true)} className="p-1.5 rounded-lg transition-all duration-150 hover:bg-white/5" style={{ color: '#ffffff' }} title="Nova conversa">
                <Plus size={16} />
              </button>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <Search size={12} style={{ color: 'rgba(255,255,255,0.4)' }} />
              <input className="bg-transparent text-xs outline-none flex-1" style={{ color: '#ffffff' }} placeholder="Pesquisar..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto py-2 chat-scroll">
            {loadingRooms ? (
              <div className="flex justify-center py-10"><Spinner /></div>
            ) : filteredRooms.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full pb-10 px-6 text-center">
                <MessageSquare size={24} style={{ color: 'rgba(255,255,255,0.2)', marginBottom: 8 }} />
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>Nenhuma conversa encontrada</p>
              </div>
            ) : (
              <div className="px-1">
                {privateRooms.length > 0 && (
                  <>
                    <p className="px-3 pt-2 pb-1.5 text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: 'rgba(255,255,255,0.4)' }}>Diretas</p>
                    {privateRooms.map(room => (
                      <RoomItem key={room.id} room={room} active={activeRoom?.id === room.id} onClick={() => openRoom(room)} currentUserId={user?.id} onDelete={setDeleteTarget} />
                    ))}
                  </>
                )}
                {groupRooms.length > 0 && (
                  <>
                    <p className="px-3 pt-3 pb-1.5 text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: 'rgba(255,255,255,0.4)' }}>Grupos</p>
                    {groupRooms.map(room => (
                      <RoomItem key={room.id} room={room} active={activeRoom?.id === room.id} onClick={() => openRoom(room)} currentUserId={user?.id} onDelete={setDeleteTarget} />
                    ))}
                  </>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2.5 px-4 py-3 shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)' }}>
            <div className="relative shrink-0">
              <Avatar name={user?.name || ''} src={user?.avatar_url} size="sm" />
              <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full" style={{ background: myOnlineStatus ? '#34D399' : 'rgba(255,255,255,0.4)', border: '2px solid #06080f' }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate" style={{ color: '#ffffff' }}>{user?.name}</p>
              <p className="text-[10px] font-medium" style={{ color: myOnlineStatus ? '#34D399' : 'rgba(255,255,255,0.4)' }}>{myOnlineStatus ? 'Online' : 'Conectando...'}</p>
            </div>
          </div>
        </div>

        {/* Lado Direito do Chat Transparente */}
        <div className="flex-1 flex flex-col min-w-0" style={{ position: 'relative', zIndex: 1, background: 'transparent' }}>
          {!activeRoom ? (
            <EmptyConversation onNewChat={() => setShowNew(true)} />
          ) : (
            <>
              <div className="flex items-center gap-3 px-5 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', height: 64 }}>
                <button onClick={() => setShowSidebar(true)} className="md:hidden p-1.5 rounded-lg mr-1" style={{ color: '#ffffff' }}>
                  <ArrowLeft size={18} />
                </button>
                <div className="relative shrink-0">
                  {activeIsGroup ? (
                    <div className="h-9 w-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}>
                      <Hash size={15} style={{ color: '#ffffff' }} />
                    </div>
                  ) : (
                    <div className="relative">
                      <Avatar name={activeRoomName} src={activeRoomAvatar} size="md" />
                      <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full" style={{ background: isOtherOnline ? '#34D399' : '#374151', border: '2px solid #05081a' }} />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-bold truncate leading-tight" style={{ color: '#fff' }}>{activeRoomName}</p>
                  <p className="text-[11px] font-medium leading-tight mt-0.5" style={{ color: activeIsGroup ? 'rgba(255,255,255,0.5)' : (isOtherOnline ? '#34D399' : 'rgba(255,255,255,0.4)') }}>
                    {activeIsGroup ? 'Canal de grupo' : (isOtherOnline ? '● Online agora' : '○ Offline')}
                  </p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto chat-scroll" style={{ padding: '24px 32px 12px', position: 'relative' }}>
                <div style={{ position: 'relative', zIndex: 1 }}>
                  {loadingMsgs ? (
                    <div className="flex justify-center py-16"><Spinner /></div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                      <p className="text-sm font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.6)' }}>Início da conversa</p>
                      <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Diga olá para {activeRoomName} 👋</p>
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
                            <MessageBubble msg={msg} isMe={isMe} showAvatar={showAvatar} prevIsMe={prevIsMe} />
                          </div>
                        </React.Fragment>
                      )
                    })
                  )}
                  {typingNames.length > 0 && <div style={{ marginTop: 8 }}><TypingIndicator names={typingNames} /></div>}
                  <div ref={messagesEnd} />
                </div>
              </div>

              {/* Caixa de Texto Inferior Transparente */}
              <div className="shrink-0 relative" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', background: 'transparent', padding: '12px 20px 16px' }}>
                <div style={{ position: 'relative' }}>
                  {showEmoji && (
                    <div ref={emojiRef} className="absolute z-50" style={{ bottom: '100%', left: 16, marginBottom: 8 }}>
                      <EmojiPicker onEmojiClick={handleEmojiClick} theme="dark" width={300} height={360} searchPlaceholder="Pesquisar emoji..." previewConfig={{ showPreview: false }} skinTonesDisabled />
                    </div>
                  )}

                  <div className="flex items-end gap-2">
                    <button type="button" onClick={() => setShowEmoji(v => !v)} className="p-2 rounded-xl transition-all duration-150 shrink-0 mb-0.5 text-white hover:bg-white/5">
                      <Smile size={18} />
                    </button>
                    <div className="flex-1 flex items-end rounded-2xl px-4 py-2.5" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)' }}>
                      <textarea ref={inputRef} className="flex-1 bg-transparent outline-none resize-none text-sm leading-relaxed" style={{ color: '#ffffff', maxHeight: 120, minHeight: 24 }} placeholder={`Mensagem para ${activeRoomName}...`} value={content} rows={1} onChange={handleTyping} onKeyDown={handleKeyDown} />
                    </div>
                    <button type="button" onClick={handleSend} disabled={!content.trim()} className="p-2 rounded-xl transition-all duration-150 shrink-0 mb-0.5" style={content.trim() ? { background: 'linear-gradient(135deg, #7C5CFC, #6347e0)', color: '#fff' } : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.20)', cursor: 'not-allowed' }}>
                      <Send size={16} />
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