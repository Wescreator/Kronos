import { Building2, Users } from 'lucide-react'

const PLAN_LABELS = {
  free:       'Free',
  pro:        'Pro',
  business:   'Business',
  enterprise: 'Enterprise',
}

export default function CompanyCard({ company, onManage }) {
  const blocked = company.is_active === false

  return (
    <div
      className="card card-hover p-5 flex flex-col gap-4"
      style={{ cursor: 'default' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="flex items-center justify-center rounded-2xl shrink-0"
            style={{ width: 44, height: 44, background: 'var(--bg-sidebar)' }}
          >
            <Building2 size={20} style={{ color: 'var(--text-primary)' }} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>
              {company.name}
            </p>
            {company.trade_name && (
              <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                {company.trade_name}
              </p>
            )}
          </div>
        </div>

        <span
          className="badge shrink-0"
          style={blocked
            ? { background: 'rgba(220,38,38,0.10)', color: '#DC2626' }
            : { background: 'rgba(22,163,74,0.10)', color: '#16A34A' }}
        >
          {blocked ? 'Bloqueada' : 'Ativa'}
        </span>
      </div>

      <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-secondary)' }}>
        <span className="badge" style={{ background: 'var(--bg-sidebar)', color: 'var(--text-secondary)' }}>
          {PLAN_LABELS[company.plan] || company.plan || 'Sem plano'}
        </span>
        <span className="flex items-center gap-1.5">
          <Users size={13} /> {company.users_count ?? 0} usuário(s)
        </span>
      </div>

      <div className="divider" />

      <button onClick={() => onManage(company)} className="btn-primary justify-center">
        Gerenciar
      </button>
    </div>
  )
}