import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Plus, Search, FileText, Calendar, DollarSign,
  User, CheckCircle2, Clock, Send, XCircle, AlertCircle, Layers,
} from 'lucide-react'
import { useProposals }     from '../../hooks/useProposals'
import useAuthStore          from '../../store/authStore'
import { can }               from '../../utils/permissions'
import PageHeader            from '../../components/ui/PageHeader'
import Spinner               from '../../components/ui/Spinner'
import Badge                 from '../../components/ui/Badge'
import EmptyState            from '../../components/ui/EmptyState'
import ProposalFormModal     from '../../components/modals/ProposalFormModal'
import { formatDate }        from '../../utils/format'

// ── Configuração de status ─────────────────────────────────────
const STATUS_META = {
  draft:    { label: 'Rascunho',  color: 'rgba(255,255,255,0.08)', text: 'rgba(255,255,255,0.55)', icon: Clock },
  sent:     { label: 'Enviada',   color: 'rgba(56,189,248,0.12)',  text: '#38BDF8',                icon: Send },
  approved: { label: 'Aprovada',  color: 'rgba(52,211,153,0.12)',  text: '#34D399',                icon: CheckCircle2 },
  rejected: { label: 'Rejeitada', color: 'rgba(251,113,133,0.12)', text: '#FB7185',                icon: XCircle },
  expired:  { label: 'Expirada',  color: 'rgba(251,191,36,0.12)',  text: '#FBBF24',                icon: AlertCircle },
}

const STATUS_FILTERS = [
  { value: '',         label: 'Todas'     },
  { value: 'draft',    label: 'Rascunho'  },
  { value: 'sent',     label: 'Enviadas'  },
  { value: 'approved', label: 'Aprovadas' },
  { value: 'rejected', label: 'Rejeitadas'},
  { value: 'expired',  label: 'Expiradas' },
]

// ── Badge de status ────────────────────────────────────────────
function StatusBadge({ status }) {
  const meta  = STATUS_META[status] || STATUS_META.draft
  const Icon  = meta.icon
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ background: meta.color, color: meta.text }}
    >
      <Icon size={11} />
      {meta.label}
    </span>
  )
}

// ── Card de proposta ───────────────────────────────────────────
function ProposalCard({ proposal, idx }) {
  const totalAmount = parseFloat(proposal.total_amount) || 0

  return (
    <Link
      to={`/app/proposals/${proposal.id}`}
      className="proposal-card block"
      style={{
        background:   'linear-gradient(175deg, rgba(13,21,43,0.85) 0%, rgba(7,10,24,0.92) 100%)',
        border:       '1px solid rgba(255,255,255,0.07)',
        borderRadius: 20,
        overflow:     'hidden',
        boxShadow:    '0 4px 20px rgba(0,0,0,0.28)',
        animationDelay: `${idx * 0.04}s`,
      }}
    >
      {/* Banner topo */}
      <div style={{
        height: 6,
        background: `linear-gradient(90deg, ${STATUS_META[proposal.status]?.text || '#A78BFA'}, transparent)`,
        opacity: 0.6,
      }} />

      <div style={{ padding: '16px 18px 18px' }}>

        {/* Número + Status */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '0.12em',
            color: '#A78BFA', textTransform: 'uppercase',
          }}>
            {proposal.proposal_number}
          </span>
          <StatusBadge status={proposal.status} />
        </div>

        {/* Título */}
        <h3 style={{
          color: 'var(--text-primary)', fontSize: 14, fontWeight: 700,
          lineHeight: 1.38, marginBottom: 6,
          display: '-webkit-box', WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {proposal.title}
        </h3>

        {/* Cliente */}
        {proposal.client_name && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 12 }}>
            <User size={11} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <span style={{
              fontSize: 12, color: 'var(--text-muted)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {proposal.client_name}
            </span>
          </div>
        )}

        {/* Separador */}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', marginBottom: 12 }} />

        {/* Valor total + Validade */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <DollarSign size={11} style={{ color: '#34D399', flexShrink: 0 }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#34D399' }}>
              {totalAmount > 0
                ? `R$ ${totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                : '—'
              }
            </span>
          </div>
          {proposal.valid_until && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <Calendar size={11} style={{ color: 'var(--text-muted)' }} />
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                Válida até {formatDate(proposal.valid_until)}
              </span>
            </div>
          )}
        </div>

        {/* Criada em */}
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>
          Criada em {formatDate(proposal.created_at)}
        </div>
      </div>
    </Link>
  )
}

// ── Página principal ───────────────────────────────────────────
export default function ProposalsPage() {
  const { user }  = useAuthStore()
  const role      = user?.role || 'member'
  const canCreate = can(role, 'proposals', 'create')

  const [showModal,   setShowModal]   = useState(false)
  const [search,      setSearch]      = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const { proposals, loading, refetch } = useProposals({ search, status: statusFilter })

  // Stats calculados em memória
  const stats = useMemo(() => ({
    total:    proposals.length,
    draft:    proposals.filter(p => p.status === 'draft').length,
    approved: proposals.filter(p => p.status === 'approved').length,
    sent:     proposals.filter(p => p.status === 'sent').length,
  }), [proposals])

  return (
    <div className="fade-in">
      <style>{`
        .proposal-card {
          transition: transform 0.22s cubic-bezier(.22,1,.36,1),
                      box-shadow 0.22s cubic-bezier(.22,1,.36,1),
                      border-color 0.20s ease;
          will-change: transform;
        }
        .proposal-card:hover {
          transform:    translateY(-5px);
          box-shadow:   0 24px 52px rgba(0,0,0,0.50),
                        0 0 0 1px rgba(124,92,252,0.22) !important;
          border-color: rgba(124,92,252,0.22) !important;
        }
        .prop-search:focus-within {
          border-color: rgba(124,92,252,0.45) !important;
          box-shadow: 0 0 0 3px rgba(124,92,252,0.10);
        }
        .prop-filter-btn { transition: all 0.15s ease; }
        .prop-filter-btn:hover { transform: translateY(-1px); }
      `}</style>

      <PageHeader
        title="Propostas"
        tag="Comercial"
        subtitle="Gerencie propostas e orçamentos"
        actions={
          canCreate && (
            <button onClick={() => setShowModal(true)} className="btn-primary">
              <Plus size={15} /> Nova Proposta
            </button>
          )
        }
      />

      {/* ── Stats ── */}
      {!loading && proposals.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
          {[
            { label: 'Total',      value: stats.total,    icon: <Layers size={17} />,       iconBg: 'rgba(124,92,252,0.12)', iconColor: '#A78BFA', valueColor: 'var(--text-primary)' },
            { label: 'Rascunhos',  value: stats.draft,    icon: <Clock size={17} />,         iconBg: 'rgba(255,255,255,0.06)', iconColor: 'rgba(255,255,255,0.40)', valueColor: 'var(--text-secondary)' },
            { label: 'Enviadas',   value: stats.sent,     icon: <Send size={17} />,          iconBg: 'rgba(56,189,248,0.10)', iconColor: '#38BDF8', valueColor: '#38BDF8' },
            { label: 'Aprovadas',  value: stats.approved, icon: <CheckCircle2 size={17} />,  iconBg: 'rgba(52,211,153,0.10)', iconColor: '#34D399', valueColor: '#34D399' },
          ].map(item => (
            <div key={item.label} className="card p-5" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, flexShrink: 0, background: item.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: item.iconColor }}>{item.icon}</span>
              </div>
              <div>
                <p style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 3 }}>
                  {item.label}
                </p>
                <p style={{ fontSize: 24, fontWeight: 700, lineHeight: 1, color: item.valueColor }}>
                  {item.value}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Busca + Filtros ── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-7">
        <div
          className="prop-search relative"
          style={{ flex: '1 1 0%', maxWidth: 340, background: 'rgba(255,255,255,0.04)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.08)' }}
        >
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
                ? { background: 'rgba(124,92,252,0.20)', color: '#A78BFA', border: '1px solid rgba(124,92,252,0.30)' }
                : { background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.06)' }
              }
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Conteúdo ── */}
      {loading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : proposals.length === 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 24, minHeight: 320, background: 'rgba(255,255,255,0.015)', border: '1px dashed rgba(255,255,255,0.07)' }}>
          <EmptyState
            icon={FileText}
            title="Nenhuma proposta encontrada"
            description={canCreate ? 'Crie sua primeira proposta comercial' : 'Nenhuma proposta disponível'}
            action={canCreate && (
              <button onClick={() => setShowModal(true)} className="btn-primary">
                Nova Proposta
              </button>
            )}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-5">
          {proposals.map((p, idx) => (
            <ProposalCard key={p.id} proposal={p} idx={idx} />
          ))}
        </div>
      )}

      <ProposalFormModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={() => { setShowModal(false); refetch() }}
      />
    </div>
  )
}