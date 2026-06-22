import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Users, Mail, Phone } from 'lucide-react'
import { getUsers } from '../../services/team.service'
import PageHeader from '../../components/ui/PageHeader'
import Avatar from '../../components/ui/Avatar'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Modal from '../../components/ui/Modal'
import { formatDate } from '../../utils/format'
import { toast } from 'react-hot-toast'
import api from '../../services/api'

const ROLE_LABELS = { admin: 'Administrador', manager: 'Arquiteto', member: 'Estagiário' }
const ROLE_STYLES = {
  admin:   { background: 'rgb(170, 170, 170)', color: '#ffffff', border: '1px solid rgba(126, 126, 126, 0)' },
  manager: { background: 'rgba(8, 66, 90, 0.81)',  color: '#38BDF8', border: '1px solid rgba(56,189,248,0.20)' },
  member:  { background: 'rgb(170, 170, 170)', color: '#ffffff', border: '1px solid rgba(126, 126, 126, 0)' },
}

export default function TeamPage() {
  const [users,   setUsers]   = useState([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState({ name:'', email:'', password:'kronos123', role:'member', position:'', phone:'' })

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await getUsers({ search, limit: 100 })
      setUsers(data.data || [])
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [search])

  const handleCreate = async (e) => {
    e.preventDefault()
    try {
      await api.post('/auth/register', form)
      toast.success('Membro adicionado!')
      setShowNew(false)
      setForm({ name:'', email:'', password:'kronos123', role:'member', position:'', phone:'' })
      load()
    } catch (err) { toast.error(err.response?.data?.message || 'Erro ao criar membro') }
  }

  return (
    <div className="fade-in">
      <PageHeader
        title="Equipe"
        tag="Pessoas"
        subtitle="Gerencie os membros e colaboradores da organização"
        actions={
          <button onClick={() => setShowNew(true)} className="btn-primary">
            <Plus size={15} /> Novo Membro
          </button>
        }
      />

      {/* Busca + contador */}
      <div className="flex items-center gap-3 mb-7">
        <div
          className="relative flex-1 max-w-sm"
          style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input
            className="w-full bg-transparent pl-9 pr-4 py-2.5 text-sm outline-none"
            style={{ color: 'var(--text-primary)' }}
            placeholder="Buscar membro..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <span
          className="text-xs font-semibold px-3 py-2 rounded-xl"
          style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          {users.length} membros
        </span>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : users.length === 0 ? (
        <EmptyState icon={Users} title="Nenhum membro encontrado" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {users.map((u, idx) => (
            <Link
              key={u.id}
              to={`/app/team/${u.id}`}
              className="card card-hover p-6 flex flex-col gap-4"
              style={{ animationDelay: `${idx * 0.04}s` }}
            >
              <div className="flex items-start gap-4">
                <Avatar name={u.name} src={u.avatar_url} size="lg" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h3 className="font-bold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                      {u.name}
                    </h3>
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                      style={ROLE_STYLES[u.role]}
                    >
                      {ROLE_LABELS[u.role]}
                    </span>
                  </div>
                  <p className="text-xs truncate mb-2" style={{ color: 'var(--text-muted)' }}>
                    {u.position || 'Sem cargo definido'}
                  </p>
                </div>
              </div>

              <div
                className="space-y-2 pt-4"
                style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
              >
                <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                  <Mail size={11} /> <span className="truncate">{u.email}</span>
                </div>
                {u.phone && (
                  <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <Phone size={11} /> {u.phone}
                  </div>
                )}
                {u.admitted_at && (
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Desde {formatDate(u.admitted_at)}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      <Modal open={showNew} onClose={() => setShowNew(false)} title="Novo Membro" size="lg">
        <form onSubmit={handleCreate} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Nome *</label>
              <input className="input" required value={form.name}
                onChange={e => setForm({...form, name: e.target.value})} />
            </div>
            <div>
              <label className="label">E-mail *</label>
              <input type="email" className="input" required value={form.email}
                onChange={e => setForm({...form, email: e.target.value})} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Cargo</label>
              <input className="input" placeholder="Ex: Desenvolvedor" value={form.position}
                onChange={e => setForm({...form, position: e.target.value})} />
            </div>
            <div>
              <label className="label">Perfil</label>
              <select className="input" value={form.role}
                onChange={e => setForm({...form, role: e.target.value})}>
                <option value="member">Estagiário</option>
                <option value="manager">Arquiteto</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Telefone</label>
              <input className="input" value={form.phone}
                onChange={e => setForm({...form, phone: e.target.value})} />
            </div>
            <div>
              <label className="label">Senha inicial</label>
              <input className="input" value={form.password}
                onChange={e => setForm({...form, password: e.target.value})} />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <button type="button" onClick={() => setShowNew(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary">Adicionar Membro</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}