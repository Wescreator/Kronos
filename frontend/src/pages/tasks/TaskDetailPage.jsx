import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Send, Clock, FolderKanban, Trash2, Pencil } from 'lucide-react'
import { getTask, updateTask, addTaskComment, deleteTask } from '../../services/tasks.service'
import Spinner from '../../components/ui/Spinner'
import Badge from '../../components/ui/Badge'
import Avatar from '../../components/ui/Avatar'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import TaskTimeHistory from '../../components/timer/TaskTimeHistory'
import NewTaskModal from '../../components/modals/NewTaskModal'
import { formatDate, formatDateTime, statusLabel, statusColors, priorityLabel, priorityColors } from '../../utils/format'
import { toast } from 'react-hot-toast'
import useAuthStore from '../../store/authStore'
import useIdempotencyKey from '../../hooks/useIdempotencyKey'

const STATUSES = ['open','in_progress','review','completed','cancelled']

export default function TaskDetailPage() {
  const { id }   = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [task,    setTask]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [comment, setComment] = useState('')
  const [sending, setSending] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [showEdit, setShowEdit] = useState(false)

  // Uma chave por comentário — renovada a cada envio bem-sucedido, então dois
  // comentários iguais de propósito continuam possíveis. Ver useIdempotencyKey.
  const [commentIdemKey, renewCommentIdemKey] = useIdempotencyKey(true)

  const load = async () => {
    setLoading(true)
    try { const { data } = await getTask(id); setTask(data.task) }
    catch { toast.error('Tarefa não encontrada') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [id])

  const handleStatus = async (status) => {
    try {
      const { data } = await updateTask(id, { status })
      setTask(data.task); toast.success('Status atualizado')
    } catch { toast.error('Erro ao atualizar status') }
  }

  const handleComment = async (e) => {
    e.preventDefault()
    if (!comment.trim()) return
    setSending(true)
    try {
      await addTaskComment(id, { content: comment }, commentIdemKey)
      renewCommentIdemKey()
      setComment(''); load()
    } catch { toast.error('Erro ao enviar comentário') }
    finally { setSending(false) }
  }

  const handleDelete = async () => {
    try {
      await deleteTask(id)
      toast.success('Tarefa excluída')
      navigate('/app/tasks')
    } catch { toast.error('Erro ao excluir tarefa') }
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>
  if (!task) return null

  return (
    <div className="max-w-4xl mx-auto fade-in">
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={() => navigate('/app/tasks')}
          className="flex items-center gap-2 text-sm transition-colors"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
        >
          <ArrowLeft size={15} /> Voltar para Tarefas
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowEdit(true)}
            className="btn-secondary flex items-center gap-2 text-xs"
          >
            <Pencil size={14} /> Editar Tarefa
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            className="btn-danger flex items-center gap-2 text-xs"
          >
            <Trash2 size={14} /> Excluir Tarefa
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Coluna principal */}
        <div className="lg:col-span-2 space-y-5">
          <div className="card p-7">
            <div className="flex items-start gap-3 mb-4">
              <div className="flex-1">
                <h1 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                  {task.title}
                </h1>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={statusColors[task.status]}>{statusLabel[task.status]}</Badge>
                  <Badge className={priorityColors[task.priority]}>{priorityLabel[task.priority]}</Badge>
                </div>
              </div>
            </div>
            {task.description && (
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {task.description}
              </p>
            )}
          </div>

          {/* Comentários */}
          <div className="card p-6">
            <h3 className="text-sm font-bold mb-5 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Comentários
            </h3>
            <div className="space-y-4 mb-5">
              {(task.comments || []).length === 0 && (
                <p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>
                  Nenhum comentário ainda
                </p>
              )}
              {(task.comments || []).map(c => (
                <div key={c.id} className="flex gap-3">
                  <Avatar name={c.user_name} src={c.avatar_url} size="sm" />
                  <div
                    className="flex-1 rounded-2xl p-4"
                    style={{ background: 'var(--bg-surface-2)', border: '1px solid var(--border-subtle)' }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{c.user_name}</span>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatDateTime(c.created_at)}</span>
                    </div>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
            <form onSubmit={handleComment} className="flex gap-3">
              <Avatar name={user?.name || ''} src={user?.avatar_url} size="sm" />
              <div className="flex-1 flex gap-2">
                <input
                  className="input flex-1"
                  placeholder="Escreva um comentário..."
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                />
                <button type="submit" disabled={sending} className="btn-primary px-4">
                  <Send size={14} />
                </button>
              </div>
            </form>
          </div>

          {/* Apontamento de horas — total + histórico (não altera o status) */}
          <TaskTimeHistory taskId={task.id} />
        </div>

        {/* Sidebar de detalhes */}
        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: 'var(--text-muted)' }}>
              Status
            </h3>
            <select
              className="input text-sm"
              value={task.status}
              onChange={e => handleStatus(e.target.value)}
            >
              {STATUSES.map(s => <option key={s} value={s}>{statusLabel[s]}</option>)}
            </select>
          </div>

          <div className="card p-5">
            <h3 className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: 'var(--text-muted)' }}>
              Informações
            </h3>
            <div className="space-y-3">
              {[
                { label: 'Prioridade',  value: <Badge className={priorityColors[task.priority]}>{priorityLabel[task.priority]}</Badge> },
                { label: 'Prazo',       value: <span className="text-sm flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}><Clock size={12}/>{formatDate(task.due_date)}</span> },
                { label: 'Projeto',     value: task.project_title ? (
                  <span className="text-sm flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                    <FolderKanban size={12}/>{task.project_title}
                  </span>
                ) : <span style={{ color: 'var(--text-muted)' }}>—</span> },
                { label: 'Criado por',  value: <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{task.created_by_name}</span> },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
                  {value}
                </div>
              ))}
            </div>
          </div>

          {task.assignees?.length > 0 && (
            <div className="card p-5">
              <h3 className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: 'var(--text-muted)' }}>
                Responsáveis
              </h3>
              <div className="space-y-2.5">
                {task.assignees.map(a => (
                  <div key={a.id} className="flex items-center gap-2.5">
                    <Avatar name={a.name} src={a.avatar_url} size="sm" />
                    <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{a.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title="Excluir tarefa"
        message={`Tem certeza que deseja excluir a tarefa "${task.title}"? Esta ação não pode ser desfeita.`}
        danger
      />

      {/* Editar tarefa — reaproveita o formulário do NewTaskModal (modo edição).
          Montado condicionalmente para pré-preencher com a tarefa atual. */}
      {showEdit && (
        <NewTaskModal
          open
          task={task}
          onClose={() => setShowEdit(false)}
          onSuccess={() => { setShowEdit(false); load() }}
        />
      )}
    </div>
  )
}