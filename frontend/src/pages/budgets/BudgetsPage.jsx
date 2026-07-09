import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, Calculator, DollarSign, User, CheckCircle2, Clock, Layers, Settings } from 'lucide-react'
import { useBudgets }   from '../../hooks/useBudgets'
import useAuthStore     from '../../store/authStore'
import { can }          from '../../utils/permissions'
import PageHeader       from '../../components/ui/PageHeader'
import Spinner          from '../../components/ui/Spinner'
import EmptyState       from '../../components/ui/EmptyState'
import NewBudgetModal   from '../../components/modals/NewBudgetModal'
import { formatDate }   from '../../utils/format'

const STATUS_META = {
  draft:     { label: 'Rascunho',   color: 'rgba(107,114,128,0.12)', text: '#6B7280', icon: Clock },
  finalized: { label: 'Finalizado', color: 'rgba(52,211,153,0.12)',  text: '#34D399', icon: CheckCircle2 },
}

const STATUS_FILTERS = [
  { value: '',          label: 'Todos'      },
  { value: 'draft',     label: 'Rascunhos'  },
  { value: 'finalized', label: 'Finalizados'},
]

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.draft
  const Icon = meta.icon
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ background: meta.color, color: meta.text }}
    >
      <Icon size={11} /> {meta.label}
    </span>
  )
}

function BudgetCard({ budget, idx }) {
  const totalAmount = parseFloat(budget.total_amount) || 0

  return (
    <Link
      to={`/app/budgets/${budget.id}`}
      className="proposal-card block"
      style={{
        background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 20,
        overflow: 'hidden', boxShadow: '0 4px 20px rgba(15,23,42,0.10)',
        animationDelay: `${idx * 0.04}s`,
      }}
    >
      <div style={{
        height: 6,
        background: `linear-gradient(90deg, ${STATUS_META[budget.status]?.text || '#9CA3AF'}, transparent)`,
        opacity: 0.6,
      }} />

      <div style={{ padding: '16px 18px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: '#374151', textTransform: 'uppercase' }}>
            {budget.budget_number}
          </span>
          <StatusBadge status={budget.status} />
        </div>

        <h3 style={{
          color: 'var(--text-primary)', fontSize: 14, fontWeight: 700, lineHeight: 1.38, marginBottom: 6,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {budget.title}
        </h3>

        {budget.client_name && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 12 }}>
            <User size={11} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {budget.client_name}
            </span>
          </div>
        )}

        <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', marginBottom: 12 }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <DollarSign size={11} style={{ color: '#34D399', flexShrink: 0 }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#34D399' }}>
              {totalAmount > 0 ? `R$ ${totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}
            </span>
          </div>
          {Number(budget.project_area) > 0 && (
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {Number(budget.project_area).toLocaleString('pt-BR')} m²
            </span>
          )}
        </div>

        <div style={{ fontSize: 11, color: '#9CA3AF' }}>
          Criado em {formatDate(budget.created_at)}
        </div>
      </div>
    </Link>
  )
}

export default function BudgetsPage() {
  const { user } = useAuthStore()
  const role     = user?.role || 'member'
  const canCreate      = can(role, 'budgets', 'create')
  const canManageConfig = can(role, 'budgets', 'manageConfig')

  const [showModal,    setShowModal]    = useState(false)
  const [search,       setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const { budgets, loading, refetch } = useBudgets({ search, status: statusFilter })

  const stats = useMemo(() => ({
    total:     budgets.length,
    draft:     budgets.filter(b => b.status === 'draft').length,
    finalized: budgets.filter(b => b.status === 'finalized').length,
  }), [budgets])

  return (
    <div className="fade-in">
      <style>{`
        .proposal-card { transition: transform 0.22s cubic-bezier(.22,1,.36,1), box-shadow 0.22s cubic-bezier(.22,1,.36,1), border-color 0.20s ease; will-change: transform; }
        .proposal-card:hover { transform: translateY(-5px); box-shadow: 0 24px 52px rgba(15,23,42,0.18), 0 0 0 1px rgba(107,114,128,0.25) !important; border-color: rgba(107,114,128,0.25) !important; }
        .prop-search:focus-within { border-color: rgba(107,114,128,0.45) !important; box-shadow: 0 0 0 3px rgba(107,114,128,0.12); }
        .prop-filter-btn { transition: all 0.15s ease; }
        .prop-filter-btn:hover { transform: translateY(-1px); }
      `}</style>

      <PageHeader
        title="Orçamentos"
        subtitle="Gerencie orçamentos dinâmicos"
        actions={
          <div className="flex items-center gap-2">
            {canManageConfig && (
              <Link to="/app/budgets/config" className="btn-secondary">
                <Settings size={14} /> Configurações
              </Link>
            )}
            {canCreate && (
              <button onClick={() => setShowModal(true)} className="btn-primary">
                Novo Orçamento
              </button>
            )}
          </div>
        }
      />

      {!loading && budgets.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-7">
          {[
            { label: 'Total',       value: stats.total,     icon: <Layers size={17} />,      iconBg: 'rgba(107,114,128,0.14)', iconColor: '#374151', valueColor: 'var(--text-primary)' },
            { label: 'Rascunhos',   value: stats.draft,     icon: <Clock size={17} />,        iconBg: 'rgba(0,0,0,0.04)',       iconColor: '#9CA3AF', valueColor: 'var(--text-secondary)' },
            { label: 'Finalizados', value: stats.finalized, icon: <CheckCircle2 size={17} />, iconBg: 'rgba(52,211,153,0.10)',  iconColor: '#34D399', valueColor: '#34D399' },
          ].map(item => (
            <div key={item.label} className="card p-5" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, flexShrink: 0, background: item.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: item.iconColor }}>{item.icon}</span>
              </div>
              <div>
                <p style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 3 }}>{item.label}</p>
                <p style={{ fontSize: 24, fontWeight: 700, lineHeight: 1, color: item.valueColor }}>{item.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 mb-7">
        <div className="prop-search relative" style={{ flex: '1 1 0%', maxWidth: 340, background: '#FFFFFF', borderRadius: 14, border: '1px solid #414141' }}>
          <Search size={14} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input
            style={{ width: '100%', background: 'transparent', paddingLeft: 38, paddingRight: 16, paddingTop: 10, paddingBottom: 10, fontSize: 13, color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }}
            placeholder="Buscar por número, título ou cliente..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          {STATUS_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className="prop-filter-btn px-3.5 py-2 rounded-xl text-xs font-semibold"
              style={statusFilter === f.value
                ? { background: 'rgba(55,65,81,0.10)', color: '#374151', border: '1px solid rgba(55,65,81,0.25)' }
                : { background: 'rgba(0,0,0,0.03)', color: 'var(--text-primary)', border: '1px solid rgba(0,0,0,0.06)' }
              }
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : budgets.length === 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 24, minHeight: 320, background: 'rgba(0,0,0,0.02)', border: '1px dashed rgba(0,0,0,0.10)' }}>
          <EmptyState
            icon={Calculator}
            title="Nenhum orçamento encontrado"
            description={canCreate ? 'Crie seu primeiro orçamento dinâmico' : 'Nenhum orçamento disponível'}
            action={canCreate && (
              <button onClick={() => setShowModal(true)} className="btn-primary">Novo Orçamento</button>
            )}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-5">
          {budgets.map((b, idx) => (
            <BudgetCard key={b.id} budget={b} idx={idx} />
          ))}
        </div>
      )}

      <NewBudgetModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={() => { setShowModal(false); refetch() }}
      />
    </div>
  )
}