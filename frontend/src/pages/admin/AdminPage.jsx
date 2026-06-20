import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast, { Toaster } from 'react-hot-toast'
import useAuthStore from '../../store/authStore'
import platformService from '../../services/platform.service'

/**
 * AdminPage — Painel do Super Admin (developer)
 *
 * Escopo global. Página única de gestão da plataforma:
 *   - criar / listar empresas
 *   - criar / listar usuários de cada empresa
 */
export default function AdminPage() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const [companies, setCompanies] = useState([])
  const [selected, setSelected]   = useState(null)
  const [users, setUsers]         = useState([])
  const [loading, setLoading]     = useState(true)

  const [companyForm, setCompanyForm] = useState({ name: '', plan: 'free' })
  const [userForm, setUserForm]       = useState({ name: '', email: '', password: '', role: 'admin', position: '' })
  const [savingCompany, setSavingCompany] = useState(false)
  const [savingUser, setSavingUser]       = useState(false)

  const loadCompanies = async () => {
    try {
      setLoading(true)
      const list = await platformService.listCompanies()
      setCompanies(list)
    } catch (err) {
      toast.error('Falha ao carregar empresas')
    } finally {
      setLoading(false)
    }
  }

  const loadUsers = async (companyId) => {
    try {
      const list = await platformService.listCompanyUsers(companyId)
      setUsers(list)
    } catch (err) {
      toast.error('Falha ao carregar usuários')
    }
  }

  useEffect(() => { loadCompanies() }, [])

  const selectCompany = (company) => {
    setSelected(company)
    setUsers([])
    loadUsers(company.id)
  }

  const handleCreateCompany = async (e) => {
    e.preventDefault()
    if (!companyForm.name.trim()) return toast.error('Informe o nome da empresa')
    try {
      setSavingCompany(true)
      const created = await platformService.createCompany(companyForm)
      toast.success('Empresa criada')
      setCompanyForm({ name: '', plan: 'free' })
      await loadCompanies()
      selectCompany(created)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erro ao criar empresa')
    } finally {
      setSavingCompany(false)
    }
  }

  const handleCreateUser = async (e) => {
    e.preventDefault()
    if (!selected) return
    try {
      setSavingUser(true)
      await platformService.createCompanyUser(selected.id, userForm)
      toast.success('Usuário criado')
      setUserForm({ name: '', email: '', password: '', role: 'admin', position: '' })
      await loadUsers(selected.id)
      await loadCompanies()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erro ao criar usuário')
    } finally {
      setSavingUser(false)
    }
  }

  // ── estilos ──────────────────────────────────────────────────
  const S = {
    page:  { minHeight: '100vh', background: 'radial-gradient(ellipse at 50% 0%, #0b0d20, #060816)', color: '#fff', fontFamily: "'Plus Jakarta Sans', sans-serif", padding: '32px' },
    head:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, maxWidth: 1100, margin: '0 auto 28px' },
    grid:  { display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 24, maxWidth: 1100, margin: '0 auto' },
    card:  { background: 'rgba(13,21,43,0.9)', border: '1px solid rgba(124,92,252,0.20)', borderRadius: 16, padding: 24 },
    h2:    { fontSize: 16, fontWeight: 700, marginBottom: 16, letterSpacing: '0.02em' },
    input: { width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '10px 12px', color: '#fff', fontSize: 14, marginBottom: 10, fontFamily: 'inherit' },
    btn:   { background: '#7C5CFC', border: 'none', color: '#fff', borderRadius: 10, padding: '10px 18px', cursor: 'pointer', fontSize: 14, fontWeight: 600, fontFamily: 'inherit' },
    row:   (active) => ({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderRadius: 10, marginBottom: 8, cursor: 'pointer', border: '1px solid', borderColor: active ? 'rgba(124,92,252,0.5)' : 'rgba(255,255,255,0.08)', background: active ? 'rgba(124,92,252,0.12)' : 'rgba(255,255,255,0.03)' }),
    tag:   { fontSize: 11, padding: '2px 8px', borderRadius: 999, background: 'rgba(52,211,153,0.12)', color: '#34D399' },
    muted: { color: 'rgba(255,255,255,0.4)', fontSize: 13 },
  }

  return (
    <div style={S.page}>
      <Toaster position="top-right" toastOptions={{ style: { background: '#0d152b', color: '#fff', border: '1px solid rgba(124,92,252,0.3)' } }} />
      <div style={S.head}>
        <div>
          <div style={{ fontSize: 12, letterSpacing: '0.18em', color: 'rgba(251,191,36,0.7)', textTransform: 'uppercase' }}>
            Painel Global — Super Admin
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>Gestão de Empresas</h1>
          <p style={S.muted}>Olá, {user?.name}. Crie empresas e seus usuários.</p>
        </div>
        <button
          onClick={() => { logout(); navigate('/login') }}
          style={{ ...S.btn, background: 'none', border: '1px solid rgba(239,68,68,0.3)', color: '#F87171' }}
        >
          Sair
        </button>
      </div>

      <div style={S.grid}>
        {/* ── Empresas ── */}
        <div style={S.card}>
          <div style={S.h2}>Empresas</div>

          <form onSubmit={handleCreateCompany} style={{ marginBottom: 20 }}>
            <input
              style={S.input}
              placeholder="Nome da empresa"
              value={companyForm.name}
              onChange={e => setCompanyForm({ ...companyForm, name: e.target.value })}
            />
            <input
              style={S.input}
              placeholder="Plano (ex.: free, pro)"
              value={companyForm.plan}
              onChange={e => setCompanyForm({ ...companyForm, plan: e.target.value })}
            />
            <button style={S.btn} disabled={savingCompany}>
              {savingCompany ? 'Criando...' : '+ Criar empresa'}
            </button>
          </form>

          {loading ? (
            <p style={S.muted}>Carregando...</p>
          ) : companies.length === 0 ? (
            <p style={S.muted}>Nenhuma empresa ainda.</p>
          ) : (
            companies.map(c => (
              <div key={c.id} style={S.row(selected?.id === c.id)} onClick={() => selectCompany(c)}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{c.name}</div>
                  <div style={S.muted}>{c.slug} · {c.plan} · {c.users_count} usuário(s)</div>
                </div>
                {c.is_active === false
                  ? <span style={{ ...S.tag, background: 'rgba(239,68,68,0.12)', color: '#F87171' }}>inativa</span>
                  : <span style={S.tag}>ativa</span>}
              </div>
            ))
          )}
        </div>

        {/* ── Usuários da empresa selecionada ── */}
        <div style={S.card}>
          <div style={S.h2}>
            {selected ? `Usuários — ${selected.name}` : 'Selecione uma empresa'}
          </div>

          {!selected ? (
            <p style={S.muted}>Escolha uma empresa à esquerda para gerenciar seus usuários.</p>
          ) : (
            <>
              <form onSubmit={handleCreateUser} style={{ marginBottom: 20 }}>
                <input style={S.input} placeholder="Nome" value={userForm.name}
                  onChange={e => setUserForm({ ...userForm, name: e.target.value })} />
                <input style={S.input} placeholder="E-mail" type="email" value={userForm.email}
                  onChange={e => setUserForm({ ...userForm, email: e.target.value })} />
                <input style={S.input} placeholder="Senha (mín. 8)" type="password" value={userForm.password}
                  onChange={e => setUserForm({ ...userForm, password: e.target.value })} />
                <input style={S.input} placeholder="Cargo (opcional)" value={userForm.position}
                  onChange={e => setUserForm({ ...userForm, position: e.target.value })} />
                <select style={S.input} value={userForm.role}
                  onChange={e => setUserForm({ ...userForm, role: e.target.value })}>
                  <option value="owner">Owner</option>
                  <option value="admin">Administrador</option>
                  <option value="manager">Gestor / Arquiteto</option>
                  <option value="employee">Colaborador</option>
                </select>
                <button style={S.btn} disabled={savingUser}>
                  {savingUser ? 'Criando...' : '+ Criar usuário'}
                </button>
              </form>

              {users.length === 0 ? (
                <p style={S.muted}>Nenhum usuário nesta empresa.</p>
              ) : (
                users.map(u => (
                  <div key={u.id} style={S.row(false)}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{u.name}</div>
                      <div style={S.muted}>{u.email} · {u.role}</div>
                    </div>
                    {u.is_active === false
                      ? <span style={{ ...S.tag, background: 'rgba(239,68,68,0.12)', color: '#F87171' }}>inativo</span>
                      : <span style={S.tag}>ativo</span>}
                  </div>
                ))
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
