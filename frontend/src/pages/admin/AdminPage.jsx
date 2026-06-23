import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Building2 } from 'lucide-react'
import toast from 'react-hot-toast'
import useAuthStore from '../../store/authStore'
import platformService from '../../services/platform.service'
import PageHeader        from '../../components/ui/PageHeader'
import Spinner           from '../../components/ui/Spinner'
import EmptyState        from '../../components/ui/EmptyState'
import CompanyCard        from '../../components/admin/CompanyCard'
import NewCompanyModal   from '../../components/modals/NewCompanyModal'

const STATUS_FILTERS = [
  { value: '',        label: 'Todas'      },
  { value: 'active',  label: 'Ativas'     },
  { value: 'blocked', label: 'Bloqueadas' },
]

/**
 * AdminPage — Painel do Super Admin (developer)
 *
 * Escopo global. Dashboard de empresas: KPIs, busca, filtros e cards.
 * Cada card abre a página exclusiva de gestão da empresa em /admin/companies/:id.
 */
export default function AdminPage() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const [companies, setCompanies] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showNewModal,  setShowNewModal] = useState(false)

  const loadCompanies = async () => {
    try {
      setLoading(true)
      const list = await platformService.listCompanies()
      setCompanies(list)
    } catch {
      toast.error('Falha ao carregar empresas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadCompanies() }, [])

  const kpis = useMemo(() => {
    const total      = companies.length
    const active     = companies.filter(c => c.is_active !== false).length
    const blocked    = total - active
    const totalUsers = companies.reduce((sum, c) => sum + (c.users_count || 0), 0)
    const avgUsers   = total > 0 ? (totalUsers / total).toFixed(1) : '0'
    return { total, active, blocked, totalUsers, avgUsers }
  }, [companies])

  const filtered = useMemo(() => {
    return companies.filter(c => {
      if (statusFilter === 'active'  && c.is_active === false) return false
      if (statusFilter === 'blocked' && c.is_active !== false) return false
      if (search) {
        const q = search.toLowerCase()
        const haystack = `${c.name} ${c.trade_name || ''} ${c.document || ''} ${c.email || ''}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [companies, search, statusFilter])

  const handleCreated = () => loadCompanies()

  const pillStyle = (active) => active
    ? { background: '#374151', color: '#fff', border: '1px solid #1f2937' }
    : { background: '#FFFFFF', color: '#6B7280', border: '1px solid #E5E7EB' }

  return (
    <div className="fade-in" style={{ minHeight: '100vh', padding: '32px', maxWidth: 1280, margin: '0 auto' }}>
      <PageHeader
        title="Gestão de Empresas"
        tag="Painel Global"
        subtitle={`Olá, ${user?.name || 'developer'}. Gerencie as empresas da plataforma.`}
        actions={
          <div className="flex gap-2">
            <button onClick={() => { logout(); navigate('/login') }} className="btn-secondary">
              Sair
            </button>
            <button onClick={() => setShowNewModal(true)} className="btn-primary">
              <Plus size={15} /> Nova Empresa
            </button>
          </div>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-7">
        {[
          { label: 'Empresas Cadastradas',     value: kpis.total,      color: 'var(--text-primary)' },
          { label: 'Empresas Ativas',          value: kpis.active,     color: '#16A34A' },
          { label: 'Empresas Bloqueadas',      value: kpis.blocked,    color: '#DC2626' },
          { label: 'Total de Usuários',        value: kpis.totalUsers, color: '#0284C7' },
          { label: 'Média de Usuários/Empresa',value: kpis.avgUsers,   color: '#6B7280' },
        ].map(s => (
          <div key={s.label} className="card p-4 text-center">
            <p className="text-2xl font-bold mb-1" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
              {s.label}
            </p>
          </div>
        ))}
      </div>

      {/* Busca */}
      <div className="mb-4">
        <div className="relative" style={{ maxWidth: 320 }}>
          <Search size={14} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF', pointerEvents: 'none' }} />
          <input
            className="input"
            style={{ paddingLeft: 38 }}
            placeholder="Buscar empresa..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {STATUS_FILTERS.map(f => (
          <button key={f.value} onClick={() => setStatusFilter(f.value)}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150"
            style={pillStyle(statusFilter === f.value)}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Cards */}
      {loading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Nenhuma empresa encontrada"
          description="Crie a primeira empresa da plataforma para começar"
          action={<button onClick={() => setShowNewModal(true)} className="btn-primary"><Plus size={14} /> Nova Empresa</button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map(c => (
            <CompanyCard key={c.id} company={c} onManage={(company) => navigate(`/admin/companies/${company.id}`)} />
          ))}
        </div>
      )}

      <NewCompanyModal open={showNewModal} onClose={() => setShowNewModal(false)} onCreated={handleCreated} />
    </div>
  )
}