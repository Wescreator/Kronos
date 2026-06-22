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

  const EMPTY_COMPANY = { name: '', trade_name: '', document: '', email: '', phone: '', plan: 'free' }
  const [companyForm, setCompanyForm] = useState(EMPTY_COMPANY)
  const [creating, setCreating]       = useState(false)
  const [userForm, setUserForm]       = useState({ name: '', email: '', password: '', role: 'admin', position: '' })
  const [savingCompany, setSavingCompany] = useState(false)
  const [savingUser, setSavingUser]       = useState(false)

  const [editingUser, setEditingUser] = useState(null) // { id, name, position, role, password }
  const [savingEdit, setSavingEdit]   = useState(false)
  const [busyUserId, setBusyUserId]   = useState(null)

  const [companyEdit, setCompanyEdit] = useState(null) // dados da empresa selecionada (editáveis)
  const [savingCompanyEdit, setSavingCompanyEdit] = useState(false)
  const [busyCompanyId, setBusyCompanyId]   = useState(null)

  const toCompanyEdit = (c) => ({
    name: c.name || '', trade_name: c.trade_name || '', document: c.document || '',
    email: c.email || '', phone: c.phone || '', plan: c.plan || '',
  })

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
    setCreating(false)
    setSelected(company)
    setCompanyEdit(toCompanyEdit(company))
    setUsers([])
    loadUsers(company.id)
  }

  const startCreate = () => {
    setCreating(true)
    setSelected(null)
    setCompanyEdit(null)
    setCompanyForm(EMPTY_COMPANY)
  }

  const handleCreateCompany = async (e) => {
    e?.preventDefault?.()
    if (!companyForm.name.trim()) return toast.error('Informe o nome da empresa')
    try {
      setSavingCompany(true)
      const created = await platformService.createCompany(companyForm)
      toast.success('Empresa criada')
      setCompanyForm(EMPTY_COMPANY)
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

  const handleSaveCompany = async () => {
    if (!selected || !companyEdit) return
    if (!companyEdit.name.trim()) return toast.error('Informe o nome da empresa')
    try {
      setSavingCompanyEdit(true)
      const updated = await platformService.updateCompany(selected.id, companyEdit)
      toast.success('Empresa atualizada')
      await loadCompanies()
      setSelected(updated)
      setCompanyEdit(toCompanyEdit(updated))
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erro ao atualizar empresa')
    } finally {
      setSavingCompanyEdit(false)
    }
  }

  const handleToggleCompanyActive = async (c) => {
    try {
      setBusyCompanyId(c.id)
      const res = await platformService.setCompanyActive(c.id, c.is_active === false)
      await loadCompanies()
      if (selected?.id === c.id) setSelected({ ...selected, is_active: res.is_active })
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
  // Paleta "cinza metálico" — mesma régua das telas de autenticação:
  // fundo em gradiente 3-stop, card branco elevado, hierarquia de texto
  // por escurecimento (#374151 > #6B7280 > #9CA3AF), bordas #D1D5DB.
  // Cores semânticas (verde = ativo, vermelho = inativo/sair) preservadas
  // e apenas recalibradas para contraste sobre fundo claro; "Editar" (antes
  // roxo) foi neutralizado para a escala de cinza por não carregar
  // significado de estado.
  const S = {
    page:  { minHeight: '100vh', background: 'linear-gradient(135deg, #c7cbd1 0%, #9aa0a6 50%, #c7cbd1 100%)', color: '#374151', fontFamily: "'Plus Jakarta Sans', sans-serif", padding: '32px' },
    head:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: 1200, margin: '0 auto 28px' },
    grid:  { display: 'grid', gridTemplateColumns: 'minmax(260px, 0.9fr) 1.8fr', gap: 24, maxWidth: 1200, margin: '0 auto', alignItems: 'start' },
    card:  { background: '#FFFFFF', border: '1px solid #D1D5DB', borderRadius: 16, padding: 24, boxShadow: '0 30px 70px -20px rgba(20,24,28,.25), 0 1px 0 rgba(255,255,255,.6) inset' },
    h2:    { fontSize: 16, fontWeight: 700, marginBottom: 16, letterSpacing: '0.02em', color: '#374151' },
    label: { fontSize: 11, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6, display: 'block' },
    input: { width: '100%', background: '#FFFFFF', border: '1px solid #D1D5DB', borderRadius: 10, padding: '10px 12px', color: '#374151', fontSize: 14, marginBottom: 10, fontFamily: 'inherit', boxSizing: 'border-box' },
    btn:   { background: '#374151', border: 'none', color: '#fff', borderRadius: 10, padding: '10px 18px', cursor: 'pointer', fontSize: 14, fontWeight: 600, fontFamily: 'inherit' },
    btnGhost: { background: 'none', border: '1px solid #D1D5DB', color: '#374151', borderRadius: 10, padding: '10px 18px', cursor: 'pointer', fontSize: 14, fontWeight: 600, fontFamily: 'inherit' },
    row:   (active) => ({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderRadius: 10, marginBottom: 8, cursor: 'pointer', border: '1px solid', borderColor: active ? '#9CA3AF' : '#E5E7EB', background: active ? '#F3F4F6' : '#FAFAFA' }),
    tag:   { fontSize: 11, padding: '2px 8px', borderRadius: 999, background: 'rgba(22,163,74,.12)', color: '#16A34A' },
    muted: { color: '#9CA3AF', fontSize: 13 },
    act:   (color) => ({ background: 'none', border: `1px solid ${color}33`, color, borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }),
    fieldGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
    full: { gridColumn: '1 / -1' },
  }

  // Campos da empresa em grade (reaproveitado em criar e editar).
  // Funcao (nao componente) para nao perder foco do input a cada tecla.
  const renderCompanyFields = (value, onChange) => {
    const field = (key, label, opts = {}) => (
      <div style={opts.full ? S.full : undefined}>
        <label style={S.label}>{label}</label>
        <input
          style={{ ...S.input, marginBottom: 0 }}
          type={opts.type || 'text'}
          placeholder={label}
          value={value[key] || ''}
          onChange={e => onChange({ ...value, [key]: e.target.value })}
        />
      </div>
    )
    return (
      <div style={S.fieldGrid}>
        {field('name', 'Nome da empresa', { full: true })}
        {field('trade_name', 'Nome fantasia')}
        {field('document', 'Documento (CNPJ/CPF)')}
        {field('email', 'E-mail', { type: 'email' })}
        {field('phone', 'Telefone')}
        {field('plan', 'Plano', { full: true })}
      </div>
    )
  }

  return (
    <div style={S.page}>
      <Toaster position="top-right" toastOptions={{ style: { background: '#FFFFFF', color: '#374151', border: '1px solid #E5E7EB' } }} />
      <div style={S.head}>
        <div>
          <div style={{ fontSize: 12, letterSpacing: '0.18em', color: '#6B7280', textTransform: 'uppercase' }}>
            Painel Global — Super Admin
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginTop: 4, color: '#374151' }}>Gestão de Empresas</h1>
          <p style={S.muted}>Olá, {user?.name}. Crie empresas e seus usuários.</p>
        </div>
        <button
          onClick={() => { logout(); navigate('/login') }}
          style={{ ...S.btn, background: 'none', border: '1px solid rgba(220,38,38,.3)', color: '#DC2626' }}
        >
          Sair
        </button>
      </div>

      <div style={S.grid}>
        {/* ── Empresas ── */}
        <div style={S.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ ...S.h2, marginBottom: 0 }}>Empresas</div>
            <button style={S.act('#374151')} onClick={startCreate}>+ Nova</button>
          </div>

          {loading ? (
            <p style={S.muted}>Carregando...</p>
          ) : companies.length === 0 ? (
            <p style={S.muted}>Nenhuma empresa ainda.</p>
          ) : (
            companies.map(c => (
              <div key={c.id} style={S.row(selected?.id === c.id)} onClick={() => selectCompany(c)}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>{c.name}</div>
                  <div style={S.muted}>{c.plan} · {c.users_count} usuário(s)</div>
                </div>
                {c.is_active === false
                  ? <span style={{ ...S.tag, background: 'rgba(220,38,38,.12)', color: '#DC2626' }}>inativa</span>
                  : <span style={S.tag}>ativa</span>}
              </div>
            ))
          )}
        </div>

        {/* ── Painel da empresa (criar / detalhes + usuários) ── */}
        <div style={S.card}>
          {creating ? (
            /* ── Nova empresa ── */
            <>
              <div style={S.h2}>Nova empresa</div>
              {renderCompanyFields(companyForm, setCompanyForm)}
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button style={S.btn} disabled={savingCompany} onClick={handleCreateCompany}>
                  {savingCompany ? 'Criando...' : 'Criar empresa'}
                </button>
                <button style={S.btnGhost} disabled={savingCompany} onClick={() => setCreating(false)}>
                  Cancelar
                </button>
              </div>
            </>
          ) : !selected ? (
            <>
              <div style={S.h2}>Nenhuma empresa selecionada</div>
              <p style={S.muted}>Selecione uma empresa à esquerda para editar seus dados e gerenciar usuários, ou clique em <strong>+ Nova</strong> para criar.</p>
            </>
          ) : (
            <>
              {/* ── Dados da empresa ── */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ ...S.h2, marginBottom: 0 }}>Dados da empresa</div>
                <button
                  style={S.act(selected.is_active === false ? '#16A34A' : '#DC2626')}
                  disabled={busyCompanyId === selected.id}
                  onClick={() => handleToggleCompanyActive(selected)}
                >
                  {selected.is_active === false ? 'Ativar empresa' : 'Desativar empresa'}
                </button>
              </div>

              {companyEdit && (
                <>
                  {renderCompanyFields(companyEdit, setCompanyEdit)}
                  <button style={{ ...S.btn, marginTop: 16 }} disabled={savingCompanyEdit} onClick={handleSaveCompany}>
                    {savingCompanyEdit ? 'Salvando...' : 'Salvar dados'}
                  </button>
                </>
              )}

              <div style={{ height: 1, background: '#E5E7EB', margin: '24px 0 20px' }} />

              {/* ── Usuários ── */}
              <div style={S.h2}>Usuários — {selected.name}</div>

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
                        <button style={{ ...S.btn, background: 'none', border: '1px solid #D1D5DB', color: '#374151' }}
                          disabled={savingEdit} onClick={() => setEditingUser(null)}>
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* ── modo exibição ── */
                    <div key={u.id} style={{ ...S.row(false), cursor: 'default' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>{u.name}</div>
                        <div style={S.muted}>{u.email} · {u.role}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {u.is_active === false
                          ? <span style={{ ...S.tag, background: 'rgba(220,38,38,.12)', color: '#DC2626' }}>inativo</span>
                          : <span style={S.tag}>ativo</span>}
                        <button style={S.act('#6B7280')} disabled={busyUserId === u.id} onClick={() => startEdit(u)}>Editar</button>
                        <button style={S.act('#6B7280')} disabled={busyUserId === u.id} onClick={() => handleToggleActive(u)}>
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