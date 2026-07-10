import { useState, useEffect, useCallback } from 'react'
import { Plus, CheckCircle, Trash2, TrendingDown, Edit, ChevronLeft, ChevronRight, Repeat } from 'lucide-react'
import PageHeader     from '../../components/ui/PageHeader'
import Badge          from '../../components/ui/Badge'
import Spinner        from '../../components/ui/Spinner'
import PortalModal     from '../../components/ui/PortalModal'
import ConfirmDialog   from '../../components/ui/ConfirmDialog'
import NewExpenseModal from '../../components/modals/NewExpenseModal'
import { formatCurrency, formatDate, statusLabel, statusColors, monthNamesLong } from '../../utils/format'
import {
  getExpenses, confirmPayment, deleteExpense, getCategories
} from '../../services/financial.service'
import { toast } from 'react-hot-toast'

const ITEMS_PER_PAGE = 15

// ── Paginação ─────────────────────────────────────────────────────
function Pagination({ page, totalPages, onPrev, onNext }) {
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-between px-2 pt-4 pb-5 mt-2"
      style={{ borderTop: '1px solid var(--border-subtle)' }}>
      <button
        onClick={onPrev}
        disabled={page <= 1}
        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150"
        style={page <= 1
          ? { color: 'rgba(255,255,255,0.20)', cursor: 'not-allowed', background: 'transparent', border: '1px solid var(--border-subtle)' }
          : { color: 'var(--text-secondary)', background: 'var(--bg-surface-2)', border: '1px solid var(--border-subtle)' }
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
          ? { color: 'rgba(255,255,255,0.20)', cursor: 'not-allowed', background: 'transparent', border: '1px solid var(--border-subtle)' }
          : { color: 'var(--text-secondary)', background: 'var(--bg-surface-2)', border: '1px solid var(--border-subtle)' }
        }
      >
        Próxima <ChevronRight size={14} />
      </button>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────
export default function ExpensesPage() {
  const now = new Date()

  const [expenses,    setExpenses]    = useState([])
  const [categories,  setCategories]  = useState([])
  const [loading,     setLoading]     = useState(true)
  const [pagination,  setPagination]  = useState({ page: 1, pages: 1, total: 0 })

  const [showNew,     setShowNew]     = useState(false)
  const [editItem,    setEditItem]    = useState(null)
  const [payModal,    setPayModal]    = useState(null)
  const [deleteId,    setDeleteId]    = useState(null)

  const [statusFilter,   setStatusFilter]   = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [selectedMonth,  setSelectedMonth]  = useState(now.getMonth() + 1)
  const [selectedYear,   setSelectedYear]   = useState(now.getFullYear())
  const [currentPage,    setCurrentPage]    = useState(1)

  const [payDate, setPayDate] = useState('')

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
      setExpenses([...(data.data || [])].sort((a, b) => a.title.localeCompare(b.title, 'pt-BR')))
      setPagination(data.pagination || { page: 1, pages: 1, total: 0 })
    } finally {
      setLoading(false)
    }
  }, [statusFilter, categoryFilter, selectedMonth, selectedYear, currentPage])

  useEffect(() => { load() }, [load])

  const loadCategories = useCallback(async () => {
  try {
    const { data } = await getCategories()
    const sortedCategories = [...(data.categories || [])].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
    setCategories(sortedCategories)
  } catch { /* silencioso */ }
}, [])

  useEffect(() => { loadCategories() }, [loadCategories])

  const handleStatusFilter   = (value) => { setStatusFilter(value);   setCurrentPage(1) }
  const handleCategoryFilter = (value) => { setCategoryFilter(value); setCurrentPage(1) }
  const handleMonthChange    = (m)     => { setSelectedMonth(m);      setCurrentPage(1) }
  const handleYearChange     = (y)     => { setSelectedYear(y);       setCurrentPage(1) }

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
      if (expenses.length === 1 && currentPage > 1) {
        setCurrentPage(p => p - 1)
      } else {
        load()
      }
    } catch {
      toast.error('Erro ao excluir')
    }
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

      {/* ── Filtro de mês ── */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex gap-1 flex-wrap">
          {monthNamesLong.map((m, i) => (
            <button
              key={i}
              onClick={() => handleMonthChange(i + 1)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150"
              style={selectedMonth === i + 1
                ? { background: 'rgba(116, 116, 116, 0.88)', color: 'var(--text-onbrand)', border: '1px solid rgba(0, 0, 0, 0.3)' }
                : { background: 'var(--bg-surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }
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
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-2" style={{ color: 'var(--text-muted)' }}>
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
                ? { background: 'rgba(116, 116, 116, 0.88)', color: 'var(--text-onbrand)', border: '1px solid rgba(0, 0, 0, 0.3)' }
                : { background: 'var(--bg-surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }
              }
            >
              {f.label}
            </button>
          ))}
        </div>

        {categories.length > 0 && (
          <div className="w-px h-5 shrink-0" style={{ background: 'rgba(116, 116, 116, 0.88)' }} />
        )}

        {categories.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Categoria:</span>
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

        <span
          className="ml-auto text-xs font-semibold px-3 py-2 rounded-xl shrink-0"
          style={{ background: 'var(--bg-surface-2)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
        >
          {pagination.total} {pagination.total === 1 ? 'registro' : 'registros'}
        </span>
      </div>

      {/* ── Tabela ── */}
      {loading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-y-auto" style={{ maxHeight: '55vh' }}>
            <table className="w-full">
              <thead style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <tr>
                  <th className="table-header">Título</th>
                  <th className="table-header hidden md:table-cell">Categoria</th>
                  <th className="table-header">Valor</th>
                  <th className="table-header hidden sm:table-cell">Vencimento</th>
                  <th className="table-header hidden lg:table-cell">Pagamento</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Ações</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((e, i) => (
                  <tr
                    key={e.id}
                    style={{ borderBottom: i < expenses.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}
                    onMouseEnter={ev => ev.currentTarget.style.background = 'var(--bg-hover)'}
                    onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}
                  >
                    <td className="table-cell">
                      <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                        {e.title}
                      </p>
                      {/* ── Badge recorrente ── */}
                      {e.is_recurring && (
                        <span
                          className="inline-flex items-center gap-1 text-xs mt-0.5"
                          style={{ color: '#A78BFA' }}
                        >
                          <Repeat size={11} />
                          Recorrente
                        </span>
                      )}
                      {e.description && !e.is_recurring && (
                        <p className="text-xs mt-0.5 truncate max-w-[200px]" style={{ color: 'var(--text-muted)' }}>
                          {e.description}
                        </p>
                      )}
                      {e.description && e.is_recurring && (
                        <p className="text-xs truncate max-w-[200px]" style={{ color: 'var(--text-muted)' }}>
                          {e.description}
                        </p>
                      )}
                    </td>
                    <td className="table-cell hidden md:table-cell">
                      {e.category_name ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                          <span className="h-2 w-2 rounded-full shrink-0" style={{ background: e.category_color }} />
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
                    <td className="table-cell hidden lg:table-cell text-sm" style={{color: e.paid_date? '#34D399': 'var(--text-muted)'}}
                    >{e.paid_date? formatDate(e.paid_date): '—'} </td>
                    <td className="table-cell">
                      <Badge className={statusColors[e.status]}>
                        {statusLabel[e.status]}
                      </Badge>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditItem(e)}
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
              <div className="py-16 text-center" style={{ color: 'var(--text-primary)' }}>
                <TrendingDown size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">Nenhuma despesa em {monthNamesLong[selectedMonth - 1]}</p>
              </div>
            )}
          </div>

          <Pagination
            page={currentPage}
            totalPages={pagination.pages || 1}
            onPrev={() => setCurrentPage(p => Math.max(1, p - 1))}
            onNext={() => setCurrentPage(p => Math.min(pagination.pages, p + 1))}
          />
        </div>
      )}

      {/* ── Modal Nova / Editar Despesa ── */}
      <NewExpenseModal
        open={showNew || !!editItem}
        expense={editItem}
        onClose={() => { setShowNew(false); setEditItem(null) }}
        onSuccess={() => {
          if (!editItem) setCurrentPage(1)
          setShowNew(false)
          setEditItem(null)
          load()
        }}
      />

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
            <input type="date" className="input" value={payDate} onChange={e => setPayDate(e.target.value)} />
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => { setPayModal(null); setPayDate('') }} className="btn-secondary">
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