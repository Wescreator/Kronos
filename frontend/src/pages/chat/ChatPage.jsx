import { useState, useEffect, useRef } from 'react'
import { Send, Plus, MessageSquare, Hash, Lock } from 'lucide-react'
import { getRooms, getMessages, sendMessage, createRoom } from '../../services/chat.service'
import { getUsers } from '../../services/team.service'
import Avatar from '../../components/ui/Avatar'
import Modal from '../../components/ui/Modal'
import Spinner from '../../components/ui/Spinner'
import { formatDateTime, formatDate } from '../../utils/format'
import useAuthStore from '../../store/authStore'
import { toast } from 'react-hot-toast'

export default function ChatPage() {
  const { user, accessToken } = useAuthStore()
  const [rooms,         setRooms]         = useState([])
  const [activeRoom,    setActiveRoom]    = useState(null)
  const [messages,      setMessages]      = useState([])
  const [content,       setContent]       = useState('')
  const [loadingMsg,    setLoadingMsg]    = useState(false)
  const [showNew,       setShowNew]       = useState(false)
  const [users,         setUsers]         = useState([])
  const [selectedUsers, setSelectedUsers] = useState([])
  const [groupName,     setGroupName]     = useState('')
  const [roomType,      setRoomType]      = useState('private')
  const messagesEnd = useRef(null)
  const wsRef       = useRef(null)

  useEffect(() => {
    getRooms().then(r => setRooms(r.data.rooms || []))
    getUsers({ limit: 100 }).then(r => setUsers(r.data.data || []))

    const ws = new WebSocket(`ws://localhost:3001/ws?token=${accessToken}`)
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data)
      if (msg.type === 'new_message') {
        setMessages(m => [...m, msg.message])
        setTimeout(() => messagesEnd.current?.scrollIntoView({ behavior: 'smooth' }), 50)
      }
    }
    wsRef.current = ws
    return () => ws.close()
  }, [])

  const openRoom = async (room) => {
    setActiveRoom(room)
    setLoadingMsg(true)
    try {
      const { data } = await getMessages(room.id)
      setMessages(data.messages || [])
    } finally {
      setLoadingMsg(false)
      setTimeout(() => messagesEnd.current?.scrollIntoView(), 100)
    }
  }

  const handleSend = async (e) => {
    e.preventDefault()
    if (!content.trim() || !activeRoom) return
    try {
      await sendMessage(activeRoom.id, { content })
      setContent('')
      const { data } = await getMessages(activeRoom.id)
      setMessages(data.messages || [])
      setTimeout(() => messagesEnd.current?.scrollIntoView({ behavior: 'smooth' }), 50)
    } catch { toast.error('Erro ao enviar mensagem') }
  }

  const handleCreateRoom = async () => {
    try {
      const name = roomType === 'group' ? groupName : null
      const { data } = await createRoom({ name, type: roomType, members: selectedUsers })
      setRooms(r => [data.room, ...r])
      setShowNew(false); setSelectedUsers([]); setGroupName(''); setRoomType('private')
      openRoom(data.room)
    } catch { toast.error('Erro ao criar conversa') }
  }

  const toggleUser = (id) => setSelectedUsers(s =>
    s.includes(id) ? s.filter(x => x !== id) : [...s, id]
  )

  const roomName = (room) => room.other_user_name || room.name || 'Grupo'

  return (
    <div
      className="fade-in flex overflow-hidden"
      style={{
        height: 'calc(100vh - 6rem)',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.005))',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.05)',
        borderRadius: 24,
        boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
      }}
    >
      {/* Sidebar de salas */}
      <div
        className="flex flex-col shrink-0"
        style={{
          width: 280,
          borderRight: '1px solid rgba(255,255,255,0.05)',
          background: 'rgba(8,16,36,0.60)',
        }}
      >
        {/* Header da sidebar */}
        <div
          className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
        >
          <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
            Mensagens
          </span>
          <button
            onClick={() => setShowNew(true)}
            className="p-1.5 rounded-xl transition-all duration-150"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(124,92,252,0.12)'; e.currentTarget.style.color = '#A78BFA' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
          >
            <Plus size={16} />
          </button>
        </div>

        {/* Lista de salas */}
        <div className="flex-1 overflow-y-auto py-2">
          {rooms.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full px-4 text-center py-12">
              <MessageSquare size={28} style={{ color: 'rgba(255,255,255,0.12)', marginBottom: 10 }} />
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Nenhuma conversa ainda</p>
            </div>
          )}
          {rooms.map(room => (
            <button
              key={room.id}
              onClick={() => openRoom(room)}
              className="w-full text-left px-4 py-3 transition-all duration-150"
              style={activeRoom?.id === room.id
                ? { background: 'rgba(124,92,252,0.12)', borderLeft: '3px solid #7C5CFC', paddingLeft: 13 }
                : { background: 'transparent', borderLeft: '3px solid transparent', paddingLeft: 13 }
              }
              onMouseEnter={e => { if (activeRoom?.id !== room.id) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
              onMouseLeave={e => { if (activeRoom?.id !== room.id) e.currentTarget.style.background = 'transparent' }}
            >
              <div className="flex items-center gap-3">
                <Avatar name={roomName(room)} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                    {roomName(room)}
                  </p>
                  {room.last_message && (
                    <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {room.last_message}
                    </p>
                  )}
                </div>
                {room.type === 'group'
                  ? <Hash size={11} style={{ color: 'var(--text-muted)', shrink: 0 }} />
                  : <Lock size={11} style={{ color: 'var(--text-muted)', shrink: 0 }} />
                }
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Área de mensagens */}
      <div className="flex-1 flex flex-col min-w-0">
        {!activeRoom ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div
              className="p-6 rounded-3xl mb-5"
              style={{
                background: 'rgba(124,92,252,0.06)',
                border: '1px solid rgba(124,92,252,0.12)'
              }}
            >
              <MessageSquare size={36} style={{ color: 'rgba(124,92,252,0.5)' }} />
            </div>
            <p className="text-base font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
              Selecione uma conversa
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              ou crie uma nova clicando em +
            </p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div
              className="flex items-center gap-3 px-5 py-4 shrink-0"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
            >
              <Avatar name={roomName(activeRoom)} size="sm" />
              <div>
                <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                  {roomName(activeRoom)}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {activeRoom.type === 'group' ? 'Grupo' : 'Conversa privada'}
                </p>
              </div>
            </div>

            {/* Mensagens */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {loadingMsg ? (
                <div className="flex justify-center py-10"><Spinner /></div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-12">
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    Nenhuma mensagem ainda. Diga olá!
                  </p>
                </div>
              ) : messages.map((msg, i) => {
                const isMe = msg.user_id === user?.id
                const showAvatar = !isMe && (i === 0 || messages[i-1]?.user_id !== msg.user_id)

                return (
                  <div key={msg.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                    <div className="w-7 shrink-0">
                      {!isMe && showAvatar && (
                        <Avatar name={msg.user_name} src={msg.avatar_url} size="sm" />
                      )}
                    </div>
                    <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[72%]`}>
                      {showAvatar && !isMe && (
                        <span className="text-xs font-semibold mb-1 ml-0.5" style={{ color: 'var(--text-muted)' }}>
                          {msg.user_name}
                        </span>
                      )}
                      <div
                        className="px-4 py-2.5 text-sm leading-relaxed"
                        style={isMe ? {
                          background: 'linear-gradient(135deg, #7C5CFC, #6A4CE6)',
                          color: '#fff',
                          borderRadius: '18px 18px 4px 18px',
                          boxShadow: '0 4px 20px rgba(124,92,252,0.30)'
                        } : {
                          background: 'rgba(255,255,255,0.06)',
                          color: 'var(--text-primary)',
                          border: '1px solid rgba(255,255,255,0.06)',
                          borderRadius: '18px 18px 18px 4px',
                        }}
                      >
                        {msg.content}
                      </div>
                      <span className="text-[10px] mt-1 px-1" style={{ color: 'var(--text-muted)' }}>
                        {formatDateTime(msg.created_at)}
                      </span>
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEnd} />
            </div>

            {/* Input de mensagem */}
            <div className="px-5 py-4 shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <form onSubmit={handleSend} className="flex gap-3">
                <input
                  className="input flex-1"
                  placeholder={`Mensagem para ${roomName(activeRoom)}...`}
                  value={content}
                  onChange={e => setContent(e.target.value)}
                />
                <button
                  type="submit"
                  className="btn-primary px-4 shrink-0"
                  disabled={!content.trim()}
                >
                  <Send size={15} />
                </button>
              </form>
            </div>
          </>
        )}
      </div>

      {/* Modal Nova Conversa */}
      <Modal open={showNew} onClose={() => setShowNew(false)} title="Nova Conversa" size="md">
        <div className="space-y-5">
          {/* Tipo */}
          <div className="flex gap-2">
            {['private','group'].map(type => (
              <button
                key={type}
                onClick={() => setRoomType(type)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150"
                style={roomType === type
                  ? { background: 'rgba(124,92,252,0.20)', color: '#A78BFA', border: '1px solid rgba(124,92,252,0.30)' }
                  : { background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.06)' }
                }
              >
                {type === 'private' ? <><Lock size={13} className="inline mr-1.5" />Privado</> : <><Hash size={13} className="inline mr-1.5" />Grupo</>}
              </button>
            ))}
          </div>

          {roomType === 'group' && (
            <div>
              <label className="label">Nome do grupo</label>
              <input className="input" value={groupName} onChange={e => setGroupName(e.target.value)} />
            </div>
          )}

          <div>
            <label className="label">Participantes</label>
            <div className="flex flex-wrap gap-2 mt-2 max-h-44 overflow-y-auto pr-1">
              {users.filter(u => u.id !== user?.id).map(u => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => toggleUser(u.id)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150"
                  style={selectedUsers.includes(u.id)
                    ? { background: 'rgba(124,92,252,0.20)', color: '#A78BFA', border: '1px solid rgba(124,92,252,0.30)' }
                    : { background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.06)' }
                  }
                >
                  <Avatar name={u.name} size="sm" />
                  {u.name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <button onClick={() => setShowNew(false)} className="btn-secondary">Cancelar</button>
            <button
              onClick={handleCreateRoom}
              disabled={selectedUsers.length === 0}
              className="btn-primary"
            >
              Criar Conversa
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}