import React, { useState, useEffect } from 'react'
import { Lock, Hash, Search, Check } from 'lucide-react'
import Modal from '../ui/Modal'
import { toast } from 'react-hot-toast'

export default function NewChatModal({ open, onClose, role, users = [], currentUserId, onCreate }) {
  const [selectedUsers, setSelectedUsers] = useState([])
  const [groupName, setGroupName] = useState('')
  const [roomType, setRoomType] = useState('private')
  const [userSearch, setUserSearch] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) {
      setSelectedUsers([])
      setGroupName('')
      setRoomType('private')
      setUserSearch('')
      setSubmitting(false)
    }
  }, [open])

  const availableTypes = role === 'member'
    ? [{ key: 'private', label: 'Privado', icon: Lock }]
    : [
        { key: 'private', label: 'Privado', icon: Lock },
        { key: 'group',   label: 'Grupo / Canal', icon: Hash },
      ]

  const filteredUsers = users.filter(u => {
    if (u.id === currentUserId) return false
    return u.name?.toLowerCase().includes(userSearch.toLowerCase())
  })

  const toggleUser = (userId) => {
    if (roomType === 'private') {
      setSelectedUsers([userId])
    } else {
      setSelectedUsers(prev =>
        prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
      )
    }
  }

  const handleSubmit = async () => {
    if (roomType === 'group' && !groupName.trim()) {
      return toast.error('Informe o nome do grupo')
    }
    if (selectedUsers.length === 0) {
      return toast.error('Selecione pelo menos um participante')
    }

    setSubmitting(true)
    try {
      await onCreate({
        name: roomType === 'group' ? groupName.trim() : null,
        type: roomType,
        members: selectedUsers,
      })
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erro ao criar conversa')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Nova conversa" size="md">
      {/* Container principal forçando estilo branco e texto preto por cima do Modal original */}
      <div className="flex flex-col gap-4 p-5 rounded-2xl w-full" style={{ backgroundColor: '#ffffff', color: '#000000', minWidth: '100%' }}>
        
        {/* Tipo de Conversa */}
        <div>
          <label className="text-xs font-bold mb-1.5 block" style={{ color: '#4b5563' }}>
            Tipo de Conversa
          </label>
          <div className="grid grid-cols-2 gap-2">
            {availableTypes.map(t => {
              const Icon = t.icon
              const active = roomType === t.key
              return (
                <button
                  key={t.key}
                  onClick={() => { setRoomType(t.key); setSelectedUsers([]) }}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all duration-150"
                  style={{
                    background: active ? 'rgba(37, 99, 235, 0.08)' : '#f9fafb',
                    borderColor: active ? '#2563EB' : '#e5e7eb',
                    color: active ? '#2563EB' : '#000000',
                  }}
                >
                  <Icon size={16} style={{ color: active ? '#2563EB' : '#4b5563' }} />
                  {t.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Nome do Grupo */}
        {roomType === 'group' && (
          <div className="fade-in">
            <label className="text-xs font-bold mb-1.5 block" style={{ color: '#4b5563' }}>
              Nome do Grupo
            </label>
            <input
              className="w-full bg-[#f9fafb] border rounded-xl px-3 py-2 text-sm outline-none transition-all focus:border-[#2563EB]"
              style={{ color: '#000000', borderColor: '#e5e7eb' }}
              placeholder="Ex: Equipe de Vendas"
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
            />
          </div>
        )}

        {/* Seleção de Usuários */}
        <div className="flex flex-col flex-1 min-h-[240px]">
          <label className="text-xs font-bold mb-1.5 block" style={{ color: '#4b5563' }}>
            {roomType === 'group' ? 'Selecionar Participantes' : 'Selecionar Usuário'}
          </label>
          
          <div className="flex items-center gap-2 px-3 py-2 border rounded-xl mb-2 bg-[#f9fafb]" style={{ borderColor: '#e5e7eb' }}>
            <Search size={14} style={{ color: '#9ca3af' }} />
            <input
              className="bg-transparent text-sm outline-none flex-1"
              style={{ color: '#000000' }}
              placeholder="Buscar por nome..."
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
            />
          </div>

          <div className="flex-1 overflow-y-auto max-h-[180px] border rounded-xl p-1 flex flex-col gap-0.5 bg-[#ffffff]" style={{ borderColor: '#e5e7eb' }}>
            {filteredUsers.length === 0 ? (
              <p className="text-xs text-center py-6" style={{ color: '#6b7280' }}>
                Nenhum usuário encontrado
              </p>
            ) : (
              filteredUsers.map(u => {
                const selected = selectedUsers.includes(u.id)
                return (
                  <button
                    key={u.id}
                    onClick={() => toggleUser(u.id)}
                    className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg transition-all duration-150 hover:bg-[#f3f4f6]"
                    style={{ background: selected ? 'rgba(37, 99, 235, 0.05)' : 'transparent' }}
                  >
                    <span className="flex-1 text-left truncate text-sm font-medium" style={{ color: selected ? '#2563EB' : '#000000' }}>
                      {u.name}
                    </span>
                    <div 
                      className="h-4 w-4 rounded-full flex items-center justify-center shrink-0 border transition-all" 
                      style={{ 
                        background: selected ? '#2563EB' : 'transparent', 
                        borderColor: selected ? '#2563EB' : '#d1d5db' 
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

        {/* Rodapé */}
        <div className="flex justify-end gap-3 pt-3 mt-1" style={{ borderTop: '1px solid #e5e7eb' }}>
          <button 
            onClick={onClose} 
            className="px-4 py-2 text-sm font-medium rounded-xl transition-all border hover:bg-gray-50" 
            style={{ color: '#4b5563', borderColor: '#d1d5db', background: '#ffffff' }}
            disabled={submitting}
          >
            Cancelar
          </button>
          <button 
            onClick={handleSubmit} 
            disabled={selectedUsers.length === 0 || submitting} 
            className="px-4 py-2 text-sm font-medium rounded-xl transition-all text-white bg-[#2563EB] hover:bg-[#1d4ed8] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? 'Criando...' : 'Iniciar conversa'}
          </button>
        </div>

      </div>
    </Modal>
  )
}