import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate }      from 'react-router-dom'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import {
  ArrowLeft, Edit, Upload, Users, Clock,
  DollarSign, CheckSquare, UserPlus, UserMinus,
  Paperclip, File, Save, ChevronDown, ChevronRight,
  Plus, Trash2, Check, GripVertical, MessageSquare
} from 'lucide-react'
import {
  getProject, updateProject, uploadCover,
  addMember, removeMember, getProjectHistory,
  getStages, createStage, updateStage, deleteStage, reorderStages,
  addPhase, updatePhase, deletePhase, reorderPhases,
  addPhaseComment, updatePhaseComment, deletePhaseComment,
  uploadPhaseAttachment, deletePhaseAttachment,
} from '../../services/projects.service'
import { getUsers }        from '../../services/team.service'
import { getAllClients, updateClient } from '../../services/clients.service'
import Spinner              from '../../components/ui/Spinner'
import Badge                from '../../components/ui/Badge'
import Avatar                from '../../components/ui/Avatar'
import ConfirmDialog        from '../../components/ui/ConfirmDialog'
import { formatCurrency, formatDate, statusLabel, statusColors, ACTIVE_PROJECT_STATUSES } from '../../utils/format'
import { toast }           from 'react-hot-toast'
import api                 from '../../services/api'
import useAuthStore        from '../../store/authStore'
import { can }             from '../../utils/permissions'
import { canManageItem, hasFullAccess } from '../../utils/projectItemPermissions'

const TABS = [
  { label: 'Etapas',     icon: CheckSquare },
  { label: 'Equipe',     icon: Users       },
  { label: 'Arquivos',   icon: Paperclip   },
  { label: 'Timeline',   icon: Clock       },
]

// ── Comentário individual (histórico da fase) ─────────────────────
function PhaseCommentItem({ comment, projectId, stageId, phaseId, onUpdate, user }) {
  const [editing, setEditing] = useState(false)
  const [text,    setText]    = useState(comment.content)
  const [saving,  setSaving]  = useState(false)

  const canManage = canManageItem(comment.user_id, user)

  const handleSave = async () => {
    if (!text.trim()) return toast.error('Comentário não pode ser vazio')
    setSaving(true)
    try {
      await updatePhaseComment(projectId, stageId, phaseId, comment.id, text.trim())
      setEditing(false)
      onUpdate()
    } catch { toast.error('Erro ao editar comentário') }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    try {
      await deletePhaseComment(projectId, stageId, phaseId, comment.id)
      onUpdate()
      toast.success('Comentário removido')
    } catch { toast.error('Erro ao remover comentário') }
  }

  return (
    <div className="p-2.5 rounded-lg" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
      <div className="flex items-center justify-between mb-1 gap-2">
        <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
          {comment.author_name}
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            {formatDate(comment.created_at)}
          </p>
          {canManage && !editing && (
            <div className="flex gap-1.5">
              <button onClick={() => setEditing(true)} style={{ color: 'var(--text-muted)' }}>
                <Edit size={11} />
              </button>
              <button onClick={handleDelete} style={{ color: 'var(--text-muted)' }}>
                <Trash2 size={11} />
              </button>
            </div>
          )}
        </div>
      </div>
      {editing ? (
        <div className="space-y-1.5">
          <textarea
            className="input text-xs py-1.5 resize-none"
            rows={2}
            value={text}
            onChange={e => setText(e.target.value)}
          />
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving} className="btn-primary text-[11px] py-1 px-2">
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
            <button
              onClick={() => { setEditing(false); setText(comment.content) }}
              className="btn-secondary text-[11px] py-1 px-2"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{comment.content}</p>
      )}
    </div>
  )
}

// ── Anexo individual da fase ───────────────────────────────────────
function PhaseAttachmentItem({ attachment, projectId, stageId, phaseId, onUpdate, user }) {
  const canManage = canManageItem(attachment.uploaded_by, user)

  const handleDelete = async () => {
    try {
      await deletePhaseAttachment(projectId, stageId, phaseId, attachment.id)
      onUpdate()
      toast.success('Anexo removido')
    } catch { toast.error('Erro ao remover anexo') }
  }

  return (
    <div className="flex items-center gap-2 p-2 rounded-lg" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
      <File size={13} style={{ color: 'var(--text-primary)' }} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
          {attachment.file_name}
        </p>
        <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
          {attachment.uploaded_by_name} · {formatDate(attachment.created_at)}
        </p>
      </div>
      {attachment.url && (
        <a
          href={attachment.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] px-2 py-0.5 rounded font-semibold shrink-0"
          style={{ background: 'rgba(55,65,81,0.08)', color: 'var(--text-primary)' }}
        >
          Abrir
        </a>
      )}
      {canManage && (
        <button onClick={handleDelete} className="shrink-0" style={{ color: 'var(--text-muted)' }}>
          <Trash2 size={12} />
        </button>
      )}
    </div>
  )
}

// ── Componente de fase individual ─────────────────────────────────
function PhaseItem({ phase, index, projectId, stageId, onUpdate, onDelete, canManageProjectItems, user }) {
  const [editing,      setEditing]      = useState(false)
  const [name,         setName]         = useState(phase.phase_name)
  const [saving,       setSaving]       = useState(false)
  const [newComment,   setNewComment]   = useState('')
  const [addingComment,setAddingComment]= useState(false)
  const [uploading,    setUploading]    = useState(false)
  const fileRef = useRef()

  const canDeletePhase = canManageItem(phase.created_by, user)

  const handleToggle = async () => {
    if (!canManageProjectItems) return
    try {
      await updatePhase(projectId, stageId, phase.id, { is_completed: !phase.is_completed })
      onUpdate()
    } catch { toast.error('Erro ao atualizar fase') }
  }

  const handleSaveName = async () => {
    if (!name.trim()) return toast.error('Informe o nome da fase')
    setSaving(true)
    try {
      await updatePhase(projectId, stageId, phase.id, { phase_name: name.trim() })
      setEditing(false)
      onUpdate()
      toast.success('Fase atualizada')
    } catch { toast.error('Erro ao salvar fase') }
    finally { setSaving(false) }
  }

  const handleAddComment = async (e) => {
    e.preventDefault()
    if (!newComment.trim()) return
    setAddingComment(true)
    try {
      await addPhaseComment(projectId, stageId, phase.id, newComment.trim())
      setNewComment('')
      onUpdate()
    } catch { toast.error('Erro ao adicionar comentário') }
    finally { setAddingComment(false) }
  }

  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    try {
      await uploadPhaseAttachment(projectId, stageId, phase.id, file)
      onUpdate()
      toast.success('Arquivo anexado')
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Erro ao anexar arquivo')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <Draggable draggableId={phase.id} index={index} isDragDisabled={!canManageProjectItems}>
      {(provided) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className="rounded-xl p-3 transition-all duration-150"
          style={{ ...provided.draggableProps.style, background: 'var(--bg-surface-2)', border: '1px solid var(--border-subtle)' }}
        >
          <div className="flex items-start gap-3">
            {canManageProjectItems && (
              <span {...provided.dragHandleProps} className="mt-1 shrink-0 cursor-grab" style={{ color: 'var(--border-medium)' }}>
                <GripVertical size={14} />
              </span>
            )}

            <button
              onClick={handleToggle}
              disabled={!canManageProjectItems}
              className="mt-0.5 shrink-0 h-5 w-5 rounded-md flex items-center justify-center transition-all duration-150"
              style={{
                background: phase.is_completed ? 'var(--brand-slate)' : 'var(--bg-surface)',
                border: `1px solid ${phase.is_completed ? 'var(--brand-slate)' : 'var(--border-medium)'}`,
                cursor: canManageProjectItems ? 'pointer' : 'default'
              }}
            >
              {phase.is_completed && <Check size={12} className="text-white" />}
            </button>

            <div className="flex-1 min-w-0">
              {editing ? (
                <div className="space-y-2">
                  <input
                    className="input text-sm py-1.5"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Nome da fase"
                  />
                  <div className="flex gap-2">
                    <button onClick={handleSaveName} disabled={saving} className="btn-primary text-xs py-1 px-3">
                      {saving ? 'Salvando...' : 'Salvar'}
                    </button>
                    <button
                      onClick={() => { setEditing(false); setName(phase.phase_name) }}
                      className="btn-secondary text-xs py-1 px-3"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <p
                  className="text-sm font-medium"
                  style={{
                    color: phase.is_completed ? 'var(--text-muted)' : 'var(--text-primary)',
                    textDecoration: phase.is_completed ? 'line-through' : 'none'
                  }}
                >
                  {phase.phase_name}
                </p>
              )}
              {phase.is_completed && phase.completed_by_name && (
                <p className="text-xs mt-1" style={{ color: 'rgba(55,65,81,0.65)' }}>
                  ✓ Concluído por {phase.completed_by_name}
                </p>
              )}
            </div>

            {canManageProjectItems && !editing && (
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => setEditing(true)}
                  className="p-1.5 rounded-lg transition-all duration-150"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <Edit size={13} />
                </button>
                {canDeletePhase && (
                  <button
                    onClick={() => onDelete(phase.id)}
                    className="p-1.5 rounded-lg transition-all duration-150"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Comentários (histórico: autor, data e hora) */}
          <div className="mt-3 pl-8 space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
              <MessageSquare size={11} /> Comentários ({phase.comments?.length || 0})
            </p>
            {phase.comments?.map(c => (
              <PhaseCommentItem
                key={c.id} comment={c} projectId={projectId} stageId={stageId}
                phaseId={phase.id} onUpdate={onUpdate} user={user}
              />
            ))}
            {canManageProjectItems && (
              <form onSubmit={handleAddComment} className="flex gap-2">
                <input
                  className="input text-xs py-1.5 flex-1"
                  placeholder="Adicionar comentário..."
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                />
                <button type="submit" disabled={addingComment} className="btn-secondary text-xs py-1 px-2.5">
                  {addingComment ? '...' : 'Enviar'}
                </button>
              </form>
            )}
          </div>

          {/* Anexos */}
          <div className="mt-3 pl-8 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                <Paperclip size={11} /> Arquivos ({phase.attachments?.length || 0})
              </p>
              {canManageProjectItems && (
                <label className="text-[11px] font-semibold cursor-pointer flex items-center gap-1" style={{ color: 'var(--text-primary)' }}>
                  <Upload size={11} /> {uploading ? 'Enviando...' : 'Anexar'}
                  <input ref={fileRef} type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
                </label>
              )}
            </div>
            {phase.attachments?.map(a => (
              <PhaseAttachmentItem
                key={a.id} attachment={a} projectId={projectId} stageId={stageId}
                phaseId={phase.id} onUpdate={onUpdate} user={user}
              />
            ))}
          </div>
        </div>
      )}
    </Draggable>
  )
}

// ── Componente de etapa ───────────────────────────────────────────
function StageItem({ stage, index, projectId, onUpdate, onDeleteStage, canManageProjectItems, user }) {
  const [expanded,     setExpanded]     = useState(false)
  const [editingName,  setEditingName]  = useState(false)
  const [stageName,    setStageName]    = useState(stage.stage_name)
  const [savingName,   setSavingName]   = useState(false)
  const [showAddForm,  setShowAddForm]  = useState(false)
  const [newPhaseName, setNewPhaseName] = useState('')
  const [adding,       setAdding]       = useState(false)
  const [deletingPhaseId, setDeletingPhaseId] = useState(null)

  const completedCount = stage.phases?.filter(p => p.is_completed).length || 0
  const totalCount     = stage.phases?.length || 0
  const canDeleteStage  = canManageItem(stage.created_by, user)

  const handleSaveName = async () => {
    if (!stageName.trim()) return toast.error('Informe o nome da etapa')
    setSavingName(true)
    try {
      await updateStage(projectId, stage.id, { stage_name: stageName.trim() })
      setEditingName(false)
      onUpdate()
      toast.success('Etapa atualizada')
    } catch { toast.error('Erro ao salvar etapa') }
    finally { setSavingName(false) }
  }

  const handleAddPhase = async (e) => {
    e.preventDefault()
    if (!newPhaseName.trim()) return toast.error('Informe o nome da fase')
    setAdding(true)
    try {
      await addPhase(projectId, stage.id, { phase_name: newPhaseName.trim() })
      setNewPhaseName('')
      setShowAddForm(false)
      onUpdate()
      toast.success('Fase adicionada')
    } catch { toast.error('Erro ao adicionar fase') }
    finally { setAdding(false) }
  }

  const handleDeletePhase = async (phaseId) => {
    try {
      await deletePhase(projectId, stage.id, phaseId)
      setDeletingPhaseId(null)
      onUpdate()
      toast.success('Fase removida')
    } catch { toast.error('Erro ao remover fase') }
  }

  return (
    <Draggable draggableId={stage.id} index={index} isDragDisabled={!canManageProjectItems}>
      {(provided) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className="rounded-2xl overflow-hidden"
          style={{ ...provided.draggableProps.style, border: '1px solid var(--border-subtle)' }}
        >
          <div className="w-full flex items-center justify-between px-5 py-4" style={{ background: 'var(--bg-surface-2)' }}>
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {canManageProjectItems && (
                <span {...provided.dragHandleProps} className="cursor-grab shrink-0" style={{ color: 'var(--border-medium)' }}>
                  <GripVertical size={15} />
                </span>
              )}
              <button onClick={() => setExpanded(!expanded)} className="shrink-0">
                {expanded
                  ? <ChevronDown size={16} style={{ color: 'var(--text-secondary)' }} />
                  : <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
                }
              </button>

              {editingName ? (
                <div className="flex items-center gap-2 flex-1">
                  <input className="input text-sm py-1 flex-1" value={stageName} onChange={e => setStageName(e.target.value)} />
                  <button onClick={handleSaveName} disabled={savingName} className="btn-primary text-xs py-1 px-2">
                    {savingName ? '...' : 'Salvar'}
                  </button>
                  <button
                    onClick={() => { setEditingName(false); setStageName(stage.stage_name) }}
                    className="btn-secondary text-xs py-1 px-2"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <span className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                  {stage.stage_order}. {stage.stage_name}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {totalCount > 0 && (
                <span
                  className="text-xs px-2.5 py-1 rounded-full font-semibold"
                  style={{
                    background: completedCount === totalCount ? 'rgba(22,163,74,0.10)' : 'var(--bg-hover)',
                    color:      completedCount === totalCount ? '#16A34A' : 'var(--text-muted)'
                  }}
                >
                  {completedCount}/{totalCount}
                </span>
              )}
              {canManageProjectItems && !editingName && (
                <button onClick={() => setEditingName(true)} className="p-1 rounded-lg" style={{ color: 'var(--text-muted)' }}>
                  <Edit size={13} />
                </button>
              )}
              {canDeleteStage && (
                <button onClick={() => onDeleteStage(stage.id)} className="p-1 rounded-lg" style={{ color: 'var(--text-muted)' }}>
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          </div>

          {expanded && (
            <div className="px-5 py-4 space-y-2.5" style={{ background: 'var(--bg-surface)' }}>
              <Droppable droppableId={`phases-${stage.id}`} type="PHASE">
                {(dropProvided) => (
                  <div ref={dropProvided.innerRef} {...dropProvided.droppableProps} className="space-y-2.5">
                    {stage.phases?.length === 0 && (
                      <p className="text-xs text-center py-3" style={{ color: 'var(--text-muted)' }}>
                        Nenhuma fase adicionada
                      </p>
                    )}
                    {stage.phases?.map((phase, i) => (
                      <PhaseItem
                        key={phase.id}
                        phase={phase}
                        index={i}
                        projectId={projectId}
                        stageId={stage.id}
                        onUpdate={onUpdate}
                        onDelete={setDeletingPhaseId}
                        canManageProjectItems={canManageProjectItems}
                        user={user}
                      />
                    ))}
                    {dropProvided.placeholder}
                  </div>
                )}
              </Droppable>

              {showAddForm && canManageProjectItems ? (
                <form
                  onSubmit={handleAddPhase}
                  className="p-3 rounded-xl space-y-2"
                  style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-medium)' }}
                >
                  <input
                    className="input text-sm py-1.5"
                    placeholder="Nome da fase *"
                    value={newPhaseName}
                    onChange={e => setNewPhaseName(e.target.value)}
                    required
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
              ) : canManageProjectItems && (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150"
                  style={{ color: 'var(--text-muted)', border: '1px dashed var(--border-medium)' }}
                >
                  <Plus size={13} /> Adicionar fase
                </button>
              )}
            </div>
          )}

          <ConfirmDialog
            open={!!deletingPhaseId}
            onClose={() => setDeletingPhaseId(null)}
            onConfirm={() => handleDeletePhase(deletingPhaseId)}
            title="Remover fase"
            message="Deseja remover esta fase, seus comentários e arquivos anexados? Esta ação não pode ser desfeita."
            danger
          />
        </div>
      )}
    </Draggable>
  )
}

// ── Página principal ──────────────────────────────────────────────
export default function ProjectDetailPage() {
  const { id }     = useParams()
  const navigate   = useNavigate()
  const { user }   = useAuthStore()
  const role       = user?.role || 'member'
  const canEdit    = can(role, 'projects', 'edit')
  const canDelete  = can(role, 'projects', 'delete')

  const [project,       setProject]      = useState(null)
  const [history,       setHistory]      = useState([])
  const [allUsers,      setAllUsers]     = useState([])
  const [stages,        setStages]       = useState([])
  const [loading,       setLoading]      = useState(true)
  const [tab,           setTab]          = useState(0)
  const [editing,       setEditing]      = useState(false)
  const [form,          setForm]         = useState({})
  const [clients,       setClients]      = useState([])
  const [clientId,      setClientId]     = useState('')   // cliente cadastrado vinculado a este projeto
  const [showAddMember, setShowAddMember]= useState(false)
  const [removingId,    setRemovingId]   = useState(null)
  const [files,         setFiles]        = useState([])
  const [uploading,     setUploading]    = useState(false)
  const [deletingFileId,setDeletingFileId] = useState(null)
  const [showAddStageForm, setShowAddStageForm] = useState(false)
  const [newStageName,     setNewStageName]     = useState('')
  const [addingStage,      setAddingStage]      = useState(false)
  const [deletingStageId,  setDeletingStageId]  = useState(null)
  const fileRef = useRef()

  const load = async () => {
    setLoading(true)
    try {
      const [p, h, u, s, c] = await Promise.all([
        getProject(id),
        getProjectHistory(id),
        getUsers({ limit: 200 }),
        getStages(id),
        getAllClients().catch(() => ({ data: { data: [] } })),
      ])
      setProject(p.data.project)
      setHistory(h.data.history || [])
      setAllUsers(u.data.data || [])
      setStages(s.data.stages || [])
      const clientList = [...(c.data?.data || [])].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
      setClients(clientList)
      // Pré-seleciona o cliente já vinculado a este projeto (clients_leads.project_id).
      const linked = clientList.find(cl => String(cl.project_id) === String(id))
      setClientId(linked ? linked.id : '')
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

  // Seleciona um cliente cadastrado e reflete o nome no campo do projeto.
  const handleClientSelect = (selectedId) => {
    setClientId(selectedId)
    const c = clients.find(cl => cl.id === selectedId)
    if (c) setForm(f => ({ ...f, client: c.name }))
  }

  const handleSave = async () => {
    try {
      const { data } = await updateProject(id, form)

      // Back-link Projeto→Cliente (clients_leads.project_id), espelhando a criação.
      const originalLinkedId = clients.find(cl => String(cl.project_id) === String(id))?.id || ''
      try {
        if (originalLinkedId && originalLinkedId !== clientId) {
          await updateClient(originalLinkedId, { projectId: null })   // desvincula o anterior
        }
        if (clientId && clientId !== originalLinkedId) {
          await updateClient(clientId, { projectId: id })             // vincula o novo
        }
      } catch {
        toast.error('Projeto salvo, mas não foi possível atualizar o vínculo do cliente.')
      }

      setProject({ ...project, ...data.project })
      // Mantém o estado local de clientes coerente com o novo vínculo.
      setClients(prev => prev.map(cl =>
        cl.id === clientId
          ? { ...cl, project_id: id }
          : (String(cl.project_id) === String(id) ? { ...cl, project_id: null } : cl)
      ))
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
    catch (err) { toast.error('Erro ao remover membro') }
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      await api.post(`/projects/${id}/files`, fd)
      toast.success('Arquivo enviado!')
      loadFiles()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Erro ao enviar arquivo')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleDeleteFile = async () => {
    try {
      await api.delete(`/projects/${id}/files/${deletingFileId}`)
      toast.success('Arquivo excluído')
      setDeletingFileId(null)
      loadFiles()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Erro ao excluir arquivo')
    }
  }

  const handleCreateStage = async (e) => {
    e.preventDefault()
    if (!newStageName.trim()) return toast.error('Informe o nome da etapa')
    setAddingStage(true)
    try {
      await createStage(id, { stage_name: newStageName.trim() })
      setNewStageName('')
      setShowAddStageForm(false)
      reloadStages()
      toast.success('Etapa criada')
    } catch { toast.error('Erro ao criar etapa') }
    finally { setAddingStage(false) }
  }

  const handleDeleteStage = async () => {
    try {
      await deleteStage(id, deletingStageId)
      setDeletingStageId(null)
      reloadStages()
      toast.success('Etapa removida')
    } catch { toast.error('Erro ao remover etapa') }
  }

  // Reordenação via drag-and-drop — otimista, com fallback para
  // recarregar do servidor em caso de erro na API.
  const handleDragEnd = async (result) => {
    const { source, destination, type } = result
    if (!destination) return
    if (source.droppableId === destination.droppableId && source.index === destination.index) return

    if (type === 'STAGE') {
      const reordered = Array.from(stages)
      const [moved] = reordered.splice(source.index, 1)
      reordered.splice(destination.index, 0, moved)
      setStages(reordered)
      try {
        await reorderStages(id, reordered.map(s => s.id))
      } catch {
        toast.error('Erro ao reordenar etapas')
        reloadStages()
      }
      return
    }

    if (type === 'PHASE') {
      if (source.droppableId !== destination.droppableId) return // sem mover fase entre etapas
      const stageId = source.droppableId.replace('phases-', '')
      const stageIndex = stages.findIndex(s => s.id === stageId)
      if (stageIndex === -1) return

      const stage = stages[stageIndex]
      const reorderedPhases = Array.from(stage.phases || [])
      const [moved] = reorderedPhases.splice(source.index, 1)
      reorderedPhases.splice(destination.index, 0, moved)

      const newStages = [...stages]
      newStages[stageIndex] = { ...stage, phases: reorderedPhases }
      setStages(newStages)

      try {
        await reorderPhases(id, stageId, reorderedPhases.map(p => p.id))
      } catch {
        toast.error('Erro ao reordenar fases')
        reloadStages()
      }
    }
  }

  const nonMembers = allUsers.filter(u => !(project?.members || []).some(m => m.user_id === u.id))
  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>
  if (!project) return null

  const isProjectMember       = (project.members || []).some(m => m.user_id === user?.user_id)
  const canManageProjectItems = hasFullAccess(role) || isProjectMember

  return (
    <div className="max-w-5xl mx-auto fade-in">
      <button onClick={() => navigate('/app/projects')}
      className="flex items-center gap-2 text-sm mb-5 transition-colors"
      style={{ color: 'var(--text-primary)' }}
      onMouseEnter={e => e.currentTarget.style.color = 'var(--text-secondary)'}
      onMouseLeave={e => e.currentTarget.style.color = 'var(--text-primary)'}>
        <ArrowLeft size={15} /> Voltar para Projetos</button>

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
          {editing ? (
            <div className="space-y-2 max-w-md">
              <select className="input py-1.5 text-sm" value={clientId}
                onChange={e => handleClientSelect(e.target.value)}>
                <option value="">— Cliente cadastrado (ou digite abaixo) —</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}{c.email ? ` — ${c.email}` : ''}</option>
                ))}
              </select>
              <input className="input py-1.5 text-sm" placeholder="Nome do cliente"
                value={form.client}
                onChange={e => { setForm({ ...form, client: e.target.value }); if (clientId) setClientId('') }} />
            </div>
          ) : (
            <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{project.client || 'Sem cliente'}</p>
          )}
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
          <label className="block mb-1 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Status do Projeto</label>
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
          <label className="block mb-1 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Descrição</label>
          <textarea rows={4} className="input resize-none" value={form.description}
            onChange={e => setForm({...form, description: e.target.value})} />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-2xl"
        style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-subtle)', display: 'inline-flex' }}>
        {TABS.map(({ label, icon: Icon }, i) => (
          <button key={i} onClick={() => setTab(i)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-150"
            style={tab === i
              ? { background: 'var(--bg-surface)', color: 'var(--text-primary)', border: '1px solid var(--border-medium)' }
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

          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="stages" type="STAGE">
              {(dropProvided) => (
                <div ref={dropProvided.innerRef} {...dropProvided.droppableProps} className="space-y-3">
                  {stages.map((stage, i) => (
                    <StageItem
                      key={stage.id}
                      stage={stage}
                      index={i}
                      projectId={id}
                      onUpdate={reloadStages}
                      onDeleteStage={setDeletingStageId}
                      canManageProjectItems={canManageProjectItems}
                      user={user}
                    />
                  ))}
                  {dropProvided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>

          {stages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 rounded-2xl" style={{ border: '1px dashed var(--border-medium)' }}>
              <CheckSquare size={26} style={{ color: 'var(--border-medium)', marginBottom: 8 }} />
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Nenhuma etapa criada ainda</p>
            </div>
          )}

          {canManageProjectItems && (
            showAddStageForm ? (
              <form onSubmit={handleCreateStage} className="p-4 rounded-2xl space-y-2" style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-medium)' }}>
                <input
                  className="input text-sm"
                  placeholder="Nome da etapa *"
                  value={newStageName}
                  onChange={e => setNewStageName(e.target.value)}
                  required
                />
                <div className="flex gap-2">
                  <button type="submit" disabled={addingStage} className="btn-primary text-xs py-1.5 px-3">
                    {addingStage ? 'Criando...' : 'Criar etapa'}
                  </button>
                  <button type="button" onClick={() => setShowAddStageForm(false)} className="btn-secondary text-xs py-1.5 px-3">
                    Cancelar
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setShowAddStageForm(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-sm font-semibold transition-all duration-150"
                style={{ color: 'var(--text-primary)', border: '1px dashed var(--border-medium)' }}
              >
                <Plus size={15} /> Criar nova etapa
              </button>
            )
          )}
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
              style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-medium)' }}>
              <p className="text-xs font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Selecione para adicionar:</p>
              {nonMembers.length === 0
                ? <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Todos os membros já estão no projeto.</p>
                : <div className="flex flex-wrap gap-2">
                    {nonMembers.map(u => (
                      <button key={u.id}
                        onClick={() => { handleAddMember(u.id); setShowAddMember(false) }}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150"
                        style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--brand-slate)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-surface)'; e.currentTarget.style.color = 'var(--text-secondary)' }}>
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
                style={{ background: 'var(--bg-surface-2)', border: '1px solid var(--border-subtle)' }}>
                <Avatar name={m.name} src={m.avatar_url} />
                <div className="flex-1">
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{m.name}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{m.position || m.role}</p>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full font-semibold"
                  style={{ background: 'rgba(55,65,81,0.08)', color: 'var(--text-primary)' }}>{m.role}</span>
                {canEdit && (
                  <button onClick={() => setRemovingId(m.user_id)}
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
              style={{ border: '1px dashed var(--border-medium)' }}>
              <Paperclip size={28} style={{ color: 'var(--border-medium)', marginBottom: 10 }} />
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Nenhum arquivo anexado</p>
            </div>
          ) : (
            <div className="space-y-2">
              {files.map(f => (
                <div
                  key={f.id}
                  className="flex items-center gap-3 p-3 rounded-xl"
                  style={{
                    background: 'var(--bg-surface-2)',
                    border: '1px solid var(--border-subtle)'
                  }}
                >
                  <File size={16} style={{ color: 'var(--text-primary)' }} />

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

                  {f.drive_url && (
                    <a
                      href={f.drive_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs px-2.5 py-1 rounded-lg font-semibold"
                      style={{
                        background: 'rgba(55,65,81,0.08)',
                        color: 'var(--text-primary)'
                      }}
                    >
                      Abrir
                    </a>
                  )}

                  {canDelete && (
                    <button
                      onClick={() => setDeletingFileId(f.id)}
                      className="p-1.5 rounded-lg transition-all duration-150"
                      style={{ color: 'var(--text-muted)' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(220,38,38,0.10)'; e.currentTarget.style.color = '#DC2626' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
                    >
                      <Trash2 size={14} />
                    </button>
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
                    style={{ background: 'var(--brand-slate)', boxShadow: '0 0 10px rgba(55,65,81,0.40)' }} />
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {h.from_status ? `${statusLabel[h.from_status]} → ` : 'Criado como '}
                    <span style={{ color: 'var(--text-primary)' }}>{statusLabel[h.to_status]}</span>
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

      <ConfirmDialog
        open={!!deletingFileId} onClose={() => setDeletingFileId(null)}
        onConfirm={handleDeleteFile}
        title="Excluir arquivo"
        message="Deseja excluir este arquivo? Esta ação não pode ser desfeita."
        danger
      />

      <ConfirmDialog
        open={!!deletingStageId} onClose={() => setDeletingStageId(null)}
        onConfirm={handleDeleteStage}
        title="Remover etapa"
        message="Deseja remover esta etapa e todas as suas fases, comentários e arquivos anexados? Esta ação não pode ser desfeita."
        danger
      />
    </div>
  )
}