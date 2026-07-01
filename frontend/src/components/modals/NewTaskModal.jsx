import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import PortalModal from '../ui/PortalModal'
import { createTask } from '../../services/tasks.service'
import { getProjects } from '../../services/projects.service'
import { getUsers } from '../../services/team.service'

export default function NewTaskModal({ open, onClose, onSuccess, defaultProjectId }) {
  const [form, setForm] = useState({
    title:'', description:'', project_id: defaultProjectId || '',
    priority:'medium', due_date:'', assignees: []
  })
  const [projects, setProjects] = useState([])
  const [users,    setUsers]    = useState([])
  const [loading,  setLoading]  = useState(false)

  useEffect(() => {
    if (open) {
      getProjects({ limit: 100 }).then(r => setProjects(r.data.data || []))
      getUsers({ limit: 100 }).then(r => setUsers(r.data.data || []))
    }
  }, [open])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const toggleAssignee = (id) => {
    setForm(f => ({
      ...f,
      assignees: f.assignees.includes(id)
        ? f.assignees.filter(a => a !== id)
        : [...f.assignees, id]
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await createTask({ ...form, project_id: form.project_id || null })
      toast.success('Tarefa criada!')
      setForm({ title:'', description:'', project_id:'', priority:'medium', due_date:'', assignees:[] })
      onSuccess()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erro ao criar tarefa')
    } finally { setLoading(false) }
  }

  const priorityOpts = [
    { value: 'low',      label: 'Baixa',   color: 'rgba(148,163,184,0.6)' },
    { value: 'medium',   label: 'Média',   color: '#38BDF8' },
    { value: 'high',     label: 'Alta',    color: '#FBBF24' },
    { value: 'critical', label: 'Crítica', color: '#FB7185' },
  ]

  return (
    <PortalModal open={open} onClose={onClose} title="Nova Tarefa" size="lg">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label
          className="block mb-1 text-sm font-semibold"
          style={{ color: "var(--text-primary)" }}>Título *
          </label>
          <input className="input" placeholder="Título da tarefa" required
            value={form.title} onChange={e => set('title', e.target.value)} />
        </div>
        <div>
          <label
          className="block mb-1 text-sm font-semibold"
          style={{ color: "var(--text-primary)" }}>Descrição</label>
          <textarea className="input resize-none" rows={3} placeholder="Detalhes da tarefa..."
            value={form.description} onChange={e => set('description', e.target.value)} />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label
              className="block mb-1 text-sm font-semibold"
              style={{ color: "var(--text-primary)" }}>Projeto</label>
            <select className="input" value={form.project_id} onChange={e => set('project_id', e.target.value)}>
              <option value="">Sem projeto</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </div>
          <div>
            <label
              className="block mb-1 text-sm font-semibold"
              style={{ color: "var(--text-primary)" }}>Prioridade</label>
            <div className="flex gap-1.5 mt-1">
              {priorityOpts.map(opt => (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => set('priority', opt.value)}
                  className="flex-1 py-2 rounded-xl text-xs font-bold transition-all duration-150"
                  style={form.priority === opt.value
                    ? { background: `${opt.color}20`, color: opt.color, border: `1px solid ${opt.color}40` }
                    : { background: 'rgba(0,0,0,0.03)', color: 'var(--text-muted)', border: '1px solid rgba(0,0,0,0.06)' }
                  }
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label
              className="block mb-1 text-sm font-semibold"
              style={{ color: "var(--text-primary)" }}>Prazo</label>
            <input type="date" className="input" value={form.due_date}
              onChange={e => set('due_date', e.target.value)} />
          </div>
        </div>
        <div>
          <label
            className="block mb-1 text-sm font-semibold"
            style={{ color: "var(--text-primary)" }}>Responsáveis</label>
          <div className="flex flex-wrap gap-2 mt-1.5">
            {users.map(u => (
              <button
                type="button"
                key={u.id}
                onClick={() => toggleAssignee(u.id)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150"
                style={form.assignees.includes(u.id)
                  ? { background: 'rgba(55,65,81,0.10)', color: '#374151', border: '1px solid rgba(55,65,81,0.20)' }
                  : { background: 'rgba(0,0,0,0.03)', color: 'var(--text-muted)', border: '1px solid rgba(0,0,0,0.06)' }
                }
              >
                {u.name}
              </button>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
          <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Criando...' : 'Criar Tarefa'}
          </button>
        </div>
      </form>
    </PortalModal>
  )
}