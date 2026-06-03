import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Plus, CheckCircle, Trash2, TrendingDown, Tag, Edit, ChevronLeft, ChevronRight } from 'lucide-react'
import PageHeader    from '../../components/ui/PageHeader'
import Badge         from '../../components/ui/Badge'
import Spinner       from '../../components/ui/Spinner'
import Modal         from '../../components/ui/Modal'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { formatCurrency, formatDate, statusLabel, statusColors, monthNamesLong } from '../../utils/format'
import {
  getExpenses, createExpense, updateExpense,
  confirmPayment, deleteExpense, getCategories, createCategory
} from '../../services/financial.service'
import { toast } from 'react-hot-toast'

const ITEMS_PER_PAGE = 15

// ── Seletor de categoria com criação inline ───────────────────────
function CategorySelect({ categories, value, onChange, onCategoryCreated }) {
  const [showCreate, setShowCreate] = useState(false)
  const [newName,    setNewName]    = useState('')
  const [newColor,   setNewColor]   = useState('#7C5CFC')
  const [saving,     setSaving]     = useState(false)

  const PRESET_COLORS = [
    '#7C5CFC','#34D399','#FB7185','#38BDF8',
    '#FBBF24','#F472B6','#A78BFA','#6EE7B7'
  ]

  const handleCreate = async () => {
    if (!newName.trim()) return toast.error('Informe o nome da categoria')
    setSaving(true)
    try {
      const { data } = await createCategory({ name: newName.trim(), color: newColor })
      toast.success(`Categoria "${newName}" criada!`)
      onCategoryCreated(data.category)
      onChange(data.category.id)
      setNewName(''); setNewColor('#7C5CFC'); setShowCreate(false)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erro ao criar categoria')
    } finally { setSaving(false) }
  }

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
        <button
          type="button"
          onClick={() => setShowCreate(!showCreate)}
          title="Criar nova categoria"
          className="px-3 rounded-xl transition-all duration-150 shrink-0"
          style={{
            background: showCreate ? 'rgba(124,92,252,0.20)' : 'rgba(255,255,255,0.05)',
            border:     `1px solid ${showCreate ? 'rgba(124,92,252,0.35)' : 'rgba(255,255,255,0.08)'}`,
            color:      showCreate ? '#A78BFA' : 'var(--text-muted)'
          }}
        >
          <Tag size={14} />
        </button>
      </div>

      {showCreate && (
        <div
          className="mt-2 p-4 rounded-2xl"
          style={{
            background: 'rgba(124,92,252,0.06)',
            border:     '1px solid rgba(124,92,252,0.15)',
            animation:  'fadeInUp 0.15s ease'
          }}
        >
          <p className="text-xs font-bold mb-3" style={{ color: '#A78BFA' }}>
            Nova categoria
          </p>
          <input
            className="input flex-1 text-sm mb-3"
            placeholder="Nome da categoria"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
          />
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
                    background:    c,
                    outline:       newColor === c ? `2px solid ${c}` : 'none',
                    outlineOffset: 2,
                    transform:     newColor === c ? 'scale(1.2)' : 'scale(1)'
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

// ── Paginação ─────────────────────────────────────────────────────
function Pagination({ page, totalPages, onPrev, onNext }) {
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-between px-2 pt-4 mt-2"
      style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
      <button
        onClick={onPrev}
        disabled={page <= 1}
        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150"
        style={page <= 1
          ? { color: 'rgba(255,255,255,0.20)', cursor: 'not-allowed', background: 'transparent', border: '1px solid rgba(255,255,255,0.05)' }
          : { color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }
        }
      >
        <ChevronLeft size={14} /> Anterior
      </button>

      <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
        Página <span style={{ color: 'var(--text-primary)' }}>{page}</span> de{' '}
        <span style={{ color: 'var(--text-primary)' }}>{totalPages}</span>
      </span>

      <button
        onClick={onNext}
        disabled={page >= totalPages}
        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150"
        style={page >= totalPages
          ? { color: 'rgba(255,255,255,0.20)', cursor: 'not-allowed', background: 'transparent', border: '1px solid rgba(255,255,255,0.05)' }
          : { color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }
        }
      >
        Próxima <ChevronRight size={14} />
      </button>
    </div>
  )
}

// ── Modal via Portal — sempre fixo na viewport ────────────────────
// Renderiza diretamente no document.body para evitar que o contexto
// de empilhamento da tabela influencie a posição do modal.
function PortalModal({ open, onClose, title, children, size = 'md' }) {
  const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl' }

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    if (open) {
      document.addEventListener('keydown', handler)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      style={{
        position:       'fixed',
        inset:          0,
        zIndex:         9999,
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        padding:        '1rem',
      }}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position:       'absolute',
          inset:          0,
          background:     'rgba(5,8,22,0.80)',
          backdropFilter: 'blur(8px)',
        }}
      />

      {/* Painel — ligeiramente acima do centro */}
      <div
        className={`relative w-full ${sizes[size]} flex flex-col`}
        style={{
          maxHeight:    '90vh',
          background:   'linear-gradient(180deg, #0D152B, #081024)',
          border:       '1px solid rgba(255,255,255,0.08)',
          borderRadius: '24px',
          boxShadow:    '0 25px 60px rgba(0,0,0,0.55)',
          animation:    'fadeInUp 0.2s ease forwards',
          marginTop:    '-5vh', // sobe levemente do centro
        }}
      >
        {/* Brilho interno */}
        <div
          className="absolute inset-0 pointer-events-none rounded-3xl"
          style={{
            background: 'radial-gradient(circle at top right, rgba(124,92,252,0.12), transparent 60%)'
          }}
        />

        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-5 shrink-0"
          style={{
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            position:     'relative',
            zIndex:       1
          }}
        >
          <h2 className="text-[17px] font-bold" style={{ color: 'var(--text-primary)' }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl transition-all duration-150"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = '#fff' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div
          className="overflow-y-auto flex-1 px-6 py-5"
          style={{ position: 'relative', zIndex: 1 }}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body
  )
}

// ── Página principal ──────────────────────────────────────────────
const EMPTY_FORM = { title: '', amount: '', due_date: '', category_id: '', description: '' }

export default function ExpensesPage() {
  const now = new Date()

  // Dados e carregamento
  const [expenses,    setExpenses]    = useState([])
  const [categories,  setCategories]  = useState([])
  const [loading,     setLoading]     = useState(true)
  const [pagination,  setPagination]  = useState({ page: 1, pages: 1, total: 0 })

  // Modais
  const [showNew,     setShowNew]     = useState(false)
  const [editItem,    setEditItem]    = useState(null)
  const [payModal,    setPayModal]    = useState(null)
  const [deleteId,    setDeleteId]    = useState(null)

  // Filtros — todos preservados ao paginar
  const [statusFilter,   setStatusFilter]   = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [selectedMonth,  setSelectedMonth]  = useState(now.getMonth() + 1)
  const [selectedYear,   setSelectedYear]   = useState(now.getFullYear())
  const [currentPage,    setCurrentPage]    = useState(1)

  // Formulários
  const [form,    setForm]    = useState(EMPTY_FORM)
  const [payDate, setPayDate] = useState('')

  // Carrega despesas respeitando todos os filtros ativos
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await getExpenses({
        status:      statusFilter   || undefined,
        category_id: categoryFilter || undefined,
        month:       selectedMonth,
        year:        selectedYear,
        page:        currentPage,
        limit:       ITEMS_PER_PAGE,
      })
      setExpenses(data.data || [])
      setPagination(data.pagination || { page: 1, pages: 1, total: 0 })
    } finally {
      setLoading(false)
    }
  }, [statusFilter, categoryFilter, selectedMonth, selectedYear, currentPage])

  useEffect(() => { load() }, [load])

  // Recarrega categorias automaticamente quando uma nova é criada
  const loadCategories = useCallback(async () => {
    try {
      const { data } = await getCategories()
      setCategories(data.categories || [])
    } catch { /* silencioso */ }
  }, [])

  useEffect(() => { loadCategories() }, [loadCategories])

  // Resetar página ao mudar qualquer filtro
  const handleStatusFilter = (value) => {
    setStatusFilter(value)
    setCurrentPage(1)
  }
  const handleCategoryFilter = (value) => {
    setCategoryFilter(value)
    setCurrentPage(1)
  }
  const handleMonthChange = (m) => {
    setSelectedMonth(m)
    setCurrentPage(1)
  }
  const handleYearChange = (y) => {
    setSelectedYear(y)
    setCurrentPage(1)
  }

  // CRUD
  const handleCreate = async (e) => {
    e.preventDefault()
    try {
      await createExpense({ ...form, amount: parseFloat(form.amount) })
      toast.success('Despesa criada!')
      setShowNew(false)
      setForm(EMPTY_FORM)
      setCurrentPage(1)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erro ao criar despesa')
    }
  }

  const handleEdit = async (e) => {
    e.preventDefault()
    try {
      await updateExpense(editItem.id, { ...form, amount: parseFloat(form.amount) })
      toast.success('Despesa atualizada!')
      setEditItem(null)
      setForm(EMPTY_FORM)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erro ao editar despesa')
    }
  }

  const openEdit = (expense) => {
    setForm({
      title:       expense.title,
      amount:      expense.amount,
      due_date:    expense.due_date?.slice(0, 10) || '',
      category_id: expense.category_id || '',
      description: expense.description || ''
    })
    setEditItem(expense)
  }

  const handlePay = async () => {
    if (!payDate) return toast.error('Informe a data de pagamento')
    try {
      await confirmPayment(payModal, { paid_date: payDate })
      toast.success('Pagamento confirmado!')
      setPayModal(null); setPayDate('')
      load()
    } catch {
      toast.error('Erro ao confirmar pagamento')
    }
  }

  const handleDelete = async (id) => {
    try {
      await deleteExpense(id)
      toast.success('Despesa excluída')
      // Se era o último item da página, volta uma página
      if (expenses.length === 1 && currentPage > 1) {
        setCurrentPage(p => p - 1)
      } else {
        load()
      }
    } catch {
      toast.error('Erro ao excluir')
    }
  }

  // Totais apenas dos itens da página atual
  const total   = expenses.reduce((s, e) => s + parseFloat(e.amount), 0)
  const paid    = expenses.filter(e => e.status === 'paid').reduce((s, e) => s + parseFloat(e.amount), 0)
  const pending = total - paid

  // Formulário compartilhado (criação e edição)
  const FormBody = (
    <form onSubmit={editItem ? handleEdit : handleCreate} className="space-y-5">
      <div>
        <label className="label">Título *</label>
        <input
          className="input"
          required
          value={form.title}
          onChange={e => setForm({ ...form, title: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Valor *</label>
          <input
            type="number"
            step="0.01"
            min="0"
            className="input"
            required
            value={form.amount}
            onChange={e => setForm({ ...form, amount: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Vencimento *</label>
          <input
            type="date"
            className="input"
            required
            value={form.due_date}
            onChange={e => setForm({ ...form, due_date: e.target.value })}
          />
        </div>
      </div>

      <CategorySelect
        categories={categories}
        value={form.category_id}
        onChange={(id) => setForm({ ...form, category_id: id })}
        onCategoryCreated={(cat) => {
          setCategories(prev => [...prev, cat])
          loadCategories() // sincroniza o filtro também
        }}
      />

      <div>
        <label className="label">Descrição</label>
        <textarea
          className="input resize-none"
          rows={2}
          value={form.description}
          onChange={e => setForm({ ...form, description: e.target.value })}
        />
      </div>

      <div
        className="flex justify-end gap-3 pt-2"
        style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
      >
        <button
          type="button"
          onClick={() => { setShowNew(false); setEditItem(null); setForm(EMPTY_FORM) }}
          className="btn-secondary"
        >
          Cancelar
        </button>
        <button type="submit" className="btn-primary">
          {editItem ? 'Salvar alterações' : 'Criar Despesa'}
        </button>
      </div>
    </form>
  )

  return (
    <div className="fade-in">
      <PageHeader
        title="Contas a Pagar"
        tag="Financeiro"
        subtitle="Gerencie despesas e confirme pagamentos"
        actions={
          <button
            onClick={() => { setShowNew(true); setForm(EMPTY_FORM) }}
            className="btn-primary"
          >
            <Plus size={15} /> Nova Despesa
          </button>
        }
      />

      {/* ── Filtro de mês ── */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex gap-1 flex-wrap">
          {monthNamesLong.map((m, i) => (
            <button
              key={i}
              onClick={() => handleMonthChange(i + 1)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150"
              style={selectedMonth === i + 1
                ? { background: 'rgba(124,92,252,0.20)', color: '#A78BFA', border: '1px solid rgba(124,92,252,0.30)' }
                : { background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.06)' }
              }
            >
              {m.slice(0, 3)}
            </button>
          ))}
        </div>
        <select
          className="input"
          style={{ width: 'auto', minWidth: 90 }}
          value={selectedYear}
          onChange={e => handleYearChange(parseInt(e.target.value))}
        >
          {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {/* ── Cards totalizadores ── */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: `Total — ${monthNamesLong[selectedMonth - 1]}`, value: total,   color: 'var(--text-primary)' },
          { label: 'Pago',                                          value: paid,    color: '#34D399' },
          { label: 'Pendente',                                      value: pending, color: '#FBBF24' },
        ].map(item => (
          <div key={item.label} className="card p-5">
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-2"
              style={{ color: 'var(--text-muted)' }}
            >
              {item.label}
            </p>
            <p className="text-2xl font-bold" style={{ color: item.color }}>
              {formatCurrency(item.value)}
            </p>
          </div>
        ))}
      </div>

      {/* ── Filtros de status e categoria ── */}
      <div className="flex flex-wrap items-center gap-3 mb-5">

        {/* Status — preservados exatamente */}
        <div className="flex gap-2 flex-wrap">
          {[
            { value: '',        label: 'Todas'    },
            { value: 'pending', label: 'Pendente' },
            { value: 'paid',    label: 'Pago'     },
            { value: 'overdue', label: 'Atrasado' },
          ].map(f => (
            <button
              key={f.value}
              onClick={() => handleStatusFilter(f.value)}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150"
              style={statusFilter === f.value
                ? { background: 'rgba(124,92,252,0.20)', color: '#A78BFA', border: '1px solid rgba(124,92,252,0.30)' }
                : { background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.06)' }
              }
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Separador */}
        {categories.length > 0 && (
          <div className="w-px h-5 shrink-0" style={{ background: 'rgba(255,255,255,0.08)' }} />
        )}

        {/* Filtro de categoria — novo, cumulativo com status */}
        {categories.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
              Categoria:
            </span>
            <select
              className="input text-xs py-2"
              style={{ minWidth: 140, height: 'auto' }}
              value={categoryFilter}
              onChange={e => handleCategoryFilter(e.target.value)}
            >
              <option value="">Todas</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Indicador de total filtrado */}
        <span
          className="ml-auto text-xs font-semibold px-3 py-2 rounded-xl shrink-0"
          style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          {pagination.total} {pagination.total === 1 ? 'registro' : 'registros'}
        </span>
      </div>

      {/* ── Tabela ── */}
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
                  style={{
                    borderBottom: i < expenses.length - 1
                      ? '1px solid rgba(255,255,255,0.03)'
                      : 'none'
                  }}
                  onMouseEnter={ev => ev.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                  onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}
                >
                  <td className="table-cell">
                    <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                      {e.title}
                    </p>
                    {e.description && (
                      <p
                        className="text-xs mt-0.5 truncate max-w-[200px]"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {e.description}
                      </p>
                    )}
                  </td>
                  <td className="table-cell hidden md:table-cell">
                    {e.category_name ? (
                      <span
                        className="inline-flex items-center gap-1.5 text-xs font-medium"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ background: e.category_color }}
                        />
                        {e.category_name}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>—</span>
                    )}
                  </td>
                  <td className="table-cell font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                    {formatCurrency(e.amount)}
                  </td>
                  <td className="table-cell hidden sm:table-cell text-sm" style={{ color: 'var(--text-muted)' }}>
                    {formatDate(e.due_date)}
                  </td>
                  <td className="table-cell">
                    <Badge className={statusColors[e.status]}>
                      {statusLabel[e.status]}
                    </Badge>
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(e)}
                        className="p-2 rounded-xl transition-all duration-150"
                        style={{ color: '#A78BFA' }}
                        onMouseEnter={ev => ev.currentTarget.style.background = 'rgba(124,92,252,0.10)'}
                        onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}
                        title="Editar"
                      >
                        <Edit size={15} />
                      </button>
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

          {expenses.length === 0 && !loading && (
            <div className="py-16 text-center" style={{ color: 'var(--text-muted)' }}>
              <TrendingDown size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">
                Nenhuma despesa em {monthNamesLong[selectedMonth - 1]}
              </p>
            </div>
          )}

          {/* Paginação — usa total real da API */}
          <Pagination
            page={currentPage}
            totalPages={pagination.pages || 1}
            onPrev={() => setCurrentPage(p => Math.max(1, p - 1))}
            onNext={() => setCurrentPage(p => Math.min(pagination.pages, p + 1))}
          />
        </div>
      )}

      {/* ── Modal Nova / Editar Despesa (Portal — sempre fixo na viewport) ── */}
      <PortalModal
        open={showNew || !!editItem}
        onClose={() => { setShowNew(false); setEditItem(null); setForm(EMPTY_FORM) }}
        title={editItem ? 'Editar Despesa' : 'Nova Despesa'}
        size="md"
      >
        {FormBody}
      </PortalModal>

      {/* ── Modal Confirmar Pagamento ── */}
      <PortalModal
        open={!!payModal}
        onClose={() => { setPayModal(null); setPayDate('') }}
        title="Confirmar Pagamento"
        size="sm"
      >
        <div className="space-y-5">
          <div>
            <label className="label">Data do pagamento</label>
            <input
              type="date"
              className="input"
              value={payDate}
              onChange={e => setPayDate(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => { setPayModal(null); setPayDate('') }}
              className="btn-secondary"
            >
              Cancelar
            </button>
            <button onClick={handlePay} className="btn-primary">
              Confirmar Pagamento
            </button>
          </div>
        </div>
      </PortalModal>

      {/* ── Confirm exclusão ── */}
      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => handleDelete(deleteId)}
        title="Excluir despesa"
        message="Esta ação não pode ser desfeita. A despesa será removida permanentemente."
        danger
      />
    </div>
  )
}