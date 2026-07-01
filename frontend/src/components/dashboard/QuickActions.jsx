import { useState } from 'react'
import {
  FolderKanban, CheckSquare, TrendingDown, TrendingUp, FileText,
} from 'lucide-react'
import useAuthStore       from '../../store/authStore'
import { can }            from '../../utils/permissions'
import NewProjectModal     from '../modals/NewProjectModal'
import NewTaskModal        from '../modals/NewTaskModal'
import NewExpenseModal     from '../modals/NewExpenseModal'
import NewRevenueModal     from '../modals/NewRevenueModal'
import ProposalFormModal   from '../modals/ProposalFormModal'

/* ── Mesmos estilos de glassmorphism usados na Dashboard ── */
const tileStyle = {
  background: '#3a3a3a00', // Fundo cinza neutro
  border: '2px solid rgba(255,255,255,0.07)', // Borda sutil
  border: '2px solid rgba(63, 63, 63, 0.07)',
  borderTop: '2px solid rgba(63, 63, 63, 0.07)',
}

const tileHoverEnter = (e) => {
  e.currentTarget.style.background  = 'rgba(46, 46, 46, 0.22)'
  e.currentTarget.style.borderColor = 'rgba(46, 46, 46, 0.22)'
}
const tileHoverLeave = (e) => {
  e.currentTarget.style.background  = tileStyle.background
  e.currentTarget.style.borderColor = 'rgba(63, 63, 63, 0.07)'
}

export default function QuickActions({ onActionSuccess }) {
  const { user } = useAuthStore()
  const role      = user?.role || 'member'

  const [openModal, setOpenModal] = useState(null) // 'project' | 'task' | 'expense' | 'revenue' | 'proposal' | null

  const handleSuccess = () => {
    setOpenModal(null)
    onActionSuccess?.()
  }

  const ACTIONS = [
    {
      key: 'project', label: 'Novo Projeto', icon: FolderKanban,
      iconBg: 'rgba(124,92,252,0.12)', iconColor: '#A78BFA',
      visible: can(role, 'projects', 'create'),
    },
    {
      key: 'task', label: 'Nova Tarefa', icon: CheckSquare,
      iconBg: 'rgba(56,189,248,0.10)', iconColor: '#38BDF8',
      visible: can(role, 'tasks', 'create'),
    },
    {
      key: 'expense', label: 'Nova Despesa', icon: TrendingDown,
      iconBg: 'rgba(251,113,133,0.10)', iconColor: '#FB7185',
      visible: can(role, 'financial', 'create'),
    },
    {
      key: 'revenue', label: 'Nova Receita', icon: TrendingUp,
      iconBg: 'rgba(52,211,153,0.10)', iconColor: '#34D399',
      visible: can(role, 'financial', 'create'),
    },
    {
      key: 'proposal', label: 'Nova Proposta', icon: FileText,
      iconBg: 'rgba(251,191,36,0.10)', iconColor: '#FBBF24',
      visible: can(role, 'proposals', 'create'),
    },
  ].filter(a => a.visible)

  if (ACTIONS.length === 0) return null

  return (
    <div className="card px-6 py-4">
      <div className="mb-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-0.5"
          style={{ color: 'var(--text-muted)' }}>Atalhos</p>
        <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
          Navegações Rápidas
        </h3>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {ACTIONS.map(action => {
          const Icon = action.icon
          return (
            <button
              key={action.key}
              type="button"
              onClick={() => setOpenModal(action.key)}
              className="flex flex-col items-center justify-center gap-2 rounded-2xl py-3 px-3 transition-all duration-200"
              style={tileStyle}
              onMouseEnter={tileHoverEnter}
              onMouseLeave={tileHoverLeave}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: action.iconBg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon size={14} style={{ color: action.iconColor }} />
              </div>
              <span className="text-xs font-semibold text-center" style={{ color: 'var(--text-secondary)' }}>
                {action.label}
              </span>
            </button>
          )
        })}
      </div>

      <NewProjectModal
        open={openModal === 'project'}
        onClose={() => setOpenModal(null)}
        onSuccess={handleSuccess}
      />
      <NewTaskModal
        open={openModal === 'task'}
        onClose={() => setOpenModal(null)}
        onSuccess={handleSuccess}
      />
      <NewExpenseModal
        open={openModal === 'expense'}
        expense={null}
        onClose={() => setOpenModal(null)}
        onSuccess={handleSuccess}
      />
      <NewRevenueModal
        open={openModal === 'revenue'}
        onClose={() => setOpenModal(null)}
        onSuccess={handleSuccess}
      />
      <ProposalFormModal
        open={openModal === 'proposal'}
        proposal={null}
        onClose={() => setOpenModal(null)}
        onSuccess={handleSuccess}
      />
    </div>
  )
}