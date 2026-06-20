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

  const [editingUser, setEditingUser] = useState(null) // { id, name, position, role, password }
  const [savingEdit, setSavingEdit]   = useState(false)
  const [busyUserId, setBusyUserId]   = useState(null)

  const [editingCompany, setEditingCompany] = useState(null) // { id, name, trade_name, document, email, phone, plan }
  const [savingCompanyEdit, setSavingCompanyEdit] = useState(false)
  const [busyCompanyId, setBusyCompanyId]   = useState(null)

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

  const startEditCompany = (c) => setEditingCompany({
    id: c.id,
    name: c.name || '',
    trade_name: c.trade_name || '',
    document: c.document || '',
    email: c.email || '',
    phone: c.phone || '',
    plan: c.plan || '',
  })

  const handleSaveCompany = async () => {
    if (!editingCompany) return
    if (!editingCompany.name.trim()) return toast.error('Informe o nome da empresa')
    try {
      setSavingCompanyEdit(true)
      const { id, ...payload } = editingCompany
      const updated = await platformService.updateCompany(id, payload)
      toast.success('Empresa atualizada')
      setEditingCompany(null)
      await loadCompanies()
      if (selected?.id === id) setSelected(updated)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erro ao atualizar empresa')
    } finally {
      setSavingCompanyEdit(false)
    }
  }

  const handleToggleCompanyActive = async (c) => {
    try {
      setBusyCompanyId(c.id)
      await platformService.setCompanyActive(c.id, c.is_active === false)
      await loadCompanies()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erro ao alterar status')
    } finally {
      setBusyCompanyId(null)
    }
  }

  const startEdit = (u) => setEditingUser({
    id: u.id, name: u.name, position: u.position || '', role: u.role, password: '',
  })

  const handleSaveEdit = async () => {
    if (!editingUser) return
    try {
      setSavingEdit(true)
      const payload = {
        name:     editingUser.name,
        position: editingUser.position,
        role:     editingUser.role,
      }
      if (editingUser.password) payload.password = editingUser.password
      await platformService.updateCompanyUser(selected.id, editingUser.id, payload)
      toast.success('Usuário atualizado')
      setEditingUser(null)
      await loadUsers(selected.id)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erro ao atualizar usuário')
    } finally {
      setSavingEdit(false)
    }
  }

  const handleToggleActive = async (u) => {
    try {
      setBusyUserId(u.id)
      await platformService.updateCompanyUser(selected.id, u.id, { isActive: u.is_active === false })
      await loadUsers(selected.id)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erro ao alterar status')
    } finally {
      setBusyUserId(null)
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
    act:   (color) => ({ background: 'none', border: `1px solid ${color}33`, color, borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }),
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
              editingCompany?.id === c.id ? (
                /* ── empresa: modo edição ── */
                <div key={c.id} style={{ ...S.row(true), display: 'block', cursor: 'default' }}>
                  <input style={{ ...S.input, marginBottom: 8 }} placeholder="Nome da empresa" value={editingCompany.name}
                    onChange={e => setEditingCompany({ ...editingCompany, name: e.target.value })} />
                  <input style={S.input} placeholder="Nome fantasia" value={editingCompany.trade_name}
                    onChange={e => setEditingCompany({ ...editingCompany, trade_name: e.target.value })} />
                  <input style={S.input} placeholder="Documento (CNPJ/CPF)" value={editingCompany.document}
                    onChange={e => setEditingCompany({ ...editingCompany, document: e.target.value })} />
                  <input style={S.input} placeholder="E-mail" value={editingCompany.email}
                    onChange={e => setEditingCompany({ ...editingCompany, email: e.target.value })} />
                  <input style={S.input} placeholder="Telefone" value={editingCompany.phone}
                    onChange={e => setEditingCompany({ ...editingCompany, phone: e.target.value })} />
                  <input style={S.input} placeholder="Plano" value={editingCompany.plan}
                    onChange={e => setEditingCompany({ ...editingCompany, plan: e.target.value })} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button style={S.btn} disabled={savingCompanyEdit} onClick={handleSaveCompany}>
                      {savingCompanyEdit ? 'Salvando...' : 'Salvar'}
                    </button>
                    <button style={{ ...S.btn, background: 'none', border: '1px solid rgba(255,255,255,0.2)' }}
                      disabled={savingCompanyEdit} onClick={() => setEditingCompany(null)}>
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                /* ── empresa: modo exibição ── */
                <div key={c.id} style={S.row(selected?.id === c.id)} onClick={() => selectCompany(c)}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{c.name}</div>
                    <div style={S.muted}>{c.plan} · {c.users_count} usuário(s)</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {c.is_active === false
                      ? <span style={{ ...S.tag, background: 'rgba(239,68,68,0.12)', color: '#F87171' }}>inativa</span>
                      : <span style={S.tag}>ativa</span>}
                    <button style={S.act('#A78BFA')} disabled={busyCompanyId === c.id}
                      onClick={(e) => { e.stopPropagation(); startEditCompany(c) }}>Editar</button>
                    <button style={S.act('#38BDF8')} disabled={busyCompanyId === c.id}
                      onClick={(e) => { e.stopPropagation(); handleToggleCompanyActive(c) }}>
                      {c.is_active === false ? 'Ativar' : 'Desativar'}
                    </button>
                  </div>
                </div>
              )
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
                  editingUser?.id === u.id ? (
                    /* ── modo edição ── */
                    <div key={u.id} style={{ ...S.row(true), display: 'block', cursor: 'default' }}>
                      <div style={S.muted}>{u.email}</div>
                      <input style={{ ...S.input, marginTop: 8 }} placeholder="Nome" value={editingUser.name}
                        onChange={e => setEditingUser({ ...editingUser, name: e.target.value })} />
                      <input style={S.input} placeholder="Cargo (opcional)" value={editingUser.position}
                        onChange={e => setEditingUser({ ...editingUser, position: e.target.value })} />
                      <select style={S.input} value={editingUser.role}
                        onChange={e => setEditingUser({ ...editingUser, role: e.target.value })}>
                        <option value="owner">Owner</option>
                        <option value="admin">Administrador</option>
                        <option value="manager">Gestor / Arquiteto</option>
                        <option value="employee">Colaborador</option>
                      </select>
                      <input style={S.input} type="password" placeholder="Nova senha (opcional, mín. 8)" value={editingUser.password}
                        onChange={e => setEditingUser({ ...editingUser, password: e.target.value })} />
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button style={S.btn} disabled={savingEdit} onClick={handleSaveEdit}>
                          {savingEdit ? 'Salvando...' : 'Salvar'}
                        </button>
                        <button style={{ ...S.btn, background: 'none', border: '1px solid rgba(255,255,255,0.2)' }}
                          disabled={savingEdit} onClick={() => setEditingUser(null)}>
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* ── modo exibição ── */
                    <div key={u.id} style={{ ...S.row(false), cursor: 'default' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{u.name}</div>
                        <div style={S.muted}>{u.email} · {u.role}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {u.is_active === false
                          ? <span style={{ ...S.tag, background: 'rgba(239,68,68,0.12)', color: '#F87171' }}>inativo</span>
                          : <span style={S.tag}>ativo</span>}
                        <button style={S.act('#A78BFA')} disabled={busyUserId === u.id} onClick={() => startEdit(u)}>Editar</button>
                        <button style={S.act('#38BDF8')} disabled={busyUserId === u.id} onClick={() => handleToggleActive(u)}>
                          {u.is_active === false ? 'Ativar' : 'Desativar'}
                        </button>
                      </div>
                    </div>
                  )
                ))
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
