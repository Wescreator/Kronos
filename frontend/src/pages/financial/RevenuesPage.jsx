import { useState, useEffect, useCallback } from 'react'
import { Plus, CheckCircle, TrendingUp, Trash2, FolderKanban, FileText, Edit } from 'lucide-react'
import PageHeader    from '../../components/ui/PageHeader'
import Badge         from '../../components/ui/Badge'
import Spinner       from '../../components/ui/Spinner'
import Modal         from '../../components/ui/Modal'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { formatCurrency, formatDate, statusLabel, statusColors, monthNamesLong } from '../../utils/format'
import {
  getRevenues, createRevenue, confirmReceipt,
  deleteRevenue, updateInstallment
} from '../../services/financial.service'
import { getProjects } from '../../services/projects.service'
import { toast }       from 'react-hot-toast'

const REVENUE_MODES = [
  { key: 'new',     label: 'Nova Receita',    icon: FileText,     desc: 'Receita avulsa' },
  { key: 'project', label: 'Vincular Projeto', icon: FolderKanban, desc: 'Receita de projeto' },
]

const EMPTY_INSTALLMENT = { amount: '', due_date: '' }

export default function RevenuesPage() {
  const now = new Date()
  const [revenues,      setRevenues]      = useState([])
  const [projects,      setProjects]      = useState([])
  const [loading,       setLoading]       = useState(true)
  const [showNew,       setShowNew]       = useState(false)
  const [editInstall,   setEditInstall]   = useState(null)
  const [recModal,      setRecModal]      = useState(null)
  const [recDate,       setRecDate]       = useState('')
  const [deleteId,      setDeleteId]      = useState(null)
  const [statusFilter,  setStatusFilter]  = useState('')
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1)
  const [selectedYear,  setSelectedYear]  = useState(now.getFullYear())
  const [revenueMode,   setRevenueMode]   = useState('new')

  // Novo formato: lista de parcelas individuais
  const [form, setForm] = useState({
    title:'', client:'', description:'', project_id:'',
    installments_list: [{ ...EMPTY_INSTALLMENT }]
  })

  // Form de edição de parcela
  const [editForm, setEditForm] = useState({ amount: '', due_date: '', note: '' })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await getRevenues({
        status: statusFilter,
        month:  selectedMonth,
        year:   selectedYear,
        limit:  200
      })
      setRevenues(data.data || [])
    } finally { setLoading(false) }
  }, [statusFilter, selectedMonth, selectedYear])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    getProjects({ limit: 200 }).then(r => setProjects(r.data.data || []))
  }, [])

  const resetForm = () => {
    setForm({ title:'', client:'', description:'', project_id:'', installments_list: [{ ...EMPTY_INSTALLMENT }] })
    setRevenueMode('new')
  }

  const handleProjectSelect = (projectId) => {
    const proj = projects.find(p => p.id === projectId)
    setForm(f => ({
      ...f,
      project_id: projectId,
      title:  proj ? proj.title      : f.title,
      client: proj ? (proj.client || f.client) : f.client,
    }))
  }

  // Gerencia lista de parcelas
  const addInstallment = () => {
    setForm(f => ({ ...f, installments_list: [...f.installments_list, { ...EMPTY_INSTALLMENT }] }))
  }

  const removeInstallment = (index) => {
    if (form.installments_list.length === 1) return toast.error('É necessário ao menos uma parcela')
    setForm(f => ({ ...f, installments_list: f.installments_list.filter((_, i) => i !== index) }))
  }

  const updateInstallmentField = (index, field, value) => {
    setForm(f => ({
      ...f,
      installments_list: f.installments_list.map((inst, i) =>
        i === index ? { ...inst, [field]: value } : inst
      )
    }))
  }

  const totalAmount = form.installments_list.reduce((s, inst) => s + (parseFloat(inst.amount) || 0), 0)

  const handleCreate = async (e) => {
    e.preventDefault()
    if (revenueMode === 'project' && !form.project_id) return toast.error('Selecione um projeto')
    if (!form.title.trim()) return toast.error('Informe o título')

    const invalid = form.installments_list.some(inst => !inst.amount || !inst.due_date)
    if (invalid) return toast.error('Preencha valor e data de todas as parcelas')

    try {
      await createRevenue({
        title:             form.title,
        client:            form.client,
        project_id:        form.project_id || null,
        description:       form.description,
        total_amount:      totalAmount,
        installments_list: form.installments_list.map(inst => ({
          amount:   parseFloat(inst.amount),
          due_date: inst.due_date
        }))
      })
      toast.success('Receita criada!')
      setShowNew(false); resetForm(); load()
    } catch (err) { toast.error(err.response?.data?.message || 'Erro ao criar receita') }
  }

  const handleReceive = async () => {
    if (!recDate) return toast.error('Informe a data de recebimento')
    try {
      await confirmReceipt(recModal, { received_date: recDate })
      toast.success('Recebimento confirmado!'); setRecModal(null); setRecDate(''); load()
    } catch { toast.error('Erro ao confirmar recebimento') }
  }

  const openEditInstall = (installment) => {
    setEditInstall(installment)
    setEditForm({
      amount:   installment.installment_amount,
      due_date: installment.installment_due?.slice(0, 10) || '',
      note:     installment.note || ''
    })
  }

  const handleEditInstall = async (e) => {
    e.preventDefault()
    try {
      await updateInstallment(editInstall.installment_id, {
        amount:   parseFloat(editForm.amount),
        due_date: editForm.due_date,
        note:     editForm.note
      })
      toast.success('Parcela atualizada!'); setEditInstall(null); load()
    } catch { toast.error('Erro ao editar parcela') }
  }

  const handleDelete = async (id) => {
    try { await deleteRevenue(id); toast.success('Receita excluída'); load() }
    catch { toast.error('Erro ao excluir receita') }
  }

  const total    = revenues.reduce((s, r) => s + parseFloat(r.installment_amount || 0), 0)
  const received = revenues.filter(r => r.installment_status === 'received').reduce((s, r) => s + parseFloat(r.installment_amount || 0), 0)

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

      {/* Filtro de mês */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex gap-1 flex-wrap">
          {monthNamesLong.map((m, i) => (
            <button key={i} onClick={() => setSelectedMonth(i + 1)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150"
              style={selectedMonth === i + 1
                ? { background: 'rgba(124,92,252,0.20)', color: '#A78BFA', border: '1px solid rgba(124,92,252,0.30)' }
                : { background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.06)' }
              }>
              {m.slice(0, 3)}
            </button>
          ))}
        </div>
        <select className="input" style={{ width: 'auto', minWidth: 90 }}
          value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))}>
          {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {/* Totalizadores */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        {[
          { label: `Total — ${monthNamesLong[selectedMonth-1]}`, value: total,            color: 'var(--text-primary)' },
          { label: 'Recebido',                                    value: received,         color: '#34D399' },
          { label: 'Pendente',                                    value: total - received, color: '#FBBF24' },
        ].map(item => (
          <div key={item.label} className="card p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-2" style={{ color: 'var(--text-muted)' }}>{item.label}</p>
            <p className="text-2xl font-bold" style={{ color: item.color }}>{formatCurrency(item.value)}</p>
          </div>
        ))}
      </div>

      {/* Filtro de status */}
      <div className="flex gap-2 mb-5">
        {[{value:'',label:'Todas'},{value:'pending',label:'Pendente'},{value:'received',label:'Recebido'},{value:'overdue',label:'Atrasado'}].map(f => (
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

      {loading ? <div className="flex justify-center py-20"><Spinner size="lg" /></div> : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <tr>
                <th className="table-header">Título</th>
                <th className="table-header hidden md:table-cell">Cliente/Projeto</th>
                <th className="table-header hidden sm:table-cell">Parcela</th>
                <th className="table-header">Valor</th>
                <th className="table-header hidden sm:table-cell">Vencimento</th>
                <th className="table-header hidden lg:table-cell">Recebimento</th>
                <th className="table-header">Status</th>
                <th className="table-header">Ações</th>
              </tr>
            </thead>
            <tbody>
              {revenues.map((r, i) => (
                <tr key={r.installment_id}
                  style={{ borderBottom: i < revenues.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none' }}
                  onMouseEnter={ev => ev.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                  onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}>
                  <td className="table-cell">
                    <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{r.title}</p>
                    {r.project_title && (
                      <span className="inline-flex items-center gap-1 text-xs mt-0.5" style={{ color: '#A78BFA' }}>
                        <FolderKanban size={10} /> {r.project_title}
                      </span>
                    )}
                  </td>
                  <td className="table-cell hidden md:table-cell text-sm" style={{ color: 'var(--text-muted)' }}>
                    {r.client || '—'}
                  </td>
                  <td className="table-cell hidden sm:table-cell text-sm" style={{ color: 'var(--text-muted)' }}>
                    {r.installment_no}/{r.installments}
                  </td>
                  <td className="table-cell font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                    {formatCurrency(r.installment_amount)}
                  </td>
                  <td className="table-cell hidden sm:table-cell text-sm" style={{ color: 'var(--text-muted)' }}>
                    {formatDate(r.installment_due)}
                  </td>
                  <td className="table-cell hidden lg:table-cell text-sm" style={{ color: r.received_date? '#34D399': 'var(--text-muted)'}}>
                    {r.received_date? formatDate(r.received_date): '—'}
                    </td>
                  <td className="table-cell">
                    <Badge className={statusColors[r.installment_status]}>{statusLabel[r.installment_status]}</Badge>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-1">
                      {/* Editar parcela */}
                      <button onClick={() => openEditInstall(r)}
                        className="p-2 rounded-xl transition-all duration-150"
                        style={{ color: '#A78BFA' }}
                        onMouseEnter={ev => ev.currentTarget.style.background = 'rgba(124,92,252,0.10)'}
                        onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}
                        title="Editar parcela">
                        <Edit size={15} />
                      </button>
                      {/* Confirmar recebimento */}
                      {r.installment_status === 'pending' && (
                        <button onClick={() => { setRecModal(r.installment_id); setRecDate('') }}
                          className="p-2 rounded-xl transition-all duration-150"
                          style={{ color: '#34D399' }}
                          onMouseEnter={ev => ev.currentTarget.style.background = 'rgba(52,211,153,0.10)'}
                          onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}
                          title="Confirmar recebimento">
                          <CheckCircle size={15} />
                        </button>
                      )}
                      {/* Delete — apenas na primeira parcela */}
                      {r.installment_no === 1 && (
                        <button onClick={() => setDeleteId(r.id)}
                          className="p-2 rounded-xl transition-all duration-150"
                          style={{ color: '#FB7185' }}
                          onMouseEnter={ev => ev.currentTarget.style.background = 'rgba(251,113,133,0.10)'}
                          onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}
                          title="Excluir receita">
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
              <p className="text-sm">Nenhuma receita em {monthNamesLong[selectedMonth - 1]}</p>
            </div>
          )}
        </div>
      )}

      {/* Modal Nova Receita */}
      <Modal open={showNew} onClose={() => { setShowNew(false); resetForm() }} title="Nova Receita" size="lg">
        <form onSubmit={handleCreate} className="space-y-5">
          {/* Tipo */}
          <div>
            <label className="label">Tipo de receita</label>
            <div className="grid grid-cols-2 gap-3 mt-1">
              {REVENUE_MODES.map(mode => {
                const Icon = mode.icon
                return (
                  <button key={mode.key} type="button"
                    onClick={() => { setRevenueMode(mode.key); setForm(f => ({...f, project_id: '', title: ''})) }}
                    className="flex flex-col items-start gap-1.5 p-4 rounded-2xl text-left transition-all duration-150"
                    style={revenueMode === mode.key
                      ? { background: 'rgba(124,92,252,0.15)', border: '1px solid rgba(124,92,252,0.35)', color: '#A78BFA' }
                      : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-muted)' }
                    }>
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

          {/* Projeto */}
          {revenueMode === 'project' && (
            <div>
              <label className="label">Projeto *</label>
              <select className="input" value={form.project_id}
                onChange={e => handleProjectSelect(e.target.value)} required>
                <option value="">Selecione um projeto...</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.title}{p.client ? ` — ${p.client}` : ''}</option>
                ))}
              </select>
            </div>
          )}

          {/* Título */}
          <div>
            <label className="label">Título *</label>
            <input className="input" required placeholder="Nome da receita"
              value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
          </div>

          {/* Cliente */}
          {revenueMode === 'new' && (
            <div>
              <label className="label">Cliente</label>
              <input className="input" placeholder="Nome do cliente"
                value={form.client} onChange={e => setForm({...form, client: e.target.value})} />
            </div>
          )}

          {/* Parcelas individuais */}
          <div>
            <label className="label">Parcelas</label>
            <div className="space-y-2.5">
              {form.installments_list.map((inst, index) => (
                <div key={index}
                  className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end p-3 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div>
                    <label className="label text-[10px] mb-1">
                      Parcela {index + 1} — Valor *
                    </label>
                    <input type="number" step="0.01" min="0" className="input py-2 text-sm" required
                      placeholder="0,00"
                      value={inst.amount}
                      onChange={e => updateInstallmentField(index, 'amount', e.target.value)} />
                  </div>
                  <div>
                    <label className="label text-[10px] mb-1">Vencimento *</label>
                    <input type="date" className="input py-2 text-sm" required
                      value={inst.due_date}
                      onChange={e => updateInstallmentField(index, 'due_date', e.target.value)} />
                  </div>
                  <button type="button" onClick={() => removeInstallment(index)}
                    className="p-2 rounded-xl mb-0.5 transition-all duration-150"
                    style={{ color: '#FB7185' }}
                    onMouseEnter={ev => ev.currentTarget.style.background = 'rgba(251,113,133,0.10)'}
                    onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}>
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>

            <button type="button" onClick={addInstallment}
              className="mt-2 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150"
              style={{ border: '1px dashed rgba(124,92,252,0.25)', color: '#A78BFA' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(124,92,252,0.06)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <Plus size={13} /> Adicionar parcela
            </button>

            {totalAmount > 0 && (
              <div className="mt-2 px-4 py-2.5 rounded-xl text-xs"
                style={{ background: 'rgba(124,92,252,0.08)', border: '1px solid rgba(124,92,252,0.15)', color: '#A78BFA' }}>
                Total: <strong>{formatCurrency(totalAmount)}</strong>
                {form.installments_list.length > 1 && ` em ${form.installments_list.length} parcelas`}
              </div>
            )}
          </div>

          <div>
            <label className="label">Descrição</label>
            <textarea className="input resize-none" rows={2}
              value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
          </div>

          <div className="flex justify-end gap-3 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <button type="button" onClick={() => { setShowNew(false); resetForm() }} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary">Criar Receita</button>
          </div>
        </form>
      </Modal>

      {/* Modal Editar Parcela */}
      <Modal open={!!editInstall} onClose={() => setEditInstall(null)} title="Editar Parcela" size="sm">
        <form onSubmit={handleEditInstall} className="space-y-5">
          <div>
            <label className="label">Valor *</label>
            <input type="number" step="0.01" min="0" className="input" required
              value={editForm.amount} onChange={e => setEditForm({...editForm, amount: e.target.value})} />
          </div>
          <div>
            <label className="label">Vencimento *</label>
            <input type="date" className="input" required
              value={editForm.due_date} onChange={e => setEditForm({...editForm, due_date: e.target.value})} />
          </div>
          <div>
            <label className="label">Nota</label>
            <input className="input" placeholder="Observação opcional"
              value={editForm.note} onChange={e => setEditForm({...editForm, note: e.target.value})} />
          </div>
          <div className="flex justify-end gap-3 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <button type="button" onClick={() => setEditInstall(null)} className="btn-secondary">Cancelar</button>
            <button type="submit" className="btn-primary">Salvar alterações</button>
          </div>
        </form>
      </Modal>

      {/* Modal Confirmar Recebimento */}
      <Modal open={!!recModal} onClose={() => setRecModal(null)} title="Confirmar Recebimento" size="sm">
        <div className="space-y-5">
          <div>
            <label className="label">Data do recebimento</label>
            <input type="date" className="input" value={recDate} onChange={e => setRecDate(e.target.value)} />
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setRecModal(null)} className="btn-secondary">Cancelar</button>
            <button onClick={handleReceive} className="btn-primary">Confirmar Recebimento</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteId} onClose={() => setDeleteId(null)}
        onConfirm={() => handleDelete(deleteId)}
        title="Excluir receita"
        message="Todas as parcelas serão removidas permanentemente."
        danger
      />
    </div>
  )
}