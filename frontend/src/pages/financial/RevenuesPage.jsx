import { useState, useEffect, useCallback } from 'react'
import { Plus, CheckCircle, TrendingUp, Trash2, FolderKanban, FileText } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import Badge from '../../components/ui/Badge'
import Spinner from '../../components/ui/Spinner'
import Modal from '../../components/ui/Modal'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { formatCurrency, formatDate, statusLabel, statusColors } from '../../utils/format'
import { getRevenues, createRevenue, confirmReceipt, deleteRevenue } from '../../services/financial.service'
import { getProjects } from '../../services/projects.service'
import { toast } from 'react-hot-toast'

// Modo de criação da receita
const REVENUE_MODES = [
  { key: 'new',     label: 'Nova Receita',     icon: FileText,      desc: 'Receita avulsa, não vinculada a projeto' },
  { key: 'project', label: 'Vincular Projeto',  icon: FolderKanban, desc: 'Receita relacionada a um projeto existente' },
]

export default function RevenuesPage() {
  const [revenues,     setRevenues]     = useState([])
  const [projects,     setProjects]     = useState([])
  const [loading,      setLoading]      = useState(true)
  const [showNew,      setShowNew]      = useState(false)
  const [recModal,     setRecModal]     = useState(null)
  const [recDate,      setRecDate]      = useState('')
  const [deleteId,     setDeleteId]     = useState(null)
  const [statusFilter, setStatusFilter] = useState('')

  // Modo do modal: 'new' | 'project'
  const [revenueMode, setRevenueMode] = useState('new')
  const [form, setForm] = useState({
    title:'', client:'', total_amount:'',
    installments:1, due_date:'', description:'',
    project_id:''
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await getRevenues({ status: statusFilter, limit: 100 })
      setRevenues(data.data || [])
    } finally { setLoading(false) }
  }, [statusFilter])

  useEffect(() => { load() },                          [load])
  useEffect(() => {
    getProjects({ limit: 200 }).then(r => setProjects(r.data.data || []))
  }, [])

  const resetForm = () => {
    setForm({ title:'', client:'', total_amount:'', installments:1, due_date:'', description:'', project_id:'' })
    setRevenueMode('new')
  }

  // Quando seleciona um projeto, preenche automaticamente o título
  const handleProjectSelect = (projectId) => {
    const proj = projects.find(p => p.id === projectId)
    setForm(f => ({
      ...f,
      project_id: projectId,
      title: proj ? proj.title : f.title,
      client: proj ? (proj.client || f.client) : f.client,
    }))
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (revenueMode === 'project' && !form.project_id) {
      return toast.error('Selecione um projeto')
    }
    if (!form.title.trim()) return toast.error('Informe o título')
    try {
      await createRevenue({
        ...form,
        total_amount: parseFloat(form.total_amount),
        installments: parseInt(form.installments),
        project_id: form.project_id || null
      })
      toast.success('Receita criada com parcelas!')
      setShowNew(false)
      resetForm()
      load()
    } catch (err) { toast.error(err.response?.data?.message || 'Erro ao criar receita') }
  }

  const handleReceive = async () => {
    if (!recDate) return toast.error('Informe a data de recebimento')
    try {
      await confirmReceipt(recModal, { received_date: recDate })
      toast.success('Recebimento confirmado!')
      setRecModal(null); setRecDate(''); load()
    } catch { toast.error('Erro ao confirmar recebimento') }
  }

  const handleDelete = async (id) => {
    try {
      await deleteRevenue(id)
      toast.success('Receita excluída')
      load()
    } catch { toast.error('Erro ao excluir receita') }
  }

  const total    = revenues.reduce((s, r) => s + parseFloat(r.installment_amount || 0), 0)
  const received = revenues
    .filter(r => r.installment_status === 'received')
    .reduce((s, r) => s + parseFloat(r.installment_amount || 0), 0)

  const selectedProject = projects.find(p => p.id === form.project_id)

  return (
    <div className="fade-in">
      <PageHeader
        title="Contas a Receber"
        tag="Financeiro"
        subtitle="Gerencie receitas e confirme recebimentos"
        actions={
          <button onClick={() => { setShowNew(true); resetForm() }} className="btn-primary">
            <Plus size={15} /> Nova Receita
          </button>
        }
      />

      {/* Totalizadores */}
      <div className="grid grid-cols-3 gap-4 mb-7">
        {[
          { label: 'Total previsto', value: total,            color: 'var(--text-primary)' },
          { label: 'Recebido',       value: received,         color: '#34D399' },
          { label: 'Pendente',       value: total - received, color: '#FBBF24' },
        ].map(item => (
          <div key={item.label} className="card p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-2"
              style={{ color: 'var(--text-muted)' }}>{item.label}</p>
            <p className="text-2xl font-bold" style={{ color: item.color }}>
              {formatCurrency(item.value)}
            </p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-5">
        {[
          {value:'',         label:'Todas'},
          {value:'pending',  label:'Pendente'},
          {value:'received', label:'Recebido'},
          {value:'overdue',  label:'Atrasado'},
        ].map(f => (
          <button key={f.value} onClick={() => setStatusFilter(f.value)}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150"
            style={statusFilter === f.value
              ? { background: 'rgba(124,92,252,0.20)', color: '#A78BFA', border: '1px solid rgba(124,92,252,0.30)' }
              : { background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.06)' }
            }>
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <tr>
                <th className="table-header">Título</th>
                <th className="table-header hidden md:table-cell">Cliente / Projeto</th>
                <th className="table-header hidden sm:table-cell">Parcela</th>
                <th className="table-header">Valor</th>
                <th className="table-header hidden sm:table-cell">Vencimento</th>
                <th className="table-header">Status</th>
                <th className="table-header">Ações</th>
              </tr>
            </thead>
            <tbody>
              {revenues.map((r, i) => (
                <tr
                  key={r.installment_id}
                  style={{ borderBottom: i < revenues.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none' }}
                  onMouseEnter={ev => ev.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                  onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}
                >
                  <td className="table-cell">
                    <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                      {r.title}
                    </p>
                    {r.project_title && (
                      <span className="inline-flex items-center gap-1 text-xs mt-0.5"
                        style={{ color: '#A78BFA' }}>
                        <FolderKanban size={10} /> {r.project_title}
                      </span>
                    )}
                  </td>
                  <td className="table-cell hidden md:table-cell text-sm"
                    style={{ color: 'var(--text-muted)' }}>
                    {r.client || '—'}
                  </td>
                  <td className="table-cell hidden sm:table-cell text-sm"
                    style={{ color: 'var(--text-muted)' }}>
                    {r.installment_no}/{r.installments}
                  </td>
                  <td className="table-cell font-bold text-sm"
                    style={{ color: 'var(--text-primary)' }}>
                    {formatCurrency(r.installment_amount)}
                  </td>
                  <td className="table-cell hidden sm:table-cell text-sm"
                    style={{ color: 'var(--text-muted)' }}>
                    {formatDate(r.installment_due)}
                  </td>
                  <td className="table-cell">
                    <Badge className={statusColors[r.installment_status]}>
                      {statusLabel[r.installment_status]}
                    </Badge>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-1">
                      {r.installment_status === 'pending' && (
                        <button
                          onClick={() => { setRecModal(r.installment_id); setRecDate('') }}
                          className="p-2 rounded-xl transition-all duration-150"
                          style={{ color: '#34D399' }}
                          onMouseEnter={ev => ev.currentTarget.style.background = 'rgba(52,211,153,0.10)'}
                          onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}
                          title="Confirmar recebimento"
                        >
                          <CheckCircle size={15} />
                        </button>
                      )}
                      {/* Delete — aparece apenas na primeira parcela para evitar duplicação */}
                      {r.installment_no === 1 && (
                        <button
                          onClick={() => setDeleteId(r.id)}
                          className="p-2 rounded-xl transition-all duration-150"
                          style={{ color: '#FB7185' }}
                          onMouseEnter={ev => ev.currentTarget.style.background = 'rgba(251,113,133,0.10)'}
                          onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}
                          title="Excluir receita"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {revenues.length === 0 && (
            <div className="py-16 text-center" style={{ color: 'var(--text-muted)' }}>
              <TrendingUp size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Nenhuma receita encontrada</p>
            </div>
          )}
        </div>
      )}

      {/* ── Modal Nova Receita ── */}
      <Modal open={showNew} onClose={() => { setShowNew(false); resetForm() }} title="Nova Receita" size="lg">
        <form onSubmit={handleCreate} className="space-y-5">

          {/* Seletor de modo */}
          <div>
            <label className="label">Tipo de receita</label>
            <div className="grid grid-cols-2 gap-3 mt-1">
              {REVENUE_MODES.map(mode => {
                const Icon = mode.icon
                return (
                  <button
                    key={mode.key}
                    type="button"
                    onClick={() => { setRevenueMode(mode.key); setForm(f => ({...f, project_id: '', title: ''})) }}
                    className="flex flex-col items-start gap-1.5 p-4 rounded-2xl text-left transition-all duration-150"
                    style={revenueMode === mode.key
                      ? { background: 'rgba(124,92,252,0.15)', border: '1px solid rgba(124,92,252,0.35)', color: '#A78BFA' }
                      : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-muted)' }
                    }
                  >
                    <div className="flex items-center gap-2">
                      <Icon size={15} />
                      <span className="text-sm font-bold">{mode.label}</span>
                    </div>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{mode.desc}</p>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Modo: Vincular Projeto */}
          {revenueMode === 'project' && (
            <div>
              <label className="label">Selecionar projeto *</label>
              <select
                className="input"
                value={form.project_id}
                onChange={e => handleProjectSelect(e.target.value)}
                required
              >
                <option value="">Selecione um projeto...</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.title}{p.client ? ` — ${p.client}` : ''}
                  </option>
                ))}
              </select>
              {selectedProject && (
                <div
                  className="mt-2 px-3 py-2.5 rounded-xl flex items-center gap-2"
                  style={{
                    background: 'rgba(124,92,252,0.07)',
                    border: '1px solid rgba(124,92,252,0.15)'
                  }}
                >
                  <FolderKanban size={13} style={{ color: '#A78BFA' }} />
                  <div>
                    <p className="text-xs font-semibold" style={{ color: '#A78BFA' }}>
                      {selectedProject.title}
                    </p>
                    {selectedProject.client && (
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {selectedProject.client}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Título — sempre visível, mas pré-preenchido quando projeto selecionado */}
          <div>
            <label className="label">
              Título *
              {revenueMode === 'project' && form.project_id && (
                <span className="ml-1.5 text-[10px]" style={{ color: 'var(--text-muted)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
                  (pré-preenchido do projeto, edite se necessário)
                </span>
              )}
            </label>
            <input
              className="input"
              placeholder="Nome ou descrição da receita"
              required
              value={form.title}
              onChange={e => setForm({...form, title: e.target.value})}
            />
          </div>

          {/* Cliente — apenas para receita avulsa */}
          {revenueMode === 'new' && (
            <div>
              <label className="label">Cliente</label>
              <input className="input" placeholder="Nome do cliente"
                value={form.client} onChange={e => setForm({...form, client: e.target.value})} />
            </div>
          )}

          {/* Valores */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">Valor total *</label>
              <input type="number" step="0.01" min="0" className="input" required
                value={form.total_amount} onChange={e => setForm({...form, total_amount: e.target.value})} />
            </div>
            <div>
              <label className="label">Parcelas</label>
              <input type="number" min="1" max="60" className="input"
                value={form.installments} onChange={e => setForm({...form, installments: e.target.value})} />
            </div>
            <div>
              <label className="label">Primeiro vencimento *</label>
              <input type="date" className="input" required
                value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})} />
            </div>
          </div>

          {/* Preview de parcelamento */}
          {form.total_amount && parseInt(form.installments) > 1 && (
            <div
              className="text-xs px-4 py-3 rounded-xl"
              style={{
                background: 'rgba(124,92,252,0.08)',
                border: '1px solid rgba(124,92,252,0.15)',
                color: '#A78BFA'
              }}
            >
              Parcela: <strong>
                {formatCurrency(parseFloat(form.total_amount) / parseInt(form.installments) || 0)}
              </strong> × {form.installments}x
            </div>
          )}

          <div>
            <label className="label">Descrição</label>
            <textarea className="input resize-none" rows={2}
              value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
          </div>

          <div className="flex justify-end gap-3 pt-2"
            style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <button type="button" onClick={() => { setShowNew(false); resetForm() }} className="btn-secondary">
              Cancelar
            </button>
            <button type="submit" className="btn-primary">Criar Receita</button>
          </div>
        </form>
      </Modal>

      {/* Modal Confirmar Recebimento */}
      <Modal open={!!recModal} onClose={() => setRecModal(null)} title="Confirmar Recebimento" size="sm">
        <div className="space-y-5">
          <div>
            <label className="label">Data do recebimento</label>
            <input type="date" className="input" value={recDate}
              onChange={e => setRecDate(e.target.value)} />
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setRecModal(null)} className="btn-secondary">Cancelar</button>
            <button onClick={handleReceive} className="btn-primary">Confirmar Recebimento</button>
          </div>
        </div>
      </Modal>

      {/* Confirm delete receita */}
      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => handleDelete(deleteId)}
        title="Excluir receita"
        message="Todas as parcelas desta receita serão removidas permanentemente. Esta ação não pode ser desfeita."
        danger
      />
    </div>
  )
}