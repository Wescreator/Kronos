import { useState, useEffect, useCallback } from 'react'
import { Plus, CheckCircle, Trash2, TrendingDown, Tag } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import Badge from '../../components/ui/Badge'
import Spinner from '../../components/ui/Spinner'
import Modal from '../../components/ui/Modal'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { formatCurrency, formatDate, statusLabel, statusColors } from '../../utils/format'
import {
  getExpenses, createExpense, confirmPayment,
  deleteExpense, getCategories, createCategory
} from '../../services/financial.service'
import { toast } from 'react-hot-toast'

const STATUS_FILTERS = [
  { value: '',        label: 'Todas' },
  { value: 'pending', label: 'Pendente' },
  { value: 'paid',    label: 'Pago' },
  { value: 'overdue', label: 'Atrasado' },
]

// Componente interno para select de categoria com criação inline
function CategorySelect({ categories, value, onChange, onCategoryCreated }) {
  const [showCreate, setShowCreate] = useState(false)
  const [newName,    setNewName]    = useState('')
  const [newColor,   setNewColor]   = useState('#7C5CFC')
  const [saving,     setSaving]     = useState(false)

  const handleCreate = async () => {
    if (!newName.trim()) return toast.error('Informe o nome da categoria')
    setSaving(true)
    try {
      const { data } = await createCategory({ name: newName.trim(), color: newColor })
      toast.success(`Categoria "${newName}" criada!`)
      onCategoryCreated(data.category)
      onChange(data.category.id)
      setNewName('')
      setNewColor('#7C5CFC')
      setShowCreate(false)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erro ao criar categoria')
    } finally { setSaving(false) }
  }

  const PRESET_COLORS = [
    '#7C5CFC','#34D399','#FB7185','#38BDF8','#FBBF24','#F472B6','#A78BFA','#6EE7B7'
  ]

  return (
    <div>
      <label className="label">Categoria</label>
      <div className="flex gap-2">
        <select
          className="input flex-1"
          value={value}
          onChange={e => onChange(e.target.value)}
        >
          <option value="">Sem categoria</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        {/* Botão discreto para criar categoria */}
        <button
          type="button"
          onClick={() => setShowCreate(!showCreate)}
          title="Criar nova categoria"
          className="px-3 rounded-xl transition-all duration-150 shrink-0"
          style={{
            background: showCreate ? 'rgba(124,92,252,0.20)' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${showCreate ? 'rgba(124,92,252,0.35)' : 'rgba(255,255,255,0.08)'}`,
            color: showCreate ? '#A78BFA' : 'var(--text-muted)'
          }}
        >
          <Tag size={14} />
        </button>
      </div>

      {/* Painel de criação inline */}
      {showCreate && (
        <div
          className="mt-2 p-4 rounded-2xl"
          style={{
            background: 'rgba(124,92,252,0.06)',
            border: '1px solid rgba(124,92,252,0.15)',
            animation: 'fadeInUp 0.15s ease'
          }}
        >
          <p className="text-xs font-bold mb-3" style={{ color: '#A78BFA' }}>
            Nova categoria
          </p>
          <div className="flex gap-2 mb-3">
            <input
              className="input flex-1 text-sm"
              placeholder="Nome da categoria"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
            />
          </div>
          {/* Seletor de cor */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Cor:</span>
            <div className="flex gap-1.5">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewColor(c)}
                  className="h-5 w-5 rounded-full transition-all duration-150"
                  style={{
                    background: c,
                    outline: newColor === c ? `2px solid ${c}` : 'none',
                    outlineOffset: 2,
                    transform: newColor === c ? 'scale(1.2)' : 'scale(1)'
                  }}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="btn-secondary text-xs py-1.5 px-3"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={saving}
              className="btn-primary text-xs py-1.5 px-3"
            >
              {saving ? 'Salvando...' : 'Criar categoria'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ExpensesPage() {
  const [expenses,     setExpenses]     = useState([])
  const [categories,   setCategories]   = useState([])
  const [loading,      setLoading]      = useState(true)
  const [showNew,      setShowNew]      = useState(false)
  const [payModal,     setPayModal]     = useState(null)
  const [deleteId,     setDeleteId]     = useState(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [form, setForm] = useState({
    title:'', amount:'', due_date:'', category_id:'', description:''
  })
  const [payDate, setPayDate] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await getExpenses({ status: statusFilter, limit: 100 })
      setExpenses(data.data || [])
    } finally { setLoading(false) }
  }, [statusFilter])

  const loadCategories = async () => {
    const { data } = await getCategories()
    setCategories(data.categories || [])
  }

  useEffect(() => { load() },          [load])
  useEffect(() => { loadCategories() }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    try {
      await createExpense({ ...form, amount: parseFloat(form.amount) })
      toast.success('Despesa criada!')
      setShowNew(false)
      setForm({ title:'', amount:'', due_date:'', category_id:'', description:'' })
      load()
    } catch (err) { toast.error(err.response?.data?.message || 'Erro ao criar despesa') }
  }

  const handlePay = async () => {
    if (!payDate) return toast.error('Informe a data de pagamento')
    try {
      await confirmPayment(payModal, { paid_date: payDate })
      toast.success('Pagamento confirmado!')
      setPayModal(null); setPayDate(''); load()
    } catch { toast.error('Erro ao confirmar pagamento') }
  }

  const handleDelete = async (id) => {
    try { await deleteExpense(id); toast.success('Despesa excluída'); load() }
    catch { toast.error('Erro ao excluir') }
  }

  const total   = expenses.reduce((s, e) => s + parseFloat(e.amount), 0)
  const paid    = expenses.filter(e => e.status === 'paid').reduce((s, e) => s + parseFloat(e.amount), 0)
  const pending = total - paid

  return (
    <div className="fade-in">
      <PageHeader
        title="Contas a Pagar"
        tag="Financeiro"
        subtitle="Gerencie despesas e confirme pagamentos"
        actions={
          <button onClick={() => setShowNew(true)} className="btn-primary">
            <Plus size={15} /> Nova Despesa
          </button>
        }
      />

      {/* Totalizadores */}
      <div className="grid grid-cols-3 gap-4 mb-7">
        {[
          { label: 'Total geral', value: total,   color: 'var(--text-primary)' },
          { label: 'Pago',        value: paid,    color: '#34D399' },
          { label: 'Pendente',    value: pending, color: '#FBBF24' },
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
        {STATUS_FILTERS.map(f => (
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
                <th className="table-header hidden md:table-cell">Categoria</th>
                <th className="table-header">Valor</th>
                <th className="table-header hidden sm:table-cell">Vencimento</th>
                <th className="table-header">Status</th>
                <th className="table-header">Ações</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((e, i) => (
                <tr
                  key={e.id}
                  style={{ borderBottom: i < expenses.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none' }}
                  onMouseEnter={ev => ev.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                  onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}
                >
                  <td className="table-cell">
                    <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{e.title}</p>
                    {e.description && (
                      <p className="text-xs mt-0.5 truncate max-w-[200px]" style={{ color: 'var(--text-muted)' }}>
                        {e.description}
                      </p>
                    )}
                  </td>
                  <td className="table-cell hidden md:table-cell">
                    {e.category_name ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium"
                        style={{ color: 'var(--text-secondary)' }}>
                        <span className="h-2 w-2 rounded-full" style={{ background: e.category_color }} />
                        {e.category_name}
                      </span>
                    ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                  </td>
                  <td className="table-cell font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                    {formatCurrency(e.amount)}
                  </td>
                  <td className="table-cell hidden sm:table-cell text-sm" style={{ color: 'var(--text-muted)' }}>
                    {formatDate(e.due_date)}
                  </td>
                  <td className="table-cell">
                    <Badge className={statusColors[e.status]}>{statusLabel[e.status]}</Badge>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-1">
                      {e.status === 'pending' && (
                        <button
                          onClick={() => { setPayModal(e.id); setPayDate('') }}
                          className="p-2 rounded-xl transition-all duration-150"
                          style={{ color: '#34D399' }}
                          onMouseEnter={ev => ev.currentTarget.style.background = 'rgba(52,211,153,0.10)'}
                          onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}
                          title="Confirmar pagamento"
                        >
                          <CheckCircle size={15} />
                        </button>
                      )}
                      <button
                        onClick={() => setDeleteId(e.id)}
                        className="p-2 rounded-xl transition-all duration-150"
                        style={{ color: '#FB7185' }}
                        onMouseEnter={ev => ev.currentTarget.style.background = 'rgba(251,113,133,0.10)'}
                        onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}
                        title="Excluir"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {expenses.length === 0 && (
            <div className="py-16 text-center" style={{ color: 'var(--text-muted)' }}>
              <TrendingDown size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Nenhuma despesa encontrada</p>
            </div>
          )}
        </div>
      )}

      {/* Modal Nova Despesa */}
      <Modal open={showNew} onClose={() => setShowNew(false)} title="Nova Despesa">
        <form onSubmit={handleCreate} className="space-y-5">
          <div>
            <label className="label">Título *</label>
            <input className="input" required value={form.title}
              onChange={e => setForm({...form, title: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Valor *</label>
              <input type="number" step="0.01" min="0" className="input" required
                value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} />
            </div>
            <div>
              <label className="label">Vencimento *</label>
              <input type="date" className="input" required
                value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})} />
            </div>
          </div>

          {/* CategorySelect com criação inline */}
          <CategorySelect
            categories={categories}
            value={form.category_id}
            onChange={(id) => setForm({...form, category_id: id})}
            onCategoryCreated={(cat) => setCategories(prev => [...prev, cat])}
          />

          <div>
            <label className="label">Descrição</label>
            <textarea className="input resize-none" rows={2}
              value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
          </div>

          <div className="flex justify-end gap-3 pt-2"
            style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <button type="button" onClick={() => setShowNew(false)} className="btn-secondary">
              Cancelar
            </button>
            <button type="submit" className="btn-primary">Criar Despesa</button>
          </div>
        </form>
      </Modal>

      {/* Modal Confirmar Pagamento */}
      <Modal open={!!payModal} onClose={() => setPayModal(null)} title="Confirmar Pagamento" size="sm">
        <div className="space-y-5">
          <div>
            <label className="label">Data do pagamento</label>
            <input type="date" className="input" value={payDate}
              onChange={e => setPayDate(e.target.value)} />
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setPayModal(null)} className="btn-secondary">Cancelar</button>
            <button onClick={handlePay} className="btn-primary">Confirmar Pagamento</button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteId} onClose={() => setDeleteId(null)}
        onConfirm={() => handleDelete(deleteId)}
        title="Excluir despesa"
        message="Esta ação não pode ser desfeita. A despesa será removida permanentemente."
        danger
      />
    </div>
  )
}