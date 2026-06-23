import { useState, useEffect } from 'react'
import { X, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import platformService from '../../services/platform.service'

const ROLE_OPTIONS = [
  { value: 'owner',    label: 'Owner'                },
  { value: 'admin',    label: 'Administrador'        },
  { value: 'manager',  label: 'Gestor / Arquiteto'    },
  { value: 'employee', label: 'Colaborador'           },
]

const EMPTY = { name: '', email: '', password: '', role: 'employee', position: '' }

export default function UserModal({ open, onClose, onSuccess, companyId, user = null }) {
  const isEditing = !!user

  const [form,          setForm]          = useState(EMPTY)
  const [saving,        setSaving]        = useState(false)
  const [deleting,      setDeleting]      = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (!open) return
    setForm(user
      ? { name: user.name || '', email: user.email || '', password: '', role: user.role || 'employee', position: user.position || '' }
      : EMPTY
    )
    setConfirmDelete(false)
  }, [open, user])

  if (!open) return null

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return toast.error('Informe o nome do usuário')
    if (!isEditing && !form.email.trim()) return toast.error('Informe o e-mail do usuário')
    if (!isEditing && form.password.length < 8) return toast.error('A senha deve ter no mínimo 8 caracteres')

    setSaving(true)
    try {
      if (isEditing) {
        const payload = { name: form.name, position: form.position, role: form.role }
        if (form.password) payload.password = form.password
        await platformService.updateCompanyUser(companyId, user.id, payload)
        toast.success('Usuário atualizado')
      } else {
        await platformService.createCompanyUser(companyId, form)
        toast.success('Usuário criado')
      }
      onSuccess()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Erro ao salvar usuário')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return }
    setDeleting(true)
    try {
      await platformService.deleteCompanyUser(companyId, user.id)
      toast.success('Usuário excluído')
      onSuccess()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Erro ao excluir usuário')
    } finally {
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-content" style={{ maxWidth: 480 }}>
        <div className="flex items-center justify-between px-7 pt-6 pb-5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div>
            <p className="label" style={{ marginBottom: 3 }}>Usuários</p>
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              {isEditing ? 'Editar Usuário' : 'Adicionar Usuário'}
            </h2>
          </div>
          <button onClick={onClose} className="btn-secondary" style={{ padding: 8, borderRadius: 12 }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-7 py-6 flex flex-col gap-4">
          <div>
            <label className="label">Nome *</label>
            <input className="input" value={form.name} onChange={e => set('name', e.target.value)} required />
          </div>

          <div>
            <label className="label">E-mail {isEditing && '(não editável)'}</label>
            <input className="input" type="email" value={form.email} disabled={isEditing}
              onChange={e => set('email', e.target.value)} style={isEditing ? { opacity: 0.6, cursor: 'not-allowed' } : undefined} />
          </div>

          <div>
            <label className="label">Cargo (opcional)</label>
            <input className="input" value={form.position} onChange={e => set('position', e.target.value)} />
          </div>

          <div>
            <label className="label">Permissão</label>
            <select className="input" value={form.role} onChange={e => set('role', e.target.value)}>
              {ROLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <div>
            <label className="label">{isEditing ? 'Nova senha (opcional, mín. 8)' : 'Senha (mín. 8) *'}</label>
            <input className="input" type="password" value={form.password} onChange={e => set('password', e.target.value)} />
          </div>

          <div className="flex justify-between items-center mt-2 pt-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            {isEditing ? (
              <div className="flex items-center gap-2">
                <button type="button" onClick={handleDelete} disabled={deleting} className="btn-danger btn-sm">
                  <Trash2 size={13} />
                  {deleting ? 'Excluindo...' : confirmDelete ? 'Confirmar exclusão' : 'Excluir'}
                </button>
                {confirmDelete && (
                  <button type="button" onClick={() => setConfirmDelete(false)} className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                    Cancelar
                  </button>
                )}
              </div>
            ) : <div />}

            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? 'Salvando...' : isEditing ? 'Salvar alterações' : 'Criar usuário'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}