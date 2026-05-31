import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, FolderOpen, Calendar, DollarSign } from 'lucide-react'
import { useProjects } from '../../hooks/useProjects'
import PageHeader from '../../components/ui/PageHeader'
import Spinner from '../../components/ui/Spinner'
import Badge from '../../components/ui/Badge'
import Avatar from '../../components/ui/Avatar'
import EmptyState from '../../components/ui/EmptyState'
import NewProjectModal from '../../components/modals/NewProjectModal'
import { formatCurrency, formatDate, statusLabel, statusColors } from '../../utils/format'

const STATUS_FILTERS = [
  { value: '',            label: 'Todos' },
  { value: 'planning',    label: 'Planejamento' },
  { value: 'in_progress', label: 'Em andamento' },
  { value: 'review',      label: 'Revisão' },
  { value: 'paused',      label: 'Pausado' },
  { value: 'completed',   label: 'Concluído' },
  { value: 'cancelled',   label: 'Cancelado' },
]

export default function ProjectsPage() {
  const [showModal, setShowModal] = useState(false)
  const [filters,   setFilters]   = useState({ status: '', search: '' })
  const { projects, loading, refetch } = useProjects(filters)

  return (
    <div className="fade-in">
      <PageHeader
        title="Projetos"
        tag="Gestão"
        subtitle="Acompanhe o progresso e status de todos os projetos"
        actions={
          <button onClick={() => setShowModal(true)} className="btn-primary">
            <Plus size={15} /> Novo Projeto
          </button>
        }
      />

      {/* Busca + Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 mb-7">
        <div
          className="relative flex-1 max-w-sm"
          style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input
            className="w-full bg-transparent pl-9 pr-4 py-2.5 text-sm outline-none"
            style={{ color: 'var(--text-primary)' }}
            placeholder="Buscar projeto..."
            value={filters.search}
            onChange={e => setFilters({ ...filters, search: e.target.value })}
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          {STATUS_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setFilters({ ...filters, status: f.value })}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150"
              style={filters.status === f.value
                ? { background: 'rgba(124,92,252,0.20)', color: '#A78BFA', border: '1px solid rgba(124,92,252,0.30)' }
                : { background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.06)' }
              }
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grade */}
      {loading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : projects.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="Nenhum projeto encontrado"
          description="Crie seu primeiro projeto para começar"
          action={<button onClick={() => setShowModal(true)} className="btn-primary">Novo Projeto</button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {projects.map((p, idx) => (
            <Link
              key={p.id}
              to={`/app/projects/${p.id}`}
              className="card card-hover block"
              style={{ animationDelay: `${idx * 0.05}s` }}
            >
              {/* Cover */}
              {p.cover_url ? (
                <img src={p.cover_url} alt={p.title} className="w-full h-40 object-cover" style={{ borderRadius: '24px 24px 0 0' }} />
              ) : (
                <div
                  className="w-full h-40 flex items-center justify-center"
                  style={{
                    borderRadius: '24px 24px 0 0',
                    background: 'linear-gradient(135deg, rgba(124,92,252,0.20), rgba(124,92,252,0.05))'
                  }}
                >
                  <FolderOpen size={40} style={{ color: 'rgba(124,92,252,0.45)' }} />
                </div>
              )}

              <div className="p-5">
                {/* Título + Status */}
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <h3 className="text-sm font-bold leading-snug line-clamp-2 flex-1" style={{ color: 'var(--text-primary)' }}>
                    {p.title}
                  </h3>
                  <Badge className={`shrink-0 ${statusColors[p.status]}`}>{statusLabel[p.status]}</Badge>
                </div>

                {p.client && (
                  <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>{p.client}</p>
                )}

                {/* Progress */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span style={{ color: 'var(--text-muted)' }}>Progresso</span>
                    <span style={{ color: '#A78BFA', fontWeight: 700 }}>{p.progress}%</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${p.progress}%` }} />
                  </div>
                </div>

                {/* Meta */}
                <div className="flex items-center justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
                  <div className="flex items-center gap-1.5">
                    <DollarSign size={11} />
                    <span>{formatCurrency(p.budget)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar size={11} />
                    <span>{formatDate(p.expected_date)}</span>
                  </div>
                </div>

                {/* Owner */}
                {p.owner_name && (
                  <div
                    className="flex items-center gap-2 mt-4 pt-4"
                    style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
                  >
                    <Avatar name={p.owner_name} src={p.owner_avatar} size="sm" />
                    <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                      {p.owner_name}
                    </span>
                    {p.member_count > 1 && (
                      <span
                        className="ml-auto text-xs px-2 py-0.5 rounded-full"
                        style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)' }}
                      >
                        +{p.member_count - 1}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      <NewProjectModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={() => { setShowModal(false); refetch() }}
      />
    </div>
  )
}