import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate }      from 'react-router-dom'
import {
  ArrowLeft, Edit, Upload, Users, Clock,
  DollarSign, CheckSquare, UserPlus, UserMinus,
  Paperclip, File, Save, ChevronDown, ChevronRight,
  Plus, Trash2, Check
} from 'lucide-react'
import {
  getProject, updateProject, uploadCover,
  addMember, removeMember, getProjectHistory,
  getStages, addPhase, updatePhase, deletePhase
} from '../../services/projects.service'
import { getUsers }        from '../../services/team.service'
import Spinner             from '../../components/ui/Spinner'
import Badge               from '../../components/ui/Badge'
import Avatar              from '../../components/ui/Avatar'
import ConfirmDialog       from '../../components/ui/ConfirmDialog'
import { formatCurrency, formatDate, statusLabel, statusColors, ACTIVE_PROJECT_STATUSES } from '../../utils/format'
import { toast }           from 'react-hot-toast'
import api                 from '../../services/api'
import useAuthStore        from '../../store/authStore'
import { can }             from '../../utils/permissions'

const TABS = [
  { label: 'Etapas',     icon: CheckSquare },
  { label: 'Equipe',     icon: Users       },
  { label: 'Arquivos',   icon: Paperclip   },
  { label: 'Timeline',   icon: Clock       },
]

// ── Componente de fase individual ─────────────────────────────────
function PhaseItem({ phase, projectId, stageId, onUpdate, onDelete, canEdit }) {
  const [editing,  setEditing]  = useState(false)
  const [form,     setForm]     = useState({ phase_name: phase.phase_name, comment: phase.comment || '' })
  const [saving,   setSaving]   = useState(false)

  const handleToggle = async () => {
    if (!canEdit) return
    try {
      await updatePhase(projectId, stageId, phase.id, { is_completed: !phase.is_completed })
      onUpdate()
    } catch { toast.error('Erro ao atualizar fase') }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await updatePhase(projectId, stageId, phase.id, form)
      setEditing(false)
      onUpdate()
      toast.success('Fase atualizada')
    } catch { toast.error('Erro ao salvar fase') }
    finally { setSaving(false) }
  }

  return (
    <div
      className="rounded-xl p-3 transition-all duration-150"
      style={{ background: '#FAFAFA', border: '1px solid #E5E7EB' }}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <button
          onClick={handleToggle}
          disabled={!canEdit}
          className="mt-0.5 shrink-0 h-5 w-5 rounded-md flex items-center justify-center transition-all duration-150"
          style={{
            background: phase.is_completed ? '#374151' : '#FFFFFF',
            border: `1px solid ${phase.is_completed ? '#374151' : '#D1D5DB'}`,
            cursor: canEdit ? 'pointer' : 'default'
          }}
        >
          {phase.is_completed && <Check size={12} className="text-white" />}
        </button>

        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="space-y-2">
              <input
                className="input text-sm py-1.5"
                value={form.phase_name}
                onChange={e => setForm({ ...form, phase_name: e.target.value })}
                placeholder="Nome da fase"
              />
              <textarea
                className="input text-sm py-1.5 resize-none"
                rows={2}
                value={form.comment}
                onChange={e => setForm({ ...form, comment: e.target.value })}
                placeholder="Comentário (opcional)"
              />
              <div className="flex gap-2">
                <button onClick={handleSave} disabled={saving} className="btn-primary text-xs py-1 px-3">
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
                <button onClick={() => setEditing(false)} className="btn-secondary text-xs py-1 px-3">
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <>
              <p
                className="text-sm font-medium"
                style={{
                  color: phase.is_completed ? 'var(--text-muted)' : 'var(--text-primary)',
                  textDecoration: phase.is_completed ? 'line-through' : 'none'
                }}
              >
                {phase.phase_name}
              </p>
              {phase.comment && (
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                  {phase.comment}
                </p>
              )}
              {phase.is_completed && phase.completed_by_name && (
                <p className="text-xs mt-1" style={{ color: 'rgba(55,65,81,0.65)' }}>
                  ✓ Concluído por {phase.completed_by_name}
                </p>
              )}
            </>
          )}
        </div>

        {canEdit && !editing && (
          <div className="flex gap-1 shrink-0">
            <button
              onClick={() => setEditing(true)}
              className="p-1.5 rounded-lg transition-all duration-150"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#E5E7EB'; e.currentTarget.style.color = '#374151' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
            >
              <Edit size={13} />
            </button>
            <button
              onClick={() => onDelete(phase.id)}
              className="p-1.5 rounded-lg transition-all duration-150"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(220,38,38,0.10)'; e.currentTarget.style.color = '#DC2626' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
            >
              <Trash2 size={13} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Componente de etapa ───────────────────────────────────────────
function StageItem({ stage, projectId, onUpdate, canEdit }) {
  const [expanded,    setExpanded]    = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newPhase,    setNewPhase]    = useState({ phase_name: '', comment: '' })
  const [adding,      setAdding]      = useState(false)
  const [deletingId,  setDeletingId]  = useState(null)

  const completedCount = stage.phases?.filter(p => p.is_completed).length || 0
  const totalCount     = stage.phases?.length || 0

  const handleAddPhase = async (e) => {
    e.preventDefault()
    if (!newPhase.phase_name.trim()) return toast.error('Informe o nome da fase')
    setAdding(true)
    try {
      await addPhase(projectId, stage.id, newPhase)
      setNewPhase({ phase_name: '', comment: '' })
      setShowAddForm(false)
      onUpdate()
      toast.success('Fase adicionada')
    } catch { toast.error('Erro ao adicionar fase') }
    finally { setAdding(false) }
  }

  const handleDeletePhase = async (phaseId) => {
    try {
      await deletePhase(projectId, stage.id, phaseId)
      setDeletingId(null)
      onUpdate()
      toast.success('Fase removida')
    } catch { toast.error('Erro ao remover fase') }
  }

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ border: '1px solid #E5E7EB' }}
    >
      {/* Header da etapa */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 transition-all duration-150"
        style={{ background: '#FAFAFA' }}
        onMouseEnter={e => e.currentTarget.style.background = '#F3F4F6'}
        onMouseLeave={e => e.currentTarget.style.background = '#FAFAFA'}
      >
        <div className="flex items-center gap-3">
          {expanded
            ? <ChevronDown size={16} style={{ color: '#6B7280' }} />
            : <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
          }
          <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
            {stage.stage_order}. {stage.stage_name}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {totalCount > 0 && (
            <span className="text-xs px-2.5 py-1 rounded-full font-semibold"
              style={{
                background: completedCount === totalCount ? 'rgba(22,163,74,0.10)' : '#F3F4F6',
                color:      completedCount === totalCount ? '#16A34A' : 'var(--text-muted)'
              }}>
              {completedCount}/{totalCount}
            </span>
          )}
        </div>
      </button>

      {/* Fases */}
      {expanded && (
        <div className="px-5 py-4 space-y-2.5"
          style={{ background: '#FFFFFF' }}>

          {stage.phases?.length === 0 && (
            <p className="text-xs text-center py-3" style={{ color: 'var(--text-muted)' }}>
              Nenhuma fase adicionada
            </p>
          )}

          {stage.phases?.map(phase => (
            <PhaseItem
              key={phase.id}
              phase={phase}
              projectId={projectId}
              stageId={stage.id}
              onUpdate={onUpdate}
              onDelete={(id) => setDeletingId(id)}
              canEdit={canEdit}
            />
          ))}

          {/* Formulário de nova fase */}
          {showAddForm && canEdit ? (
            <form onSubmit={handleAddPhase}
              className="p-3 rounded-xl space-y-2"
              style={{ background: '#F3F4F6', border: '1px solid #D1D5DB' }}>
              <input
                className="input text-sm py-1.5"
                placeholder="Nome da fase *"
                value={newPhase.phase_name}
                onChange={e => setNewPhase({ ...newPhase, phase_name: e.target.value })}
                required
              />
              <textarea
                className="input text-sm py-1.5 resize-none"
                rows={2}
                placeholder="Comentário (opcional)"
                value={newPhase.comment}
                onChange={e => setNewPhase({ ...newPhase, comment: e.target.value })}
              />
              <div className="flex gap-2">
                <button type="submit" disabled={adding} className="btn-primary text-xs py-1.5 px-3">
                  {adding ? 'Adicionando...' : 'Adicionar'}
                </button>
                <button type="button" onClick={() => setShowAddForm(false)} className="btn-secondary text-xs py-1.5 px-3">
                  Cancelar
                </button>
              </div>
            </form>
          ) : canEdit && (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150"
              style={{ color: 'var(--text-muted)', border: '1px dashed #D1D5DB' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#374151'; e.currentTarget.style.borderColor = 'rgba(55,65,81,0.30)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = '#D1D5DB' }}
            >
              <Plus size={13} /> Adicionar fase
            </button>
          )}
        </div>
      )}

      <ConfirmDialog
        open={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={() => handleDeletePhase(deletingId)}
        title="Remover fase"
        message="Deseja remover esta fase? Esta ação não pode ser desfeita."
        danger
      />
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────
export default function ProjectDetailPage() {
  const { id }     = useParams()
  const navigate   = useNavigate()
  const { user }   = useAuthStore()
  const role       = user?.role || 'member'
  const canEdit    = can(role, 'projects', 'edit')

  const [project,       setProject]      = useState(null)
  const [history,       setHistory]      = useState([])
  const [allUsers,      setAllUsers]     = useState([])
  const [stages,        setStages]       = useState([])
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
      const [p, h, u, s] = await Promise.all([
        getProject(id),
        getProjectHistory(id),
        getUsers({ limit: 200 }),
        getStages(id)
      ])
      setProject(p.data.project)
      setHistory(h.data.history || [])
      setAllUsers(u.data.data || [])
      setStages(s.data.stages || [])
      setForm({
        title:         p.data.project.title,
        client:        p.data.project.client        || '',
        description:   p.data.project.description   || '',
        status:        p.data.project.status,
        budget:        p.data.project.budget,
        expected_date: p.data.project.expected_date || '',
        start_date:    p.data.project.start_date    || '',
      })
      loadFiles()
    } catch { toast.error('Erro ao carregar projeto') }
    finally { setLoading(false) }
  }

  const loadFiles = async () => {
    try {
      const { data } = await api.get(`/projects/${id}/files`)
      setFiles(data.files || [])
    } catch { setFiles([]) }
  }

  const reloadStages = async () => {
    try {
      const { data } = await getStages(id)
      setStages(data.stages || [])
    } catch { /* silencioso */ }
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
    try { await addMember(id, userId); toast.success('Membro adicionado'); load() }
    catch { toast.error('Erro ao adicionar membro') }
  }

  const handleRemoveMember = async (userId) => {
    try { await removeMember(id, userId); toast.success('Membro removido'); setRemovingId(null); load() }
    catch { toast.error('Erro ao remover membro') }
  }

  const handleFileUpload = async (e) => {
  const file = e.target.files[0]
  if (!file) return
  setUploading(true)
  try {
    const fd = new FormData()
    fd.append('file', file)
    await api.post(`/projects/${id}/files`, fd)   // endpoint correto
    toast.success('Arquivo enviado!')
    loadFiles()
  } catch (err) {
    toast.error(err?.response?.data?.message || 'Erro ao enviar arquivo')
  } finally {
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }
}

  const nonMembers = allUsers.filter(u => !(project?.members || []).some(m => m.id === u.id))

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>
  if (!project) return null

  return (
    <div className="max-w-5xl mx-auto fade-in">
      <button onClick={() => navigate('/app/projects')}
        className="flex items-center gap-2 text-sm mb-5 transition-colors"
        style={{ color: 'var(--text-muted)' }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
        <ArrowLeft size={15} /> Voltar para Projetos
      </button>

      {/* Cover */}
      <div className="relative h-52 mb-6 group overflow-hidden" style={{ borderRadius: 24 }}>
        {project.cover_url
          ? <img src={project.cover_url} alt={project.title} className="w-full h-full object-cover" />
          : <div className="w-full h-full" style={{ background: 'linear-gradient(135deg, rgba(55,65,81,0.16), rgba(2,132,199,0.06))' }} />
        }
        <label className="absolute inset-0 flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          style={{ background: 'rgba(20,24,28,0.45)', backdropFilter: 'blur(4px)' }}>
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'rgba(55,65,81,0.85)', border: '1px solid rgba(31,41,55,0.6)' }}>
            <Upload size={15} /> Alterar capa
          </div>
          <input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
        </label>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
        <div className="flex-1">
          {editing
            ? <input className="input text-xl font-bold mb-2" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            : <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{project.title}</h1>
          }
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{project.client || 'Sem cliente'}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge className={statusColors[project.status]}>{statusLabel[project.status]}</Badge>
          {canEdit && (
            editing ? (
              <>
                <button onClick={handleSave} className="btn-primary"><Save size={14} /> Salvar</button>
                <button onClick={() => setEditing(false)} className="btn-secondary">Cancelar</button>
              </>
            ) : (
              <button onClick={() => setEditing(true)} className="btn-secondary">
                <Edit size={14} /> Editar
              </button>
            )
          )}
        </div>
      </div>

      {/* Stats — sem progresso */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
        {[
          {
            label: 'Orçamento',
            content: editing
              ? <input type="number" className="input py-1 text-sm" value={form.budget} onChange={e => setForm({...form, budget: e.target.value})} />
              : <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(project.budget)}</p>
          },
          {
            label: 'Início',
            content: editing
              ? <input type="date" className="input py-1 text-sm" value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} />
              : <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{formatDate(project.start_date)}</p>
          },
          {
            label: 'Previsão',
            content: editing
              ? <input type="date" className="input py-1 text-sm" value={form.expected_date} onChange={e => setForm({...form, expected_date: e.target.value})} />
              : <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{formatDate(project.expected_date)}</p>
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

      {/* Status em edição */}
      {editing && (
        <div className="card p-5 mb-6">
          <label className="label">Status do projeto</label>
          <select className="input" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
            {ACTIVE_PROJECT_STATUSES.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      )}

      {/* Descrição em edição */}
      {editing && (
        <div className="card p-5 mb-6">
          <label className="label">Descrição</label>
          <textarea rows={4} className="input resize-none" value={form.description}
            onChange={e => setForm({...form, description: e.target.value})} />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-2xl"
        style={{ background: '#F3F4F6', border: '1px solid #E5E7EB', display: 'inline-flex' }}>
        {TABS.map(({ label, icon: Icon }, i) => (
          <button key={i} onClick={() => setTab(i)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-150"
            style={tab === i
              ? { background: '#FFFFFF', color: '#374151', border: '1px solid #D1D5DB' }
              : { color: 'var(--text-muted)', background: 'transparent', border: '1px solid transparent' }
            }>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* Tab 0: Etapas */}
      {tab === 0 && (
        <div className="space-y-3">
          {!editing && project.description && (
            <div className="card p-5 mb-2">
              <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Descrição</p>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{project.description}</p>
            </div>
          )}
          {stages.length === 0
            ? <div className="flex justify-center py-10"><Spinner /></div>
            : stages.map(stage => (
                <StageItem
                  key={stage.id}
                  stage={stage}
                  projectId={id}
                  onUpdate={reloadStages}
                  canEdit={canEdit}
                />
              ))
          }
        </div>
      )}

      {/* Tab 1: Equipe */}
      {tab === 1 && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Membros ({(project.members || []).length})
            </h3>
            {canEdit && (
              <button onClick={() => setShowAddMember(!showAddMember)} className="btn-secondary text-xs py-1.5 px-3">
                <UserPlus size={13} /> Adicionar
              </button>
            )}
          </div>
          {showAddMember && (
            <div className="mb-5 p-4 rounded-2xl"
              style={{ background: '#F3F4F6', border: '1px solid #D1D5DB' }}>
              <p className="text-xs font-semibold mb-3" style={{ color: '#374151' }}>Selecione para adicionar:</p>
              {nonMembers.length === 0
                ? <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Todos os membros já estão no projeto.</p>
                : <div className="flex flex-wrap gap-2">
                    {nonMembers.map(u => (
                      <button key={u.id}
                        onClick={() => { handleAddMember(u.id); setShowAddMember(false) }}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150"
                        style={{ background: '#FFFFFF', color: 'var(--text-secondary)', border: '1px solid #E5E7EB' }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#F3F4F6'; e.currentTarget.style.color = '#374151' }}
                        onMouseLeave={e => { e.currentTarget.style.background = '#FFFFFF'; e.currentTarget.style.color = 'var(--text-secondary)' }}>
                        <Avatar name={u.name} size="sm" /> {u.name}
                      </button>
                    ))}
                  </div>
              }
            </div>
          )}
          <div className="space-y-3">
            {(project.members || []).length === 0 && (
              <p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>Nenhum membro adicionado</p>
            )}
            {(project.members || []).map(m => (
              <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl"
                style={{ background: '#FAFAFA', border: '1px solid #E5E7EB' }}>
                <Avatar name={m.name} src={m.avatar_url} />
                <div className="flex-1">
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{m.name}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{m.position || m.role}</p>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full font-semibold"
                  style={{ background: 'rgba(55,65,81,0.08)', color: '#374151' }}>{m.role}</span>
                {canEdit && (
                  <button onClick={() => setRemovingId(m.id)}
                    className="p-1.5 rounded-lg transition-all duration-150 ml-1"
                    style={{ color: 'var(--text-muted)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(220,38,38,0.10)'; e.currentTarget.style.color = '#DC2626' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}>
                    <UserMinus size={14} />
                  </button>
                )}
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
              <input ref={fileRef} type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
            </label>
          </div>
          {files.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 rounded-2xl"
              style={{ border: '1px dashed #D1D5DB' }}>
              <Paperclip size={28} style={{ color: '#D1D5DB', marginBottom: 10 }} />
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Nenhum arquivo anexado</p>
            </div>
          ) : (
            <div className="space-y-2">
              {files.map(f => (
  <div
    key={f.id}
    className="flex items-center gap-3 p-3 rounded-xl"
    style={{
      background: '#FAFAFA',
      border: '1px solid #E5E7EB'
    }}
  >
    <File size={16} style={{ color: '#374151' }} />

    <div className="flex-1 min-w-0">
      <p
        className="text-sm font-medium truncate"
        style={{ color: 'var(--text-primary)' }}
      >
        {f.file_name}
      </p>

      <p
        className="text-xs"
        style={{ color: 'var(--text-muted)' }}
      >
        {f.uploaded_by_name} · {formatDate(f.created_at)}
      </p>
    </div>

    {/* era f.file_url */}
    {f.drive_url && (
      <a
        href={f.drive_url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs px-2.5 py-1 rounded-lg font-semibold"
        style={{
          background: 'rgba(55,65,81,0.08)',
          color: '#374151'
        }}
      >
        Abrir
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
            <div className="absolute left-0 top-0 bottom-0 w-px" style={{ background: 'rgba(55,65,81,0.18)' }} />
            <div className="space-y-5">
              {history.length === 0 && (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Nenhum histórico disponível.</p>
              )}
              {history.map((h, i) => (
                <div key={i} className="relative">
                  <div className="absolute -left-7 top-1 h-3 w-3 rounded-full"
                    style={{ background: '#374151', boxShadow: '0 0 10px rgba(55,65,81,0.40)' }} />
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {h.from_status ? `${statusLabel[h.from_status]} → ` : 'Criado como '}
                    <span style={{ color: '#374151' }}>{statusLabel[h.to_status]}</span>
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    por {h.changed_by_name} · {formatDate(h.changed_at)}
                  </p>
                  {h.note && <p className="text-xs mt-1 italic" style={{ color: 'var(--text-muted)' }}>{h.note}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!removingId} onClose={() => setRemovingId(null)}
        onConfirm={() => handleRemoveMember(removingId)}
        title="Remover membro"
        message="Deseja remover este membro do projeto?"
        danger
      />
    </div>
  )
}