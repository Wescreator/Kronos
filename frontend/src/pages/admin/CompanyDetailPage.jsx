import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Pencil, Trash2, Plus, Building2, Users, Clock,
  CreditCard, Settings, LayoutGrid, ShieldCheck, ImagePlus, Upload,
  UserCheck, KeyRound,
} from 'lucide-react'
import toast from 'react-hot-toast'
import platformService from '../../services/platform.service'

import Spinner    from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import UserModal  from '../../components/modals/UserModal'
import ClientAccessModal from '../../components/modals/ClientAccessModal'

const ROLE_LABELS = {
  owner:    'Owner',
  admin:    'Administrador',
  manager:  'Gestor / Arquiteto',
  employee: 'Colaborador',
}

const ROLE_DESCRIPTIONS = {
  owner:    'Acesso total à empresa, incluindo dados financeiros e configurações.',
  admin:    'Gerencia usuários, projetos e configurações da empresa.',
  manager:  'Gerencia projetos, tarefas e a equipe designada.',
  employee: 'Acesso operacional às tarefas e projetos atribuídos.',
}

const TABS = [
  { value: 'resumo',     label: 'Resumo',         icon: Building2   },
  { value: 'kpis',       label: 'KPIs',           icon: LayoutGrid  },
  { value: 'usuarios',   label: 'Usuários',       icon: Users       },
  { value: 'clientes',   label: 'Clientes',       icon: UserCheck   },
  { value: 'historico',  label: 'Histórico',      icon: Clock       },
  { value: 'financeiro', label: 'Financeiro',     icon: CreditCard  },
  { value: 'config',     label: 'Configurações',  icon: Settings    },
]

const toCompanyEdit = (c) => ({
  name: c.name || '', trade_name: c.trade_name || '', document: c.document || '',
  email: c.email || '', phone: c.phone || '', plan: c.plan || '',
})

export default function CompanyDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [company,  setCompany]  = useState(null)
  const [users,    setUsers]    = useState([])
  const [clients,  setClients]  = useState([])   // NOVO
  const [stats,    setStats]    = useState(null)   // soft-fail — ver platform.service.js
  const [history,  setHistory]  = useState([])     // soft-fail — ver platform.service.js
  const [loading,  setLoading]  = useState(true)
  const [activeTab, setActiveTab] = useState('resumo')

  const [editingCompany,     setEditingCompany]     = useState(false)
  const [companyEdit,        setCompanyEdit]        = useState(null)
  const [savingCompanyEdit,  setSavingCompanyEdit]  = useState(false)
  const [busyCompany,        setBusyCompany]        = useState(false)

  const [showUserModal, setShowUserModal] = useState(false)
  const [editingUser,   setEditingUser]   = useState(null)

  const [showClientAccessModal, setShowClientAccessModal] = useState(false) // NOVO
  const [editingClientAccess,   setEditingClientAccess]   = useState(null)  // NOVO

  const load = async () => {
    setLoading(true)
    try {
      // ⚠️ Não existe endpoint de empresa única hoje — reaproveitamos a
      // listagem completa e filtramos pelo id da rota. Quando existir um
      // GET /admin/companies/:id dedicado, troque aqui.
      const list = await platformService.listCompanies()
      const found = list.find(c => String(c.id) === String(id))
      if (!found) {
        toast.error('Empresa não encontrada')
        navigate('/admin')
        return
      }
      setCompany(found)
      setCompanyEdit(toCompanyEdit(found))
    } catch {
      toast.error('Falha ao carregar empresa')
    } finally {
      setLoading(false)
    }
  }

  const loadUsers = async () => {
    try {
      const list = await platformService.listCompanyUsers(id)
      setUsers(list)
    } catch {
      toast.error('Falha ao carregar usuários')
    }
  }

  // NOVO — clientes elegíveis (status='cliente') com estado de acesso ao portal
  const loadClients = async () => {
    try {
      const list = await platformService.listCompanyClients(id)
      setClients(list)
    } catch {
      toast.error('Falha ao carregar clientes')
    }
  }


  const loadHistory = async () => {
    try {
      const data = await platformService.getCompanyHistory(id)
      setHistory(data)
    } catch (err) {
      console.error('Erro ao carregar histórico:', err)
      setHistory([])
    }
  }

  // KPIs/estatísticas da empresa (soft-fail: mantém null e a UI mostra o aviso).
  const loadStats = async () => {
    try {
      const data = await platformService.getCompanyStats(id)
      setStats(data)
    } catch (err) {
      console.error('Erro ao carregar estatísticas:', err)
      setStats(null)
    }
  }

  useEffect(() => {
    load()
    loadUsers()
    loadClients()
    loadStats()
    loadHistory()
  }, [id])

  /* ── Resumo: editar empresa ──────────────────────────────────────────── */
  const handleSaveCompany = async () => {
    if (!companyEdit.name.trim()) return toast.error('Informe o nome da empresa')
    try {
      setSavingCompanyEdit(true)
      const updated = await platformService.updateCompany(id, companyEdit)
      toast.success('Empresa atualizada')
      setCompany(updated)
      setCompanyEdit(toCompanyEdit(updated))
      setEditingCompany(false) // volta para visualização automaticamente
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Erro ao atualizar empresa')
    } finally {
      setSavingCompanyEdit(false)
    }
  }

  const handleToggleActive = async () => {
    try {
      setBusyCompany(true)
      const res = await platformService.setCompanyActive(id, company.is_active === false)
      setCompany({ ...company, is_active: res.is_active })
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Erro ao alterar status')
    } finally {
      setBusyCompany(false)
    }
  }

  /* ── Usuários ─────────────────────────────────────────────────────────── */
  const openNewUser  = () => { setEditingUser(null); setShowUserModal(true) }
  const openEditUser = (u) => { setEditingUser(u); setShowUserModal(true) }
  const handleUserSaved = () => { setShowUserModal(false); setEditingUser(null); loadUsers() }

  /* ── Clientes (portal) ───────────────────────────────────────────────── NOVO */
  const openClientAccess = (client) => { setEditingClientAccess(client); setShowClientAccessModal(true) }
  const handleClientAccessSaved = () => { setShowClientAccessModal(false); setEditingClientAccess(null); loadClients() }

  /* ── Configurações: logo + responsável técnico ──────────────────────── */
  const handleCompanyUpdated = (updated) => {
    setCompany(updated)
    setCompanyEdit(toCompanyEdit(updated))
  }

  if (loading) {
    return <div className="flex justify-center py-32"><Spinner size="lg" /></div>
  }
  if (!company) return null

  const blocked = company.is_active === false

  return (
    <div className="fade-in" style={{ minHeight: '100vh', padding: '32px', maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/admin')} className="btn-secondary" style={{ padding: 10, borderRadius: 12 }}>
            <ArrowLeft size={16} />
          </button>
          <div>
            <p className="label" style={{ marginBottom: 3 }}>Painel Global</p>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{company.name}</h1>
              <span className="badge" style={blocked
                ? { background: 'rgba(220,38,38,0.10)', color: '#DC2626' }
                : { background: 'rgba(22,163,74,0.10)', color: '#16A34A' }}>
                {blocked ? 'Bloqueada' : 'Ativa'}
              </span>
            </div>
          </div>
        </div>
        <button onClick={handleToggleActive} disabled={busyCompany} className={blocked ? 'btn-primary' : 'btn-danger'}>
          {blocked ? 'Ativar empresa' : 'Desativar empresa'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-7">
        {TABS.map(t => {
          const Icon = t.icon
          const active = activeTab === t.value
          return (
            <button
              key={t.value}
              onClick={() => setActiveTab(t.value)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150"
              style={active
                ? { background: 'var(--brand-slate)', color: 'var(--text-onbrand)', border: '1px solid var(--text-primary)' }
                : { background: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
            >
              <Icon size={13} /> {t.label}
            </button>
          )
        })}
      </div>

      {activeTab === 'resumo' && (
        <ResumoTab
          company={company}
          editing={editingCompany}
          form={companyEdit}
          onChange={setCompanyEdit}
          onEdit={() => setEditingCompany(true)}
          onCancel={() => { setEditingCompany(false); setCompanyEdit(toCompanyEdit(company)) }}
          onSave={handleSaveCompany}
          saving={savingCompanyEdit}
        />
      )}

      {activeTab === 'kpis' && <KPIsTab company={company} users={users} stats={stats} />}

      {activeTab === 'usuarios' && (
        <UsersTab users={users} onAdd={openNewUser} onEdit={openEditUser} />
      )}

      {activeTab === 'clientes' && (
        <ClientsTab clients={clients} onManageAccess={openClientAccess} />
      )}

      {activeTab === 'historico' && <HistoryTab history={history} />}

      {activeTab === 'financeiro' && <FinancialTab company={company} companyId={id} onUpdated={handleCompanyUpdated} />}

      {activeTab === 'config' && (
        <SettingsTab company={company} companyId={id} onUpdated={handleCompanyUpdated} />
      )}

      <UserModal
        open={showUserModal}
        companyId={id}
        user={editingUser}
        onClose={() => { setShowUserModal(false); setEditingUser(null) }}
        onSuccess={handleUserSaved}
      />

      <ClientAccessModal
        open={showClientAccessModal}
        companyId={id}
        client={editingClientAccess}
        onClose={() => { setShowClientAccessModal(false); setEditingClientAccess(null) }}
        onSuccess={handleClientAccessSaved}
      />
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════════
 * Abas — componentes locais (acoplados ao estado desta página)
 * ════════════════════════════════════════════════════════════════════════ */

function Field({ label, value }) {
  return (
    <div
      style={{
        background: 'rgba(0, 0, 0, 0.03)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 12,
        padding: '14px 16px',
      }}
    >
      <p
        className="label"
        style={{
          marginBottom: 10,
          color: 'var(--text-primary)',
        }}
      >
        {label}
      </p>

      <p
        className="text-sm font-medium"
        style={{ color: 'var(--text-primary)' }}
      >
        {value || '—'}
      </p>
    </div>
  )
}

function ResumoTab({ company, editing, form, onChange, onEdit, onCancel, onSave, saving }) {
  if (!editing) {
    return (
      <div className="card p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5"  style={{ paddingBottom: 24 }}>
          <Field label="Nome da empresa" value={company.name} />
          <Field label="Nome fantasia"   value={company.trade_name} />
          <Field label="Documento"       value={company.document} />
          <Field label="E-mail"          value={company.email} />
          <Field label="Telefone"        value={company.phone} />
          <Field label="Plano"           value={company.plan} />
        </div>
        <div className="divider my-5" />
        <button onClick={onEdit} className="btn-secondary mt-4">
          <Pencil size={10} /> Editar Empresa
        </button>
      </div>
    )
  }

  const set = (key, val) => onChange({ ...form, [key]: val })

  return (
    <div className="card p-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block mb-1 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Nome da Empresa</label>
          <input className="input" value={form.name} onChange={e => set('name', e.target.value)} />
        </div>
        <div>
          <label className="block mb-1 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Nome Fantasia</label>
          <input className="input" value={form.trade_name} onChange={e => set('trade_name', e.target.value)} />
        </div>
        <div>
          <label className="block mb-1 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Documento</label>
          <input className="input" value={form.document} onChange={e => set('document', e.target.value)} />
        </div>
        <div>
          <label className="block mb-1 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>E-mail</label>
          <input className="input" type="email" value={form.email} onChange={e => set('email', e.target.value)} />
        </div>
        <div>
          <label className="block mb-1 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Telefone</label>
          <input className="input" value={form.phone} onChange={e => set('phone', e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className="block mb-1 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Plano</label>
          <input className="input" value={form.plan} onChange={e => set('plan', e.target.value)} />
        </div>
      </div>
      <div className="flex gap-2 mt-5 pt-5" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <button onClick={onSave} disabled={saving} className="btn-primary">
          {saving ? 'Salvando...' : 'Salvar alterações'}
        </button>
        <button onClick={onCancel} disabled={saving} className="btn-secondary">Cancelar</button>
      </div>
    </div>
  )
}

function KPIsTab({ company, users, stats }) {
  const cards = [
    { label: 'Usuários',            value: users.length,                 color: 'var(--text-primary)' },
    { label: 'Projetos',            value: stats?.projects   ?? '—',     color: '#0284C7' },
    { label: 'Clientes',            value: stats?.clients    ?? '—',     color: '#16A34A' },
    { label: 'Arquivos',            value: stats?.files      ?? '—',     color: '#D97706' },
    { label: 'Último Acesso',       value: stats?.lastAccess ?? '—',     color: 'var(--text-secondary)' },
    { label: 'Plano Contratado',    value: company.plan || '—',          color: 'var(--text-primary)' },
  ]
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      {cards.map(c => (
        <div key={c.label} className="card p-5 text-center">
          <p className="text-2xl font-bold mb-1" style={{ color: c.color }}>{c.value}</p>
          <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>{c.label}</p>
        </div>
      ))}
      {!stats && (
        <p className="sm:col-span-3 text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
          Projetos, Clientes, Arquivos e Último Acesso aparecem aqui assim que o endpoint de estatísticas da empresa for implementado no backend.
        </p>
      )}
    </div>
  )
}

function UsersTab({ users, onAdd, onEdit }) {
  return (
    <div>
      <div className="flex justify-end mb-4">
        <button onClick={onAdd} className="btn-primary">
          <Plus size={15} /> Adicionar Usuário
        </button>
      </div>

      {users.length === 0 ? (
        <EmptyState icon={Users} title="Nenhum usuário nesta empresa" />
      ) : (
        <div className="flex flex-col gap-3">
          {users.map((u) => (
            <div
              key={u.id}
              className="rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <div className="flex-1 min-w-0">
                <p
                  className="text-sm font-semibold"
                  style={{ color: "var(--text-primary)" }}
                >
                  {u.name}
                </p>

                <p
                  className="text-xs mt-1"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {u.email}
                </p>

                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <span
                    className="badge"
                    title={ROLE_DESCRIPTIONS[u.role]}
                    style={{
                      background: "var(--bg-sidebar)",
                      color: "var(--text-primary)",
                      cursor: "help",
                    }}
                  >
                    <ShieldCheck size={11} style={{ marginRight: 4 }} />
                    {ROLE_LABELS[u.role] || u.role}
                  </span>

                  <span
                    className="badge"
                    style={
                      u.is_active === false
                        ? {
                            background: "rgba(220,38,38,0.10)",
                            color: "#DC2626",
                          }
                        : {
                            background: "rgba(22,163,74,0.10)",
                            color: "#16A34A",
                          }
                    }
                  >
                    {u.is_active === false ? "Inativo" : "Ativo"}
                  </span>

                  <span
                    className="text-xs"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Último acesso: {u.last_access || "—"}
                  </span>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => onEdit(u)}
                  className="btn-secondary btn-sm"
                >
                  <Pencil size={12} /> Editar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── NOVO — Clientes com acesso ao portal de postagens ─────────────────── */
function ClientsTab({ clients, onManageAccess }) {
  if (clients.length === 0) {
    return (
      <EmptyState
        icon={UserCheck}
        title="Nenhum cliente elegível"
        description={'Apenas registros com status "cliente" (na página de Clientes/Leads da empresa) aparecem aqui. Atualize o status de um lead para "cliente" para poder criar o acesso ao portal.'}
      />
    )
  }

  return (
    <div className="card overflow-hidden">
      <table className="w-full">
        <thead style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <tr>
            <th className="table-header" style={{ color: 'var(--text-secondary)' }}>Cliente</th>
            <th className="table-header hidden sm:table-cell" style={{ color: 'var(--text-secondary)' }}>Projetos vinculados</th>
            <th className="table-header" style={{ color: 'var(--text-secondary)' }}>Acesso ao portal</th>
            <th className="table-header hidden md:table-cell" style={{ color: 'var(--text-secondary)' }}>Último acesso</th>
            <th className="table-header" style={{ color: 'var(--text-secondary)', textAlign: 'right' }}>Ações</th>
          </tr>
        </thead>
        <tbody>
          {clients.map((c, i) => (
            <tr key={c.id} style={{ borderBottom: i < clients.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
              <td className="table-cell">
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{c.name}</p>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{c.portal_email || c.email || '—'}</p>
              </td>
              <td className="table-cell hidden sm:table-cell">
                {c.projects?.length ? (
                  <div className="flex flex-wrap gap-1">
                    {c.projects.map(p => (
                      <span key={p.id} className="badge" style={{ background: 'var(--bg-sidebar)', color: 'var(--text-primary)' }}>
                        {p.title}
                      </span>
                    ))}
                  </div>
                ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
              </td>
              <td className="table-cell">
                {!c.has_access ? (
                  <span className="badge" style={{ background: 'rgba(107,114,128,0.10)', color: 'var(--text-secondary)' }}>
                    Sem acesso
                  </span>
                ) : (
                  <span className="badge" style={c.portal_is_active
                    ? { background: 'rgba(22,163,74,0.10)', color: '#16A34A' }
                    : { background: 'rgba(220,38,38,0.10)', color: '#DC2626' }}>
                    {c.portal_is_active ? 'Ativo' : 'Desativado'}
                  </span>
                )}
              </td>
              <td className="table-cell hidden md:table-cell">
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {c.portal_last_login_at ? new Date(c.portal_last_login_at).toLocaleString('pt-BR') : '—'}
                </span>
              </td>
              <td className="table-cell" style={{ textAlign: 'right' }}>
                <button onClick={() => onManageAccess(c)} className="btn-secondary btn-sm">
                  <KeyRound size={12} /> {c.has_access ? 'Gerenciar acesso' : 'Criar acesso'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function HistoryTab({ history }) {
  if (history.length === 0) {
    return (
      <EmptyState
        icon={Clock}
        title="Nenhum registro encontrado"
        description="O histórico de alterações desta empresa (criação, edição de dados, mudança de plano, inclusão/edição/remoção de usuários, bloqueio e desbloqueio) aparecerá aqui automaticamente assim que o endpoint de auditoria for implementado no backend."
      />
    )
  }
  return (
    <div className="flex flex-col gap-3">
      {history.map(ev => (
        <div key={ev.id} className="card p-4 flex items-start gap-3">
          <div style={{ width: 3, borderRadius: 3, background: 'var(--border-medium)', alignSelf: 'stretch', minHeight: 36 }} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{ev.label}</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              {ev.actor ? `${ev.actor} · ` : ''}{ev.createdAt}
            </p>
            {ev.field && (
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                <strong>{ev.field}:</strong> {ev.oldValue ?? '—'} → {ev.newValue ?? '—'}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

const FINANCIAL_STATUS_OPTIONS = ['Trial', 'Cancelado', 'Isento']

// Deriva adimplente/inadimplente a partir da data do último pagamento.
// Espelha computeFinancialSituacao no backend (platform.service.js): a empresa
// fica adimplente enquanto o pagamento for do mês/ano corrente e passa a
// inadimplente assim que o mês vira. Comparação por componentes YYYY-MM da
// string evita distorções de fuso horário. É apenas gerencial — não bloqueia
// o acesso da empresa ao sistema.
const deriveAdimplencia = (dateStr) => {
  if (!dateStr) return null
  const [y, m] = String(dateStr).substring(0, 10).split('-').map(Number)
  const now = new Date()
  return y === now.getFullYear() && m - 1 === now.getMonth() ? 'adimplente' : 'inadimplente'
}

function AdimplenciaBadge({ situacao }) {
  const config = {
    adimplente:   { label: 'Adimplente',   color: '#34D399', bg: 'rgba(52,211,153,0.10)', border: 'rgba(52,211,153,0.25)' },
    inadimplente: { label: 'Inadimplente', color: '#FB7185', bg: 'rgba(251,113,133,0.10)', border: 'rgba(251,113,133,0.25)' },
  }[situacao] || { label: 'Sem pagamento registrado', color: 'var(--text-muted)', bg: 'rgba(107,114,128,0.08)', border: 'rgba(107,114,128,0.20)' }

  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
      style={{ color: config.color, background: config.bg, border: `1px solid ${config.border}` }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: config.color }} />
      {config.label}
    </span>
  )
}

function FinancialTab({ company, companyId, onUpdated }) {
  const toDateInput = (v) => (v ? String(v).substring(0, 10) : '')
  const todayInput  = () => new Date().toISOString().substring(0, 10)

  const [situacao,     setSituacao]     = useState(company.financial_status || '')
  const [vencimento,   setVencimento]   = useState(toDateInput(company.financial_due_date))
  const [contratadoEm, setContratadoEm] = useState(toDateInput(company.contracted_at))
  const [pagamento,    setPagamento]    = useState(toDateInput(company.last_payment_date))
  const [saving,       setSaving]       = useState(false)

  useEffect(() => {
    setSituacao(company.financial_status || '')
    setVencimento(toDateInput(company.financial_due_date))
    setContratadoEm(toDateInput(company.contracted_at))
    setPagamento(toDateInput(company.last_payment_date))
  }, [company])

  const adimplencia = deriveAdimplencia(pagamento)

  const save = async (overrides = {}) => {
    setSaving(true)
    try {
      const payload = {
        financial_status:   situacao || null,
        financial_due_date: vencimento || null,
        contracted_at:      contratadoEm || null,
        last_payment_date:  pagamento || null,
        ...overrides,
      }
      const updated = await platformService.updateCompany(companyId, payload)
      toast.success('Situação financeira atualizada')
      onUpdated(updated)
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Erro ao salvar situação financeira')
    } finally {
      setSaving(false)
    }
  }

  const registrarPagamentoHoje = () => {
    const hoje = todayInput()
    setPagamento(hoje)
    save({ last_payment_date: hoje })
  }

  return (
    <div className="card p-6">
      {/* Adimplência — derivada da data do último pagamento */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-5"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
            Adimplência
          </p>
          <AdimplenciaBadge situacao={adimplencia} />
          <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
            Calculada pela data do último pagamento. Vira inadimplente automaticamente na mudança de mês. Não bloqueia o acesso da empresa.
          </p>
        </div>
        <button onClick={registrarPagamentoHoje} disabled={saving} className="btn-primary">
          Registrar pagamento hoje
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Field label="Plano contratado" value={company.plan} />
        <div>
          <label className="block mb-1 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Data do último pagamento</label>
          <input className="input" type="date" value={pagamento} onChange={e => setPagamento(e.target.value)} />
        </div>
        <div>
          <label className="block mb-1 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Situação (manual)</label>
          <select className="input" value={situacao} onChange={e => setSituacao(e.target.value)}>
            <option value="">— Não definida —</option>
            {FINANCIAL_STATUS_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <div>
          <label className="block mb-1 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Vencimento</label>
          <input className="input" type="date" value={vencimento} onChange={e => setVencimento(e.target.value)} />
        </div>
        <div>
          <label className="block mb-1 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Data de contratação</label>
          <input className="input" type="date" value={contratadoEm} onChange={e => setContratadoEm(e.target.value)} />
        </div>
      </div>
      <div className="mt-5 pt-5" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <button onClick={() => save()} disabled={saving} className="btn-primary">
          {saving ? 'Salvando...' : 'Salvar situação financeira'}
        </button>
      </div>
    </div>
  )
}

/**
 * Configurações de identidade visual/assinatura, usadas na emissão de
 * propostas em PDF/DOCX: logo da empresa, nome e cargo do responsável
 * técnico que assina os documentos.
 */
function SettingsTab({ company, companyId, onUpdated }) {
  const fileInputRef = useRef(null)

  const [responsibleName, setResponsibleName] = useState(company.responsible_name || '')
  const [responsibleRole, setResponsibleRole] = useState(company.responsible_role || '')
  const [savingResponsible, setSavingResponsible] = useState(false)

  const [logoPreview, setLogoPreview] = useState(company.logo_url || null)
  const [logoFile,    setLogoFile]    = useState(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)

  useEffect(() => {
    setResponsibleName(company.responsible_name || '')
    setResponsibleRole(company.responsible_role || '')
    setLogoPreview(company.logo_url || null)
    setLogoFile(null)
  }, [company])

  const handlePickLogo = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  const handleUploadLogo = async () => {
    if (!logoFile) return
    setUploadingLogo(true)
    try {
      const updated = await platformService.uploadCompanyLogo(companyId, logoFile)
      toast.success('Logo atualizado')
      onUpdated(updated)
      setLogoFile(null)
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Erro ao enviar logo')
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleSaveResponsible = async () => {
    setSavingResponsible(true)
    try {
      const updated = await platformService.updateCompany(companyId, {
        responsible_name: responsibleName,
        responsible_role: responsibleRole,
      })
      toast.success('Responsável técnico atualizado')
      onUpdated(updated)
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Erro ao salvar responsável')
    } finally {
      setSavingResponsible(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Logo da empresa */}
      <div className="card p-6">
        <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
          Logomarca da empresa
        </p>
        <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
          Usada no cabeçalho das propostas comerciais geradas em PDF e Word.
        </p>

        <div className="flex items-center gap-5 flex-wrap">
          <div
            style={{
              width: 96, height: 96, borderRadius: 16,
              border: '1px dashed var(--border-medium)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden', background: 'rgba(0,0,0,0.02)', flexShrink: 0,
            }}
          >
            {logoPreview
              ? <img src={logoPreview} alt="Logo da empresa" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              : <ImagePlus size={22} style={{ color: 'var(--text-muted)' }} />
            }
          </div>

          <div className="flex flex-col gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handlePickLogo}
              style={{ display: 'none' }}
            />
            <button type="button" onClick={() => fileInputRef.current?.click()} className="btn-secondary">
              Escolher imagem
            </button>
            {logoFile && (
              <button type="button" onClick={handleUploadLogo} disabled={uploadingLogo} className="btn-primary">
                <Upload size={13} /> {uploadingLogo ? 'Enviando...' : 'Salvar logo'}
              </button>
            )}
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>PNG, JPG ou WebP.</p>
          </div>
        </div>
      </div>

      {/* Responsável técnico (assinatura dos documentos) */}
      <div className="card p-6">
        <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
          Responsável pela assinatura
        </p>
        <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
          Nome e cargo exibidos no campo de assinatura das propostas em PDF e Word.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
           <label className="block mb-1 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Nome do Responsável</label>
            <input
              className="input"
              value={responsibleName}
              onChange={e => setResponsibleName(e.target.value)}
              placeholder="Ex: Romulo Sandes"
            />
          </div>
          <div>
            <label className="block mb-1 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Cargo / Função</label>
            <input
              className="input"
              value={responsibleRole}
              onChange={e => setResponsibleRole(e.target.value)}
              placeholder="Ex: Responsável Técnico"
            />
          </div>
        </div>

        <div className="mt-5 pt-5" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <button onClick={handleSaveResponsible} disabled={savingResponsible} className="btn-primary">
            {savingResponsible ? 'Salvando...' : 'Salvar responsável'}
          </button>
        </div>
      </div>
    </div>
  )
}