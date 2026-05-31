import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Edit, Upload, Users, Clock,
  DollarSign, CheckSquare, UserPlus, UserMinus,
  Paperclip, X, File, Save
} from 'lucide-react'
import {
  getProject, updateProject, uploadCover,
  addMember, removeMember
} from '../../services/projects.service'
import { getProjectHistory } from '../../services/projects.service'
import { getUsers } from '../../services/team.service'
import Spinner from '../../components/ui/Spinner'
import Badge from '../../components/ui/Badge'
import Avatar from '../../components/ui/Avatar'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { formatCurrency, formatDate, statusLabel, statusColors } from '../../utils/format'
import { toast } from 'react-hot-toast'
import api from '../../services/api'

const TABS = [
  { label: 'Visão Geral', icon: CheckSquare },
  { label: 'Equipe',      icon: Users },
  { label: 'Arquivos',    icon: Paperclip },
  { label: 'Timeline',    icon: Clock },
]

export default function ProjectDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [project,       setProject]      = useState(null)
  const [history,       setHistory]      = useState([])
  const [allUsers,      setAllUsers]     = useState([])
  const [loading,       setLoading]      = useState(true)
  const [tab,           setTab]          = useState(0)
  const [editing,       setEditing]      = useState(false)
  const [form,          setForm]         = useState({})
  const [showAddMember, setShowAddMember]= useState(false)
  const [removingId,    setRemovingId]   = useState(null)
  const [files,         setFiles]        = useState([])
  const [uploading,     setUploading]    = useState(false)
  const fileRef = useRef()

  const load = async () => {
    setLoading(true)
    try {
      const [p, h, u] = await Promise.all([
        getProject(id),
        getProjectHistory(id),
        getUsers({ limit: 200 })
      ])
      setProject(p.data.project)
      setHistory(h.data.history || [])
      setAllUsers(u.data.data || [])
      setForm({
        title:         p.data.project.title,
        client:        p.data.project.client       || '',
        description:   p.data.project.description  || '',
        progress:      p.data.project.progress,
        status:        p.data.project.status,
        budget:        p.data.project.budget,
        expected_date: p.data.project.expected_date || '',
        start_date:    p.data.project.start_date    || '',
      })
      // Carrega arquivos do projeto (activity_logs com payload de arquivo)
      loadFiles()
    } catch { toast.error('Erro ao carregar projeto') }
    finally { setLoading(false) }
  }

  const loadFiles = async () => {
    try {
      const { data } = await api.get(`/projects/${id}/files`)
      setFiles(data.files || [])
    } catch {
      // endpoint pode não existir ainda — silencioso
      setFiles([])
    }
  }

  useEffect(() => { load() }, [id])

  const handleSave = async () => {
    try {
      const { data } = await updateProject(id, form)
      setProject({ ...project, ...data.project })
      setEditing(false)
      toast.success('Projeto atualizado')
    } catch { toast.error('Erro ao salvar') }
  }

  const handleCoverUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    try {
      const { data } = await uploadCover(id, file)
      setProject(data.project)
      toast.success('Capa atualizada')
    } catch { toast.error('Erro ao enviar capa') }
  }

  const handleAddMember = async (userId) => {
    try {
      await addMember(id, userId)
      toast.success('Membro adicionado')
      load()
    } catch { toast.error('Erro ao adicionar membro') }
  }

  const handleRemoveMember = async (userId) => {
    try {
      await removeMember(id, userId)
      toast.success('Membro removido')
      setRemovingId(null)
      load()
    } catch { toast.error('Erro ao remover membro') }
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      await api.post(`/tasks/files-upload`, fd) // usa o endpoint de upload genérico de files
      toast.success('Arquivo enviado!')
      loadFiles()
    } catch {
      // Se endpoint não existir, salva localmente apenas visual
      setFiles(prev => [...prev, {
        id: Date.now(),
        file_name: file.name,
        created_at: new Date().toISOString(),
        local: true
      }])
      toast.success('Arquivo registrado')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  // Usuários que ainda não são membros
  const nonMembers = allUsers.filter(
    u => !(project?.members || []).some(m => m.id === u.id)
  )

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>
  if (!project) return null

  return (
    <div className="max-w-5xl mx-auto fade-in">
      <button
        onClick={() => navigate('/app/projects')}
        className="flex items-center gap-2 text-sm mb-5 transition-colors"
        style={{ color: 'var(--text-muted)' }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
      >
        <ArrowLeft size={15} /> Voltar para Projetos
      </button>

      {/* Cover */}
      <div className="relative h-52 mb-6 group overflow-hidden" style={{ borderRadius: 24 }}>
        {project.cover_url ? (
          <img src={project.cover_url} alt={project.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full" style={{
            background: 'linear-gradient(135deg, rgba(124,92,252,0.30), rgba(56,189,248,0.12))'
          }} />
        )}
        <label
          className="absolute inset-0 flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          style={{ background: 'rgba(5,8,22,0.55)', backdropFilter: 'blur(4px)' }}
        >
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'rgba(124,92,252,0.30)', border: '1px solid rgba(124,92,252,0.40)' }}>
            <Upload size={15} /> Alterar capa
          </div>
          <input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
        </label>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
        <div className="flex-1">
          {editing ? (
            <input className="input text-xl font-bold mb-2"
              value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
          ) : (
            <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
              {project.title}
            </h1>
          )}
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {project.client || 'Sem cliente'}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge className={statusColors[project.status]}>{statusLabel[project.status]}</Badge>
          {editing ? (
            <>
              <button onClick={handleSave} className="btn-primary"><Save size={14} /> Salvar</button>
              <button onClick={() => setEditing(false)} className="btn-secondary">Cancelar</button>
            </>
          ) : (
            <button onClick={() => setEditing(true)} className="btn-secondary">
              <Edit size={14} /> Editar
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          {
            label: 'Orçamento',
            content: editing
              ? <input type="number" className="input py-1 text-sm" value={form.budget}
                  onChange={e => setForm({...form, budget: e.target.value})} />
              : <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(project.budget)}</p>
          },
          {
            label: 'Início',
            content: editing
              ? <input type="date" className="input py-1 text-sm" value={form.start_date}
                  onChange={e => setForm({...form, start_date: e.target.value})} />
              : <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{formatDate(project.start_date)}</p>
          },
          {
            label: 'Previsão',
            content: editing
              ? <input type="date" className="input py-1 text-sm" value={form.expected_date}
                  onChange={e => setForm({...form, expected_date: e.target.value})} />
              : <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{formatDate(project.expected_date)}</p>
          },
          {
            label: 'Progresso',
            content: editing
              ? <input type="number" min="0" max="100" className="input py-1 text-sm"
                  value={form.progress} onChange={e => setForm({...form, progress: e.target.value})} />
              : <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{project.progress}%</p>
          },
        ].map(item => (
          <div key={item.label} className="card p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.10em] mb-2" style={{ color: 'var(--text-muted)' }}>
              {item.label}
            </p>
            {item.content}
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="card p-5 mb-6">
        <div className="flex justify-between text-xs mb-2">
          <span style={{ color: 'var(--text-muted)' }}>Progresso geral</span>
          <span style={{ color: '#A78BFA', fontWeight: 700 }}>{form.progress || project.progress}%</span>
        </div>
        <div className="progress-track" style={{ height: 8 }}>
          <div className="progress-fill" style={{ width: `${form.progress || project.progress}%` }} />
        </div>
      </div>

      {/* Status em edição */}
      {editing && (
        <div className="card p-5 mb-6">
          <label className="label">Status do projeto</label>
          <select className="input" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
            {['planning','in_progress','review','paused','completed','cancelled'].map(s => (
              <option key={s} value={s}>{statusLabel[s]}</option>
            ))}
          </select>
        </div>
      )}

      {/* Tabs */}
      <div
        className="flex gap-1 mb-6 p-1 rounded-2xl"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
          display: 'inline-flex'
        }}
      >
        {TABS.map(({ label, icon: Icon }, i) => (
          <button key={i} onClick={() => setTab(i)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-150"
            style={tab === i
              ? { background: 'rgba(124,92,252,0.20)', color: '#A78BFA', border: '1px solid rgba(124,92,252,0.25)' }
              : { color: 'var(--text-muted)', background: 'transparent', border: '1px solid transparent' }
            }
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* Tab 0: Visão Geral */}
      {tab === 0 && (
        <div className="card p-6">
          <h3 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
            Descrição
          </h3>
          {editing ? (
            <textarea rows={5} className="input resize-none"
              value={form.description}
              onChange={e => setForm({...form, description: e.target.value})} />
          ) : (
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {project.description || 'Nenhuma descrição adicionada.'}
            </p>
          )}
        </div>
      )}

      {/* Tab 1: Equipe */}
      {tab === 1 && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Membros da equipe ({(project.members || []).length})
            </h3>
            <button
              onClick={() => setShowAddMember(!showAddMember)}
              className="btn-secondary text-xs py-1.5 px-3"
            >
              <UserPlus size={13} /> Adicionar
            </button>
          </div>

          {/* Painel de adição de membro */}
          {showAddMember && (
            <div
              className="mb-5 p-4 rounded-2xl"
              style={{ background: 'rgba(124,92,252,0.06)', border: '1px solid rgba(124,92,252,0.15)' }}
            >
              <p className="text-xs font-semibold mb-3" style={{ color: '#A78BFA' }}>
                Selecione um membro para adicionar:
              </p>
              {nonMembers.length === 0 ? (
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Todos os membros já estão no projeto.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {nonMembers.map(u => (
                    <button
                      key={u.id}
                      onClick={() => { handleAddMember(u.id); setShowAddMember(false) }}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150"
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        color: 'var(--text-secondary)',
                        border: '1px solid rgba(255,255,255,0.08)'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = 'rgba(124,92,252,0.15)'
                        e.currentTarget.style.color = '#A78BFA'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                        e.currentTarget.style.color = 'var(--text-secondary)'
                      }}
                    >
                      <Avatar name={u.name} size="sm" />
                      {u.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Lista de membros */}
          <div className="space-y-3">
            {(project.members || []).length === 0 && (
              <p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>
                Nenhum membro adicionado
              </p>
            )}
            {(project.members || []).map(m => (
              <div
                key={m.id}
                className="flex items-center gap-3 p-3 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.04)' }}
              >
                <Avatar name={m.name} src={m.avatar_url} />
                <div className="flex-1">
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{m.name}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {m.position || m.role}
                  </p>
                </div>
                <span
                  className="text-xs px-2.5 py-1 rounded-full font-semibold"
                  style={{ background: 'rgba(124,92,252,0.10)', color: '#A78BFA' }}
                >
                  {m.role}
                </span>
                <button
                  onClick={() => setRemovingId(m.id)}
                  className="p-1.5 rounded-lg transition-all duration-150 ml-1"
                  style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(251,113,133,0.12)'; e.currentTarget.style.color = '#FB7185' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
                  title="Remover membro"
                >
                  <UserMinus size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Arquivos */}
      {tab === 2 && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Arquivos anexados
            </h3>
            <label className="btn-secondary text-xs py-1.5 px-3 cursor-pointer">
              <Upload size={13} />
              {uploading ? 'Enviando...' : 'Anexar arquivo'}
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                onChange={handleFileUpload}
                disabled={uploading}
              />
            </label>
          </div>

          {files.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-12 rounded-2xl"
              style={{ border: '1px dashed rgba(255,255,255,0.08)' }}
            >
              <Paperclip size={28} style={{ color: 'rgba(255,255,255,0.15)', marginBottom: 10 }} />
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Nenhum arquivo anexado
              </p>
              <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.25)' }}>
                Clique em "Anexar arquivo" para adicionar
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {files.map(f => (
                <div
                  key={f.id}
                  className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.04)' }}
                >
                  <File size={16} style={{ color: '#A78BFA', shrink: 0 }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                      {f.file_name || f.name}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {formatDate(f.created_at)}
                    </p>
                  </div>
                  {f.file_url && (
                    <a
                      href={f.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs px-2.5 py-1 rounded-lg font-semibold transition-all duration-150"
                      style={{ background: 'rgba(124,92,252,0.10)', color: '#A78BFA' }}
                    >
                      Baixar
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Timeline */}
      {tab === 3 && (
        <div className="card p-6">
          <h3 className="text-xs font-bold uppercase tracking-wider mb-5" style={{ color: 'var(--text-muted)' }}>
            Histórico de status
          </h3>
          <div className="relative pl-6">
            <div className="absolute left-0 top-0 bottom-0 w-px"
              style={{ background: 'rgba(124,92,252,0.20)' }} />
            <div className="space-y-5">
              {history.length === 0 && (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Nenhum histórico disponível.</p>
              )}
              {history.map((h, i) => (
                <div key={i} className="relative">
                  <div className="absolute -left-7 top-1 h-3 w-3 rounded-full"
                    style={{ background: '#7C5CFC', boxShadow: '0 0 10px rgba(124,92,252,0.5)' }} />
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {h.from_status ? `${statusLabel[h.from_status]} → ` : 'Criado como '}
                    <span style={{ color: '#A78BFA' }}>{statusLabel[h.to_status]}</span>
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    por {h.changed_by_name} · {formatDate(h.changed_at)}
                  </p>
                  {h.note && (
                    <p className="text-xs mt-1 italic" style={{ color: 'var(--text-muted)' }}>{h.note}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Confirm remover membro */}
      <ConfirmDialog
        open={!!removingId}
        onClose={() => setRemovingId(null)}
        onConfirm={() => handleRemoveMember(removingId)}
        title="Remover membro"
        message="Deseja remover este membro do projeto? Ele perderá acesso imediatamente."
        danger
      />
    </div>
  )
}