import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Mail, Phone, Upload, Calendar, Clock, Shield, ToggleLeft, ToggleRight } from 'lucide-react'
import { getUser, updateUser, uploadAvatar } from '../../services/team.service'
import Avatar from '../../components/ui/Avatar'
import Spinner from '../../components/ui/Spinner'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { formatDate } from '../../utils/format'
import { toast } from 'react-hot-toast'

const ROLE_LABELS = { admin: 'Administrador', manager: 'Gerente', member: 'Membro' }
const ROLE_STYLES = {
  admin:   { background: 'rgba(180, 180, 180, 0.55)', color: '#ffffff', border: '1px solid rgba(70, 70, 70, 0.25)' },
  manager: { background: 'rgba(56,189,248,0.10)',  color: '#38BDF8', border: '1px solid rgba(56,189,248,0.20)' },
  member:  { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.50)', border: '1px solid rgba(255,255,255,0.10)' },
}

export default function TeamMemberPage() {
  const { id }   = useParams()
  const navigate = useNavigate()

  const [user,          setUser]          = useState(null)
  const [loading,       setLoading]       = useState(true)
  const [editing,       setEditing]       = useState(false)
  const [form,          setForm]          = useState({})
  const [confirmStatus, setConfirmStatus] = useState(false) // confirm toggle status
  const [savingStatus,  setSavingStatus]  = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await getUser(id)
      setUser(data.user)
      setForm({
        name:      data.user.name,
        position:  data.user.position  || '',
        phone:     data.user.phone     || '',
        is_active: data.user.is_active,
      })
    } catch { toast.error('Membro não encontrado') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [id])

  const handleSave = async () => {
    try {
      const { data } = await updateUser(id, {
        name:     form.name,
        position: form.position,
        phone:    form.phone,
      })
      setUser(data.user)
      setEditing(false)
      toast.success('Perfil atualizado!')
    } catch { toast.error('Erro ao salvar') }
  }

  const handleAvatar = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    try {
      const { data } = await uploadAvatar(id, file)
      setUser(data.user)
      toast.success('Foto atualizada!')
    } catch { toast.error('Erro ao enviar foto') }
  }

  const handleToggleStatus = async () => {
    setSavingStatus(true)
    try {
      const newStatus = !user.is_active
      const { data } = await updateUser(id, { is_active: newStatus })
      setUser(data.user)
      setForm(f => ({ ...f, is_active: newStatus }))
      toast.success(newStatus ? 'Membro reativado com sucesso' : 'Membro desativado')
    } catch { toast.error('Erro ao atualizar status') }
    finally { setSavingStatus(false); setConfirmStatus(false) }
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>
  if (!user) return null

  const isActive = user.is_active

  return (
    <div className="max-w-3xl mx-auto fade-in">
      <button
        onClick={() => navigate('/app/team')}
        className="flex items-center gap-2 text-sm mb-5 transition-colors"
        style={{ color: 'var(--text-muted)' }}
        onMouseEnter={e => e.currentTarget.style.color = '#222222'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
      >
        <ArrowLeft size={15} /> Voltar para Equipe
      </button>

      {/* Hero card */}
      <div className="card p-7 mb-5">
        <div className="flex flex-col sm:flex-row items-start gap-6">
          {/* Avatar */}
          <div className="relative group shrink-0">
            <div className="h-20 w-20 rounded-full overflow-hidden">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center text-2xl font-bold"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.3), rgba(124, 124, 124, 0.12))',
                    color: '#ffffff'
                  }}
                >
                  {user.name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
                </div>
              )}
            </div>
            <label
              className="absolute inset-0 flex items-center justify-center rounded-full cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: 'rgba(94, 94, 94, 0.55)', backdropFilter: 'blur(2px)' }}
            >
              <Upload size={16} className="text-white" />
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatar} />
            </label>

            {/* Indicador de status sobre avatar */}
            <div
              className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2"
              style={{
                background: isActive ? '#34D399' : '#FB7185',
                borderColor: '#0D152B',
                boxShadow: `0 0 8px ${isActive ? 'rgba(52,211,153,0.5)' : 'rgba(251,113,133,0.5)'}`,
              }}
            />
          </div>

          {/* Info / Form */}
          <div className="flex-1">
            {editing ? (
              <div className="space-y-3">
                <div>
                  <label className="label">Nome</label>
                  <input className="input" value={form.name}
                    onChange={e => setForm({...form, name: e.target.value})} />
                </div>
                <div>
                  <label className="label">Cargo</label>
                  <input className="input" value={form.position}
                    onChange={e => setForm({...form, position: e.target.value})} />
                </div>
                <div>
                  <label className="label">Telefone</label>
                  <input className="input" value={form.phone}
                    onChange={e => setForm({...form, phone: e.target.value})} />
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-1 flex-wrap">
                  <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                    {user.name}
                  </h1>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={ROLE_STYLES[user.role]}>
                    {ROLE_LABELS[user.role]}
                  </span>
                  {/* Badge de status */}
                  <span
                    className="text-xs font-bold px-2.5 py-1 rounded-full"
                    style={{
                      background: isActive ? 'rgba(52,211,153,0.10)' : 'rgba(251,113,133,0.10)',
                      color:      isActive ? '#34D399' : '#FB7185',
                      border:     `1px solid ${isActive ? 'rgba(52,211,153,0.25)' : 'rgba(251,113,133,0.25)'}`,
                    }}
                  >
                    {isActive ? 'Ativo' : 'Inativo'}
                  </span>
                </div>

                <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
                  {user.position || 'Sem cargo definido'}
                </p>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    <Mail size={14} style={{ color: 'var(--text-muted)' }} /> {user.email}
                  </div>
                  {user.phone && (
                    <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      <Phone size={14} style={{ color: 'var(--text-muted)' }} /> {user.phone}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Botões de ação */}
          <div className="flex flex-col gap-2 shrink-0">
            {editing ? (
              <>
                <button onClick={handleSave} className="btn-primary">Salvar</button>
                <button onClick={() => setEditing(false)} className="btn-secondary">Cancelar</button>
              </>
            ) : (
              <button onClick={() => setEditing(true)} className="btn-secondary">Editar</button>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
        {[
          { label: 'Admissão',     value: formatDate(user.admitted_at),   icon: Calendar },
          { label: 'Último login', value: formatDate(user.last_login_at), icon: Clock    },
          { label: 'Perfil',       value: ROLE_LABELS[user.role],         icon: Shield   },
          { label: 'Cadastro',     value: formatDate(user.created_at),    icon: Calendar },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="card p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <Icon size={12} style={{ color: 'var(--text-muted)' }} />
              <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                {label}
              </p>
            </div>
            <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Card de controle de status */}
      <div
        className="card p-5"
        style={{
          border: `1px solid ${isActive ? 'rgba(52,211,153,0.15)' : 'rgba(251,113,133,0.15)'}`,
        }}
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Shield size={15} style={{ color: isActive ? '#34D399' : '#FB7185' }} />
              <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                Status do membro
              </h3>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {isActive
                ? 'Este membro está ativo e pode acessar o sistema.'
                : 'Este membro está inativo e não tem acesso ao sistema.'
              }
            </p>
          </div>

          {/* Toggle de status */}
          <button
            onClick={() => setConfirmStatus(true)}
            disabled={savingStatus}
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
            style={isActive ? {
              background: 'rgba(255, 0, 38, 0.53)',
              border: '1px solid rgb(250, 0, 37)',
              color: '#ffffff',
            } : {
              background: 'rgba(52,211,153,0.10)',
              border: '1px solid rgba(52,211,153,0.25)',
              color: '#34D399',
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            {isActive
              ? <><ToggleRight size={18} /> Desativar membro</>
              : <><ToggleLeft  size={18} /> Reativar membro</>
            }
          </button>
        </div>

        {/* Barra visual de status */}
        <div
          className="mt-4 h-1.5 rounded-full overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.05)' }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: isActive ? '100%' : '0%',
              background: 'linear-gradient(90deg, #34D399, #10B981)',
            }}
          />
        </div>
      </div>

      {/* Confirm toggle status */}
      <ConfirmDialog
        open={confirmStatus}
        onClose={() => setConfirmStatus(false)}
        onConfirm={handleToggleStatus}
        title={isActive ? 'Desativar membro' : 'Reativar membro'}
        message={isActive
          ? `Deseja desativar ${user.name}? Ele perderá acesso ao sistema imediatamente.`
          : `Deseja reativar ${user.name}? Ele poderá voltar a acessar o sistema.`
        }
        danger={isActive}
      />
    </div>
  )
}