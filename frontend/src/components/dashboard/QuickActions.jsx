import { useState, useEffect } from 'react'
import {
  FolderKanban, CheckSquare, TrendingDown, TrendingUp, FileText,
  Calculator, CalendarPlus, UserPlus, Rss,
} from 'lucide-react'
import useAuthStore       from '../../store/authStore'
import { can }            from '../../utils/permissions'
import NewProjectModal     from '../modals/NewProjectModal'
import NewTaskModal        from '../modals/NewTaskModal'
import NewExpenseModal     from '../modals/NewExpenseModal'
import NewRevenueModal     from '../modals/NewRevenueModal'
import ProposalFormModal   from '../modals/ProposalFormModal'
import NewBudgetModal      from '../modals/NewBudgetModal'
import NewClientModal      from '../modals/NewClientModal'
import NewPostModal        from '../modals/NewPostModal'
import EventModal           from '../calendar/EventModal'
import { createEvent }      from '../../services/calendar.service'
import { createPost }       from '../../services/posts.service'
import { getProjects }      from '../../services/projects.service'

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
  const [openModal, setOpenModal] = useState(null)
  const [projectsForPost, setProjectsForPost] = useState([])

  useEffect(() => {
    if (openModal !== 'post') return
    getProjects({ limit: 200 })
      .then(({ data }) => setProjectsForPost(data.data || []))
      .catch(() => setProjectsForPost([]))
  }, [openModal])

  const handleSuccess = () => {
    setOpenModal(null)
    onActionSuccess?.()
  }

   const handleSaveEvent = async (payload) => {
    await createEvent(payload)
    handleSuccess()
  }

  
  const handleCreatePost = async (payload) => {
    await createPost(payload)
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
      key: 'client', label: 'Novo Cliente', icon: UserPlus,
      iconBg: 'rgba(52,211,153,0.10)', iconColor: '#34D399',
      visible: can(role, 'clients', 'create'),
    },
    {
      key: 'budget', label: 'Novo Orçamento', icon: Calculator,
      iconBg: 'rgba(167,139,250,0.10)', iconColor: '#A78BFA',
      visible: can(role, 'budgets', 'create'),
    },
    {
      key: 'proposal', label: 'Nova Proposta', icon: FileText,
      iconBg: 'rgba(251,191,36,0.10)', iconColor: '#FBBF24',
      visible: can(role, 'proposals', 'create'),
    },
    {
      key: 'event', label: 'Novo Evento', icon: CalendarPlus,
      iconBg: 'rgba(56,189,248,0.10)', iconColor: '#38BDF8',
      visible: can(role, 'calendar', 'create'),
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
      key: 'post', label: 'Novo Post', icon: Rss,
      iconBg: 'rgba(0, 38, 255, 0.58)', iconColor: '#ffffff',
      visible: can(role, 'posts', 'create'),
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

      {/* Grid auto-ajustável: em vez de nº fixo de colunas por breakpoint,
          usa auto-fit + minmax para calcular quantas colunas cabem no
          container e esticar os itens existentes até preencher a linha
          inteira — sem sobrar coluna vazia quando há poucos botões (ex:
          role sem permissão pra financeiro) nem quando novos módulos
          forem adicionados depois. Tamanho do ícone (28px) e gap (8px)
          continuam fixos, só a largura de cada botão se adapta. */}
      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(84px, 1fr))' }}
      >
        {ACTIONS.map(action => {
          const Icon = action.icon
          return (
            <button
              key={action.key}
              type="button"
              onClick={() => setOpenModal(action.key)}
              className="flex flex-col items-center justify-center gap-1.5 rounded-2xl py-2.5 px-2 transition-all duration-200"
              style={tileStyle}
              onMouseEnter={tileHoverEnter}
              onMouseLeave={tileHoverLeave}
            >
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: action.iconBg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Icon size={13} style={{ color: action.iconColor }} />
              </div>
              <span className="text-[11px] font-semibold text-center leading-tight" style={{ color: 'var(--text-secondary)' }}>
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
      <NewBudgetModal
        open={openModal === 'budget'}
        onClose={() => setOpenModal(null)}
        onSuccess={handleSuccess}
      />
   
      {openModal === 'event' && (
        <EventModal
          event={null}
          onSave={handleSaveEvent}
          onClose={() => setOpenModal(null)}
          canDelete={false}
        />
      )}
      <NewClientModal
        open={openModal === 'client'}
        onClose={() => setOpenModal(null)}
        onSuccess={handleSuccess}
      />
      <NewPostModal
        open={openModal === 'post'}
        onClose={() => setOpenModal(null)}
        onSuccess={handleSuccess}
        projects={projectsForPost}
        createPost={handleCreatePost}
      />
    </div>
  )
}