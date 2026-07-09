import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {Plus, Search, Building2, Mail, Phone, FolderKanban, Pencil, Trash2, CheckCircle2, XCircle, ChevronLeft, ChevronRight,} from 'lucide-react'
import { toast } from 'react-hot-toast'
import api from '../../services/api'
import useAuthStore from '../../store/authStore'
import { can } from '../../utils/permissions'
import PageHeader     from '../../components/ui/PageHeader'
import Spinner        from '../../components/ui/Spinner'
import EmptyState     from '../../components/ui/EmptyState'
import NewClientModal from '../../components/modals/NewClientModal'


/* ── Mapa de Status (Lead vs Cliente) ───────────────────────────── */
const STATUS_MAP = {
  lead:    { label: 'Lead',    bg: 'rgba(55,65,81,0.08)',  color: '#374151' },
  cliente: { label: 'Cliente', bg: 'rgba(2,132,199,0.10)', color: '#0284C7' },
}

/* ── Mapa de Situação ───────────────────────────────────────────── */
const SITUACAO_MAP = {
  aguardando_aprovacao: { label: 'Aguardando Aprovação', bg: 'rgba(217,119,6,0.10)', color: '#D97706' },
  revisao_proposta:     { label: 'Revisão de Proposta',  bg: 'rgba(217,119,6,0.10)', color: '#D97706' },
  proposta_aprovada:    { label: 'Proposta Aprovada',    bg: 'rgba(2,132,199,0.10)', color: '#0284C7' },
  contrato_assinado:    { label: 'Contrato Assinado',    bg: 'rgba(22,163,74,0.10)', color: '#16A34A' },
}

/* ── Mapa Financeiro ────────────────────────────────────────────── */
const FINANCEIRO_MAP = {
  adimplente:   { label: 'Adimplente',   bg: 'rgba(22,163,74,0.10)', color: '#16A34A', Icon: CheckCircle2 },
  inadimplente: { label: 'Inadimplente', bg: 'rgba(220,38,38,0.10)', color: '#DC2626', Icon: XCircle      },
}

/* ── Filtros ────────────────────────────────────────────────────── */
const STATUS_FILTERS = [
  { value: '',        label: 'Todos'   },
  { value: 'lead',    label: 'Lead'    },
  { value: 'cliente', label: 'Cliente' },
]
const SITUACAO_FILTERS = [
  { value: '',                     label: 'Todas'                },
  { value: 'aguardando_aprovacao', label: 'Aguardando Aprovação' },
  { value: 'revisao_proposta',     label: 'Revisão de Proposta'  },
  { value: 'proposta_aprovada',    label: 'Proposta Aprovada'    },
  { value: 'contrato_assinado',    label: 'Contrato Assinado'    },
]

// Tamanho de página fixo no front. Mantido em sincronia de propósito com
// DEFAULT_LIMIT em client.service.js (backend).
const PAGE_SIZE = 20

/* ── Badge genérico ─────────────────────────────────────────────── */
function MapBadge({ map, value }) {
  if (!value) return <span style={{ color: '#9CA3AF' }}>—</span>
  const cfg = map[value]
  if (!cfg) return <span style={{ color: '#9CA3AF' }}>—</span>
  const { Icon } = cfg
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: 11, fontWeight: 600, padding: '3px 10px',
      borderRadius: 99, background: cfg.bg, color: cfg.color,
      whiteSpace: 'nowrap', letterSpacing: '0.02em',
    }}>
      {Icon && <Icon size={11} />}
      {cfg.label}
    </span>
  )
}

/* ── Iniciais inline ────────────────────────────────────────────── */
function Initials({ name }) {
  const letters = (name || '?').split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('')
  return (
    <div style={{
      width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
      background: 'rgba(55,65,81,0.08)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 12, fontWeight: 700, color: '#374151',
    }}>
      {letters}
    </div>
  )
}

/* ── Página principal ───────────────────────────────────────────── */
export default function ClientsPage() {
  const { user }  = useAuthStore()
  const role      = user?.role || 'member'
  // Exclusão requer permissão; criação é liberada para qualquer usuário autenticado
  const canDelete = can && can(role, 'clients', 'delete')

  const [clients,        setClients]        = useState([])
  const [loading,        setLoading]        = useState(true)
  const [search,         setSearch]         = useState('')
  const [statusFilter,   setStatusFilter]   = useState('')
  const [situacaoFilter, setSituacaoFilter] = useState('')
  const [showModal,      setShowModal]      = useState(false)
  const [editingClient,  setEditingClient]  = useState(null)
  const [deletingId,     setDeletingId]     = useState(null)

  // Estado de paginação. `pagination` guarda os metadados que o backend
  // devolve (page/limit/total/totalPages); `page` é a página que o usuário
  // está pedindo (controla o efeito de busca).
  const [page,       setPage]       = useState(1)
  const [pagination, setPagination] = useState({ page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 })

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/clients', {
        params: {
          search:   search         || undefined,
          status:   statusFilter   || undefined,
          situacao: situacaoFilter || undefined,
          page,
          limit: PAGE_SIZE,
        },
      })
      // O backend responde { data, pagination } em vez de um array cru.
      // Fallback defensivo (Array.isArray) para o caso improvável de a API
      // antiga ainda estar em cache/CDN.
      if (Array.isArray(data)) {
        setClients(data)
        setPagination({ page: 1, limit: PAGE_SIZE, total: data.length, totalPages: 1 })
      } else {
        setClients(data?.data || [])
        setPagination(data?.pagination || { page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 })
      }
    } catch {
      toast.error('Erro ao carregar clientes')
    } finally {
      setLoading(false)
    }
  }

  // Sempre que um filtro muda, volta pra página 1. Evita cair numa página
  // vazia (ex: estava na página 3 e o novo filtro só tem 1 página).
  useEffect(() => { setPage(1) }, [search, statusFilter, situacaoFilter])

  useEffect(() => { load() }, [search, statusFilter, situacaoFilter, page])

  const openNew   = ()  => { setEditingClient(null); setShowModal(true) }
  const openEdit  = (c) => { setEditingClient(c);    setShowModal(true) }
  const askDelete = (id) => setDeletingId(id)

  const confirmDelete = async () => {
    try {
      await api.delete(`/clients/${deletingId}`)
      toast.success('Cliente excluído')
      setDeletingId(null)
      load()
    } catch {
      toast.error('Erro ao excluir cliente')
      setDeletingId(null)
    }
  }

  // Os cards de estatísticas refletem apenas os clientes da PÁGINA ATUAL
  // (o backend não manda mais a lista inteira) — exceto "Total", que usa
  // pagination.total (vindo do backend) e continua correto.
  const statsCards = [
    { label: 'Total',               value: pagination.total,                                               color: 'var(--text-primary)' },
    { label: 'Leads',               value: clients.filter(c => c.status === 'lead').length,               color: '#374151'             },
    { label: 'Clientes',            value: clients.filter(c => c.status === 'cliente').length,            color: '#0284C7'             },
    { label: 'Contratos Assinados', value: clients.filter(c => c.situacao === 'contrato_assinado').length,color: '#16A34A'             },
    { label: 'Inadimplentes',       value: clients.filter(c => c.financeiro === 'inadimplente').length,   color: '#DC2626'             },
  ]

  return (
    <div className="fade-in">
      <style>{`
        .client-row { transition: background 0.12s ease; }
        .client-row:hover { background: #F9FAFB !important; }
        .crm-filter-btn { transition: background 0.15s, color 0.15s, border-color 0.15s, transform 0.12s; }
        .crm-filter-btn:hover { transform: translateY(-1px); }
        .crm-search:focus-within { border-color: rgba(55,65,81,0.40) !important; box-shadow: 0 0 0 3px rgba(55,65,81,0.08); }
        .crm-page-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        /* Rolagem horizontal da tabela — em telas estreitas, o conteúdo
           (Nome + colunas visíveis) pode não caber; em vez de espremer o
           layout, deixa a tabela rolar lateralmente dentro do card. */
        .clients-table-scroll {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }
        .clients-table-scroll table {
          min-width: 640px;
        }
      `}</style>

      <PageHeader
        title="Clientes"
        tag="CRM"
        subtitle="Gerencie sua base de clientes e leads"
        actions={(
          <button onClick={openNew} className="btn-primary">
            <Plus size={15} /> Novo Cliente
          </button>
        )}
      />

      {/* Stats cards */}
      {!loading && clients.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-7">
          {statsCards.map(s => (
            <div key={s.label} className="card p-4 text-center">
              <p className="text-2xl font-bold mb-1" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                {s.label}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Busca + Filtros */}
      <div className="flex flex-col gap-3 mb-5">
        <div className="crm-search relative" style={{
          maxWidth: 340, background: '#FFFFFF', borderRadius: 14,
          border: '1px solid #D1D5DB', transition: 'border-color 0.2s, box-shadow 0.2s',
        }}>
          <Search size={14} style={{
            position: 'absolute', left: 14, top: '50%',
            transform: 'translateY(-50%)', color: '#9CA3AF', pointerEvents: 'none',
          }} />
          <input
            style={{
              width: '100%', background: 'transparent',
              paddingLeft: 38, paddingRight: 16, paddingTop: 10, paddingBottom: 10,
              fontSize: 13, color: '#374151', outline: 'none', boxSizing: 'border-box',
            }}
            placeholder="Buscar cliente ou lead..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          {STATUS_FILTERS.map(f => (
            <button key={f.value} onClick={() => setStatusFilter(f.value)}
              className="crm-filter-btn px-3.5 py-2 rounded-xl text-xs font-semibold"
              style={statusFilter === f.value
                ? { background: '#374151', color: '#fff', border: '1px solid #1f2937' }
                : { background: '#FFFFFF', color: '#6B7280', border: '1px solid #E5E7EB' }
              }>{f.label}</button>
          ))}
          <div style={{ width: 1, height: 20, background: '#E5E7EB', margin: '0 4px' }} />
          {SITUACAO_FILTERS.map(f => (
            <button key={f.value} onClick={() => setSituacaoFilter(f.value)}
              className="crm-filter-btn px-3.5 py-2 rounded-xl text-xs font-semibold"
              style={situacaoFilter === f.value
                ? { background: '#374151', color: '#fff', border: '1px solid #1f2937' }
                : { background: '#FFFFFF', color: '#6B7280', border: '1px solid #E5E7EB' }
              }>{f.label}</button>
          ))}
        </div>
      </div>

      {/* Confirmação de exclusão */}
      {deletingId && (
        <div style={{
          marginBottom: 20, padding: '14px 18px', borderRadius: 14,
          background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.20)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}>
          <p style={{ fontSize: 14, color: '#374151', margin: 0 }}>
            Confirmar exclusão permanente deste cliente? Esta ação não pode ser desfeita.
          </p>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button onClick={() => setDeletingId(null)}
              style={{ padding: '7px 14px', borderRadius: 10, border: '1px solid #D1D5DB', background: '#fff', fontSize: 13, fontWeight: 600, color: '#6B7280', cursor: 'pointer' }}>
              Cancelar
            </button>
            <button onClick={confirmDelete}
              style={{ padding: '7px 14px', borderRadius: 10, border: 'none', background: '#DC2626', fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer' }}>
              Confirmar exclusão
            </button>
          </div>
        </div>
      )}

      {/* Conteúdo */}
      {loading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : clients.length === 0 ? (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: 24, minHeight: 300,
          background: '#FAFAFA', border: '1px dashed #D1D5DB',
        }}>
          <EmptyState
            icon={Building2}
            title="Nenhum cliente encontrado"
            description={'Adicione seu primeiro cliente para começar'}
            action={(
              <button onClick={openNew} className="btn-primary">
                <Plus size={14} /> Novo Cliente
              </button>
            )}
          />
        </div>
      ) : (
        <>
          <div className="card overflow-hidden">
            {/* Wrapper de rolagem horizontal — o card mantém overflow-hidden
                (para preservar os cantos arredondados), e é este wrapper
                interno que rola quando a tabela é mais larga que a tela. */}
            <div className="clients-table-scroll">
              <table className="w-full">
                <thead style={{ borderBottom: '1px solid #E5E7EB' }}>
                  <tr>
                    <th className="table-header">Nome</th>
                    <th className="table-header hidden sm:table-cell">Telefone</th>
                    <th className="table-header hidden md:table-cell">E-mail</th>
                    <th className="table-header hidden lg:table-cell">Projeto</th>
                    <th className="table-header">Status</th>
                    <th className="table-header hidden md:table-cell">Situação</th>
                    <th className="table-header hidden lg:table-cell">Financeiro</th>
                    <th className="table-header" style={{ textAlign: 'right' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((c, i) => (
                    <tr key={c.id} className="client-row"
                      style={{ borderBottom: i < clients.length - 1 ? '1px solid #F3F4F6' : 'none' }}>

                      {/* Nome */}
                      <td className="table-cell">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Initials name={c.name} />
                          <span className="text-sm font-semibold" style={{ color: '#374151' }}>{c.name}</span>
                        </div>
                      </td>

                      {/* Telefone */}
                      <td className="table-cell hidden sm:table-cell">
                        {c.phone
                          ? <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Phone size={12} style={{ color: '#9CA3AF' }} />
                              <span className="text-sm" style={{ color: '#6B7280' }}>{c.phone}</span>
                            </div>
                          : <span style={{ color: '#9CA3AF' }}>—</span>
                        }
                      </td>

                      {/* Email */}
                      <td className="table-cell hidden md:table-cell">
                        {c.email
                          ? <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Mail size={12} style={{ color: '#9CA3AF' }} />
                              <span className="text-sm" style={{ color: '#6B7280' }}>{c.email}</span>
                            </div>
                          : <span style={{ color: '#9CA3AF' }}>—</span>
                        }
                      </td>

                      {/* Projeto */}
                      <td className="table-cell hidden lg:table-cell">
                        {c.project_title
                          ? <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <FolderKanban size={12} style={{ color: '#16A34A', flexShrink: 0 }} />
                              <Link
                                to={c.project_id ? `/app/projects/${c.project_id}` : '#'}
                                style={{
                                  fontSize: 13, fontWeight: 500, color: '#16A34A',
                                  textDecoration: 'none', maxWidth: 160,
                                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                }}
                                onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                                onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
                              >
                                {c.project_title}
                              </Link>
                            </div>
                          : <span style={{ color: '#9CA3AF' }}>—</span>
                        }
                      </td>

                      {/* Status */}
                      <td className="table-cell">
                        <MapBadge map={STATUS_MAP} value={c.status} />
                      </td>

                      {/* Situação */}
                      <td className="table-cell hidden md:table-cell">
                        <MapBadge map={SITUACAO_MAP} value={c.situacao} />
                      </td>

                      {/* Financeiro */}
                      <td className="table-cell hidden lg:table-cell">
                        <MapBadge map={FINANCEIRO_MAP} value={c.financeiro} />
                      </td>

                      {/* Ações */}
                      <td className="table-cell" style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                          <button onClick={() => openEdit(c)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 5,
                              padding: '6px 12px', borderRadius: 9, cursor: 'pointer',
                              background: '#F3F4F6', border: '1px solid #E5E7EB',
                              fontSize: 12, fontWeight: 600, color: '#6B7280',
                              transition: 'background 0.15s, color 0.15s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#E5E7EB'; e.currentTarget.style.color = '#374151' }}
                            onMouseLeave={e => { e.currentTarget.style.background = '#F3F4F6'; e.currentTarget.style.color = '#6B7280' }}
                          >
                            <Pencil size={12} /> Editar
                          </button>
                          {canDelete && (
                            <button onClick={() => askDelete(c.id)}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 5,
                                padding: '6px 12px', borderRadius: 9, cursor: 'pointer',
                                background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.15)',
                                fontSize: 12, fontWeight: 600, color: '#DC2626',
                                transition: 'background 0.15s',
                              }}
                              onMouseEnter={e => e.currentTarget.style.background = 'rgba(220,38,38,0.12)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'rgba(220,38,38,0.06)'}
                            >
                              <Trash2 size={12} /> Excluir
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Controles de paginação — em telas pequenas empilha (texto em
              cima, botões embaixo, ocupando a largura toda); em telas
              sm+ volta ao layout lado a lado original. */}
          {pagination.totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-5">
              <p className="text-xs text-center sm:text-left" style={{ color: 'var(--text-muted)' }}>
                Página {pagination.page} de {pagination.totalPages} • {pagination.total} {pagination.total === 1 ? 'cliente' : 'clientes'}
              </p>
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  onClick={() => setPage(p => Math.max(p - 1, 1))}
                  disabled={pagination.page <= 1}
                  className="crm-page-btn btn-secondary btn-sm flex-1 sm:flex-none justify-center"
                >
                  <ChevronLeft size={13} /> Anterior
                </button>
                <button
                  onClick={() => setPage(p => Math.min(p + 1, pagination.totalPages))}
                  disabled={pagination.page >= pagination.totalPages}
                  className="crm-page-btn btn-secondary btn-sm flex-1 sm:flex-none justify-center"
                >
                  Próxima <ChevronRight size={13} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <NewClientModal
        open={showModal}
        client={editingClient}
        onClose={() => { setShowModal(false); setEditingClient(null) }}
        onSuccess={() => { setShowModal(false); setEditingClient(null); load() }}
      />
    </div>
  )
}