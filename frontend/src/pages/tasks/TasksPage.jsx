import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus, CheckSquare, Clock, Circle, Trash2, Search, Pencil } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { useTasks } from '../../hooks/useTasks'
import { getTasksDashboard, deleteTask } from '../../services/tasks.service'
import PageHeader from '../../components/ui/PageHeader'
import Spinner from '../../components/ui/Spinner'
import Badge from '../../components/ui/Badge'
import Avatar from '../../components/ui/Avatar'
import EmptyState from '../../components/ui/EmptyState'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import NewTaskModal from '../../components/modals/NewTaskModal'
import {
  formatDate, statusLabel, statusColors,
  priorityLabel, priorityColors, priorityDot
} from '../../utils/format'

const PRIORITY_FILTERS = [
  { value: '',         label: 'Todas' },
  { value: 'critical', label: 'Crítica' },
  { value: 'high',     label: 'Alta' },
  { value: 'medium',   label: 'Média' },
  { value: 'low',      label: 'Baixa' },
]
const STATUS_FILTERS = [
  { value: '',            label: 'Todos' },
  { value: 'open',        label: 'Aberta' },
  { value: 'in_progress', label: 'Em andamento' },
  { value: 'review',      label: 'Revisão' },
  { value: 'completed',   label: 'Concluída' },
]

export default function TasksPage() {
  // Modal de tarefa: undefined = fechado; null = criar; objeto = editar.
  const [modalTask, setModalTask] = useState(undefined)
  const [filters,   setFilters]   = useState({ status: '', priority: '', search: '' })
  const [searchInput, setSearchInput] = useState('')
  const [stats,     setStats]     = useState(null)
  const [taskToDelete, setTaskToDelete] = useState(null)
  const { tasks, loading, refetch } = useTasks(filters)

  useEffect(() => {
    getTasksDashboard().then(({ data }) => setStats(data.stats))
  }, [])

  // Debounce do campo de busca: evita disparar uma requisição a cada tecla digitada
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters(f => ({ ...f, search: searchInput.trim() }))
    }, 400)
    return () => clearTimeout(timer)
  }, [searchInput])

  const daysOpen = (createdAt) => {
    const diff = Date.now() - new Date(createdAt).getTime()
    return Math.floor(diff / (1000 * 60 * 60 * 24))
  }

  const handleDelete = async () => {
    if (!taskToDelete) return
    try {
      await deleteTask(taskToDelete.id)
      toast.success('Tarefa excluída')
      refetch()
    } catch {
      toast.error('Erro ao excluir tarefa')
    }
  }

  return (
    <div className="fade-in">
      <PageHeader
        title="Tarefas"
        tag="Gestão"
        subtitle="Acompanhe e gerencie todas as tarefas da equipe"
        actions={
          <button onClick={() => setModalTask(null)} className="btn-primary">
            <Plus size={15} /> Nova Tarefa
          </button>
        }
      />

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-7">
          {[
            { label: 'Total',        value: stats.total,       color: 'var(--text-primary)' },
            { label: 'Abertas',      value: stats.open,        color: '#38BDF8' },
            { label: 'Em andamento', value: stats.in_progress, color: '#A78BFA' },
            { label: 'Concluídas',   value: stats.completed,   color: '#34D399' },
            { label: 'Atrasadas',    value: stats.overdue,     color: '#FB7185' },
          ].map(s => (
            <div key={s.label} className="card p-4 text-center">
              <p className="text-2xl font-bold mb-1" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                {s.label}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Busca */}
      <div className="relative mb-4 w-full md:max-w-[25%]">
        <Search
          size={15}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: 'var(--text-primary)' }}
        />
        <input
          type="text"
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          placeholder="Buscar por título ou membro..."
          className="w-full pl-10 pr-3.5 py-2.5 rounded-xl text-sm outline-none transition-all duration-150"
          style={{
            background: 'var(--bg-surface)',
            color: 'var(--text-primary)',
            border: '1px solid var(--text-primary)'
          }}
        />
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 mb-5">
        {STATUS_FILTERS.map(f => (
          <button key={f.value} onClick={() => setFilters({ ...filters, status: f.value })}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150"
            style={filters.status === f.value
              ? { background: 'var(--brand-slate)', color: 'var(--text-onbrand)', border: '1px solid var(--brand-slate)' }
              : { background: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }
            }>
            {f.label}
          </button>
        ))}
        <div className="w-px mx-1" style={{ background: 'var(--border-subtle)' }} />
        {PRIORITY_FILTERS.map(f => (
          <button key={f.value} onClick={() => setFilters({ ...filters, priority: f.value })}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150"
            style={filters.priority === f.value
              ? { background: 'var(--brand-slate)', color: 'var(--text-onbrand)', border: '1px solid var(--brand-slate)' }
              : { background: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }
            }>
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="Nenhuma tarefa encontrada"
          action={<button onClick={() => setModalTask(null)} className="btn-primary">Nova Tarefa</button>}
        />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <tr>
                <th className="table-header">Tarefa</th>
                <th className="table-header hidden md:table-cell">Projeto</th>
                <th className="table-header hidden sm:table-cell">Prioridade</th>
                <th className="table-header">Status</th>
                <th className="table-header hidden lg:table-cell">Responsável</th>
                <th className="table-header hidden lg:table-cell">Prazo</th>
                <th className="table-header hidden xl:table-cell">Aberta há</th>
                <th className="table-header">Ações</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((t, i) => (
                <tr
                  key={t.id}
                  style={{ borderBottom: i < tasks.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}
                  onMouseEnter={ev => ev.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}
                >
                  <td className="table-cell">
                    <Link to={`/app/tasks/${t.id}`} className="flex items-center gap-3 group">
                      <div className={`h-2 w-2 rounded-full shrink-0 ${priorityDot[t.priority]}`} />
                      <span
                        className="text-sm font-semibold line-clamp-1 group-hover:text-violet-400 transition-colors"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {t.title}
                      </span>
                    </Link>
                  </td>
                  <td className="table-cell hidden md:table-cell">
                    {t.project_title ? (
                      <span
                        className="text-xs px-2.5 py-1 rounded-lg font-medium"
                        style={{ background: 'var(--bg-surface-2)', color: 'var(--text-muted)' }}
                      >
                        {t.project_title}
                      </span>
                    ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                  </td>
                  <td className="table-cell hidden sm:table-cell">
                    <Badge className={priorityColors[t.priority]}>{priorityLabel[t.priority]}</Badge>
                  </td>
                  <td className="table-cell">
                    <Badge className={statusColors[t.status]}>{statusLabel[t.status]}</Badge>
                  </td>
                  <td className="table-cell hidden lg:table-cell">
                    {t.assignees?.length > 0 ? (
                      <div className="flex items-center gap-1.5">
                        {t.assignees.slice(0, 2).map(a => (
                          <Avatar key={a.id} name={a.name} src={a.avatar_url} size="sm" />
                        ))}
                        {t.assignees.length > 2 && (
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            +{t.assignees.length - 2}
                          </span>
                        )}
                      </div>
                    ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                  </td>
                  <td className="table-cell hidden lg:table-cell">
                    {t.due_date ? (
                      <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                        <Clock size={11} /> {formatDate(t.due_date)}
                      </div>
                    ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                  </td>
                  <td className="table-cell hidden xl:table-cell">
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {daysOpen(t.created_at)}d
                    </span>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setModalTask(t)}
                        className="p-1.5 rounded-lg transition-colors"
                        style={{ color: 'var(--text-muted)' }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                        title="Editar tarefa"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => setTaskToDelete(t)}
                        className="p-1.5 rounded-lg transition-colors"
                        style={{ color: 'var(--text-muted)' }}
                        onMouseEnter={e => e.currentTarget.style.color = '#FB7185'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                        title="Excluir tarefa"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Montado condicionalmente: garante estado inicial "fresco" do
          formulário a cada abertura (criar = null, editar = a tarefa). */}
      {modalTask !== undefined && (
        <NewTaskModal
          open
          task={modalTask}
          onClose={() => setModalTask(undefined)}
          onSuccess={() => { setModalTask(undefined); refetch() }}
        />
      )}

      <ConfirmDialog
        open={!!taskToDelete}
        onClose={() => setTaskToDelete(null)}
        onConfirm={handleDelete}
        title="Excluir tarefa"
        message={`Tem certeza que deseja excluir a tarefa "${taskToDelete?.title}"? Esta ação não pode ser desfeita.`}
        danger
      />
    </div>
  )
}