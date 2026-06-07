import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Plus, Search, FolderOpen, Calendar, DollarSign,
  Building2, Users, Layers, Activity, CheckCircle2, PauseCircle,
} from 'lucide-react'
import { useProjects }   from '../../hooks/useProjects'
import useAuthStore      from '../../store/authStore'
import { can }           from '../../utils/permissions'
import PageHeader        from '../../components/ui/PageHeader'
import Spinner           from '../../components/ui/Spinner'
import Badge             from '../../components/ui/Badge'
import Avatar            from '../../components/ui/Avatar'
import EmptyState        from '../../components/ui/EmptyState'
import NewProjectModal   from '../../components/modals/NewProjectModal'
import { formatCurrency, formatDate, statusLabel, statusColors } from '../../utils/format'

const STATUS_FILTERS = [
  { value: '',            label: 'Todos'        },
  { value: 'in_progress', label: 'Em Andamento' },
  { value: 'paused',      label: 'Pausado'      },
  { value: 'completed',   label: 'Concluído'    },
  { value: 'cancelled',   label: 'Cancelado'    },
]

/* Gradiente do placeholder de capa por status */
const COVER_GRADIENT = {
  in_progress: 'linear-gradient(140deg, rgba(124,92,252,0.32) 0%, rgba(67,56,202,0.10) 100%)',
  completed:   'linear-gradient(140deg, rgba(52,211,153,0.28) 0%, rgba(5,150,105,0.08)  100%)',
  paused:      'linear-gradient(140deg, rgba(251,191,36,0.28) 0%, rgba(245,158,11,0.08) 100%)',
  cancelled:   'linear-gradient(140deg, rgba(251,113,133,0.24) 0%, rgba(220,38,38,0.08) 100%)',
  default:     'linear-gradient(140deg, rgba(124,92,252,0.22) 0%, rgba(124,92,252,0.05) 100%)',
}

/* Cor do ícone no placeholder por status */
const COVER_ICON_COLOR = {
  in_progress: '#A78BFA',
  completed:   '#34D399',
  paused:      '#FBBF24',
  cancelled:   '#FB7185',
  default:     'rgba(124,92,252,0.55)',
}

export default function ProjectsPage() {
  const { user }  = useAuthStore()
  const role      = user?.role || 'member'
  const canCreate = can(role, 'projects', 'create')

  const [showModal, setShowModal] = useState(false)
  const [filters,   setFilters]   = useState({ status: '', search: '' })
  const { projects, loading, refetch } = useProjects(filters)

  /* ── Totalizadores calculados em memória — sem nova query ── */
  const stats = useMemo(() => ({
    total:       projects.length,
    in_progress: projects.filter(p => p.status === 'in_progress').length,
    completed:   projects.filter(p => p.status === 'completed').length,
    paused:      projects.filter(p => p.status === 'paused').length,
  }), [projects])

  return (
    <div className="fade-in">
      {/* ── Estilos escopados ── */}
      <style>{`
        .project-card {
          transition:
            transform      0.22s cubic-bezier(.22,1,.36,1),
            box-shadow     0.22s cubic-bezier(.22,1,.36,1),
            border-color   0.20s ease;
          will-change: transform;
        }
        .project-card:hover {
          transform:    translateY(-5px);
          box-shadow:   0 24px 52px rgba(0,0,0,0.50),
                        0 0 0 1px rgba(124,92,252,0.22) !important;
          border-color: rgba(124,92,252,0.22) !important;
        }
        .kp-filter-btn {
          transition: background 0.15s ease, color 0.15s ease,
                      border-color 0.15s ease, transform 0.15s ease;
        }
        .kp-filter-btn:hover {
          transform: translateY(-1px);
        }
        .kp-search:focus-within {
          border-color: rgba(124,92,252,0.45) !important;
          box-shadow: 0 0 0 3px rgba(124,92,252,0.10);
          transition: border-color 0.2s, box-shadow 0.2s;
        }
      `}</style>

      <PageHeader
        title="Projetos"
        tag="Gestão"
        subtitle="Acompanhe o status de todos os projetos"
        actions={
          canCreate && (
            <button onClick={() => setShowModal(true)} className="btn-primary">
              <Plus size={15} /> Novo Projeto
            </button>
          )
        }
      />

      {/* ── Cards de resumo — calculados em memória ── */}
      {!loading && projects.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
          {[
            {
              label:     'Total',
              value:     stats.total,
              icon:      <Layers size={17} />,
              valueColor:'var(--text-primary)',
              iconBg:    'rgba(124,92,252,0.12)',
              iconColor: '#A78BFA',
            },
            {
              label:     'Em Andamento',
              value:     stats.in_progress,
              icon:      <Activity size={17} />,
              valueColor:'#A78BFA',
              iconBg:    'rgba(124,92,252,0.12)',
              iconColor: '#A78BFA',
            },
            {
              label:     'Concluídos',
              value:     stats.completed,
              icon:      <CheckCircle2 size={17} />,
              valueColor:'#34D399',
              iconBg:    'rgba(52,211,153,0.10)',
              iconColor: '#34D399',
            },
            {
              label:     'Pausados',
              value:     stats.paused,
              icon:      <PauseCircle size={17} />,
              valueColor:'#FBBF24',
              iconBg:    'rgba(251,191,36,0.10)',
              iconColor: '#FBBF24',
            },
          ].map(item => (
            <div
              key={item.label}
              className="card p-5"
              style={{ display: 'flex', alignItems: 'center', gap: 16 }}
            >
              <div style={{
                width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                background: item.iconBg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ color: item.iconColor }}>{item.icon}</span>
              </div>
              <div>
                <p
                  style={{
                    fontSize: 10.5, fontWeight: 600, letterSpacing: '0.10em',
                    textTransform: 'uppercase', color: 'var(--text-muted)',
                    marginBottom: 3,
                  }}
                >
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
        {/* Campo de busca */}
        <div
          className="kp-search relative"
          style={{
            flex: '1 1 0%',
            maxWidth: 340,
            background: 'rgba(255,255,255,0.04)',
            borderRadius: 14,
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <Search
            size={14}
            style={{
              position: 'absolute', left: 14, top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)', pointerEvents: 'none',
            }}
          />
          <input
            style={{
              width: '100%', background: 'transparent',
              paddingLeft: 38, paddingRight: 16, paddingTop: 10, paddingBottom: 10,
              fontSize: 13, color: 'var(--text-primary)', outline: 'none',
              boxSizing: 'border-box',
            }}
            placeholder="Buscar projeto..."
            value={filters.search}
            onChange={e => setFilters({ ...filters, search: e.target.value })}
          />
        </div>

        {/* Filtros de status */}
        <div className="flex gap-2 flex-wrap">
          {STATUS_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setFilters({ ...filters, status: f.value })}
              className="kp-filter-btn px-3.5 py-2 rounded-xl text-xs font-semibold"
              style={filters.status === f.value
                ? {
                    background:  'rgba(124,92,252,0.20)',
                    color:       '#A78BFA',
                    border:      '1px solid rgba(124,92,252,0.30)',
                  }
                : {
                    background:  'rgba(255,255,255,0.04)',
                    color:       'var(--text-muted)',
                    border:      '1px solid rgba(255,255,255,0.06)',
                  }
              }
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Conteúdo ── */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner size="lg" />
        </div>

      ) : projects.length === 0 ? (
        <div
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 24, minHeight: 320,
            background: 'rgba(255,255,255,0.015)',
            border: '1px dashed rgba(255,255,255,0.07)',
          }}
        >
          <EmptyState
            icon={FolderOpen}
            title="Nenhum projeto encontrado"
            description={
              canCreate
                ? 'Crie seu primeiro projeto para começar'
                : 'Nenhum projeto disponível no momento'
            }
            action={
              canCreate && (
                <button onClick={() => setShowModal(true)} className="btn-primary">
                  Novo Projeto
                </button>
              )
            }
          />
        </div>

      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-5">
          {projects.map((p, idx) => (
            <Link
              key={p.id}
              to={`/app/projects/${p.id}`}
              className="project-card block"
              style={{
                background:   'linear-gradient(175deg, rgba(13,21,43,0.85) 0%, rgba(7,10,24,0.92) 100%)',
                border:       '1px solid rgba(255,255,255,0.07)',
                borderRadius: 20,
                overflow:     'hidden',
                boxShadow:    '0 4px 20px rgba(0,0,0,0.28)',
                animationDelay: `${idx * 0.04}s`,
              }}
            >
              {/* ── Capa ── */}
              {p.cover_url ? (
                <div style={{ position: 'relative', height: 136 }}>
                  <img
                    src={p.cover_url}
                    alt={p.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                  {/* Overlay para legibilidade do conteúdo abaixo */}
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(to bottom, transparent 50%, rgba(7,10,24,0.65) 100%)',
                  }} />
                </div>
              ) : (
                /* ── Placeholder elegante ── */
                <div
                  style={{
                    height: 136,
                    background: COVER_GRADIENT[p.status] || COVER_GRADIENT.default,
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    gap: 8, position: 'relative', overflow: 'hidden',
                  }}
                >
                  {/* Dot pattern decorativo */}
                  <div style={{
                    position: 'absolute', inset: 0,
                    backgroundImage:
                      'radial-gradient(circle, rgba(255,255,255,0.055) 1px, transparent 1px)',
                    backgroundSize: '18px 18px',
                    pointerEvents: 'none',
                  }} />
                  {/* Brilho central */}
                  <div style={{
                    position: 'absolute', inset: 0,
                    background:
                      'radial-gradient(ellipse at 50% 60%, rgba(124,92,252,0.08), transparent 65%)',
                    pointerEvents: 'none',
                  }} />
                  {/* Ícone */}
                  <div style={{
                    position: 'relative', zIndex: 1,
                    width: 46, height: 46, borderRadius: 14,
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.10)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    backdropFilter: 'blur(4px)',
                  }}>
                    <FolderOpen
                      size={22}
                      style={{ color: COVER_ICON_COLOR[p.status] || COVER_ICON_COLOR.default }}
                    />
                  </div>
                  {/* Nome truncado */}
                  <span style={{
                    position: 'relative', zIndex: 1,
                    fontSize: 10, fontWeight: 700,
                    letterSpacing: '0.16em', textTransform: 'uppercase',
                    color: 'rgba(255,255,255,0.28)',
                    maxWidth: '75%', overflow: 'hidden',
                    textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {p.title}
                  </span>
                </div>
              )}

              {/* ── Corpo ── */}
              <div style={{ padding: '15px 18px 18px' }}>

                {/* Cabeçalho: Status + Membros */}
                <div style={{
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', marginBottom: 9,
                }}>
                  <Badge className={`shrink-0 ${statusColors[p.status]}`}>
                    {statusLabel[p.status]}
                  </Badge>
                  {p.member_count > 0 && (
                    <span style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      fontSize: 11, color: 'var(--text-muted)',
                    }}>
                      <Users size={11} />
                      {p.member_count} {p.member_count === 1 ? 'membro' : 'membros'}
                    </span>
                  )}
                </div>

                {/* Título */}
                <h3 style={{
                  color: 'var(--text-primary)',
                  fontSize: 14, fontWeight: 700, lineHeight: 1.38,
                  marginBottom: 5,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}>
                  {p.title}
                </h3>

                {/* Cliente */}
                {p.client ? (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    marginBottom: 12,
                  }}>
                    <Building2 size={11} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    <span style={{
                      fontSize: 12, color: 'var(--text-muted)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {p.client}
                    </span>
                  </div>
                ) : (
                  <div style={{ marginBottom: 12 }} />
                )}

                {/* Separador */}
                <div style={{
                  height: 1,
                  background: 'rgba(255,255,255,0.05)',
                  marginBottom: 12,
                }} />

                {/* Orçamento + Data */}
                <div style={{
                  display: 'flex', alignItems: 'center',
                  justifyContent: 'space-between', marginBottom: 12,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <DollarSign size={11} style={{ color: '#34D399', flexShrink: 0 }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                      {formatCurrency(p.budget)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Calendar size={11} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {formatDate(p.expected_date)}
                    </span>
                  </div>
                </div>

                {/* Rodapé: Responsável — só renderiza se existir */}
                {p.owner_name && (
                  <>
                    <div style={{
                      height: 1,
                      background: 'rgba(255,255,255,0.05)',
                      marginBottom: 12,
                    }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Avatar name={p.owner_name} src={p.owner_avatar} size="sm" />
                      <span style={{
                        fontSize: 12, fontWeight: 500,
                        color: 'var(--text-muted)',
                        flex: 1, overflow: 'hidden',
                        textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {p.owner_name}
                      </span>
                      {p.member_count > 1 && (
                        <span style={{
                          fontSize: 11, fontWeight: 600,
                          padding: '2px 8px', borderRadius: 20,
                          background: 'rgba(124,92,252,0.10)',
                          border: '1px solid rgba(124,92,252,0.18)',
                          color: '#A78BFA',
                          flexShrink: 0,
                        }}>
                          +{p.member_count - 1}
                        </span>
                      )}
                    </div>
                  </>
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