import { useState, useEffect } from 'react'
import { Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import PortalModal from '../ui/PortalModal'
import platformService from '../../services/platform.service'
import useIdempotencyKey from '../../hooks/useIdempotencyKey'

const EMPTY = { portalEmail: '', password: '', projectIds: [], isActive: true }

export default function ClientAccessModal({ open, onClose, onSuccess, companyId, client }) {
  const isManaging = !!client?.has_access

  const [projects, setProjects] = useState([])
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [revoking, setRevoking] = useState(false)
  const [confirmRevoke, setConfirmRevoke] = useState(false)
  const [loadingProjects, setLoadingProjects] = useState(false)

  // Uma chave por intenção — ver hooks/useIdempotencyKey.
  const [idemKey, renewIdemKey] = useIdempotencyKey(open)

  useEffect(() => {
    if (!open || !client) return

    setForm(isManaging
      ? {
          portalEmail: client.portal_email || '',
          password: '',
          projectIds: (client.projects || []).map(p => p.id),
          isActive: client.portal_is_active ?? true,
        }
      : {
          portalEmail: client.email || '',
          password: '',
          projectIds: [],
          isActive: true,
        }
    )
    setConfirmRevoke(false)

    setLoadingProjects(true)
    platformService.listCompanyProjects(companyId)
      .then(setProjects)
      .catch(() => toast.error('Erro ao carregar projetos da empresa'))
      .finally(() => setLoadingProjects(false))
  }, [open, client, companyId, isManaging])

  if (!client) return null

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  const toggleProject = (projectId) => {
    setForm(prev => ({
      ...prev,
      projectIds: prev.projectIds.includes(projectId)
        ? prev.projectIds.filter(id => id !== projectId)
        : [...prev.projectIds, projectId],
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!isManaging) {
      if (!form.portalEmail.trim()) return toast.error('Informe o e-mail de acesso')
      if (form.password.length < 8) return toast.error('A senha deve ter no mínimo 8 caracteres')
    } else if (form.password && form.password.length < 8) {
      return toast.error('A nova senha deve ter no mínimo 8 caracteres')
    }
    if (form.projectIds.length === 0) return toast.error('Selecione ao menos um projeto')

    setSaving(true)
    try {
      if (isManaging) {
        const payload = { projectIds: form.projectIds, isActive: form.isActive }
        if (form.password) payload.password = form.password
        await platformService.updateClientPortalAccess(companyId, client.id, payload)
        toast.success('Acesso atualizado')
      } else {
        await platformService.createClientPortalAccess(companyId, client.id, {
          portalEmail: form.portalEmail.trim(),
          password: form.password,
          projectIds: form.projectIds,
        }, idemKey)
        toast.success('Acesso criado com sucesso')
        renewIdemKey() // intenção concluída
      }
      onSuccess()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Erro ao salvar acesso')
    } finally {
      setSaving(false)
    }
  }

  const handleRevoke = async () => {
    if (!confirmRevoke) { setConfirmRevoke(true); return }
    setRevoking(true)
    try {
      await platformService.revokeClientPortalAccess(companyId, client.id)
      toast.success('Acesso revogado')
      onSuccess()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Erro ao revogar acesso')
    } finally {
      setRevoking(false)
      setConfirmRevoke(false)
    }
  }

  return (
    <PortalModal
      open={open}
      onClose={onClose}
      title={isManaging ? 'Gerenciar Acesso' : 'Criar Acesso ao Portal'}
      size="md"
    >
      <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)', marginTop: -4 }}>{client.name}</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block mb-1 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              E-mail de acesso {isManaging && '(não editável)'}
            </label>
            <input
              className="input"
              type="email"
              value={form.portalEmail}
              disabled={isManaging}
              onChange={e => set('portalEmail', e.target.value)}
              style={isManaging ? { opacity: 0.6, cursor: 'not-allowed' } : undefined}
              placeholder="Pode ser diferente do e-mail cadastrado no CRM"
            />
          </div>

          <div>
            <label className="block mb-1 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              {isManaging ? 'Nova senha (opcional, mín. 8)' : 'Senha (mín. 8) *'}
            </label>
            <input
              className="input"
              type="password"
              value={form.password}
              onChange={e => set('password', e.target.value)}
            />
          </div>

          <div>
            <label className="block mb-1 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Projetos vinculados</label>

            {loadingProjects ? (
              <p className="text-xs" style={{ color: 'var(--text-primary)' }}>Carregando projetos...</p>
            ) : projects.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--text-primary)' }}>Nenhum projeto encontrado nesta empresa.</p>
            ) : (
              <div
                className="flex flex-col gap-1.5 p-3 rounded-xl bg-surface"
                style={{ border: '1px solid var(--border-subtle)', maxHeight: 180, overflowY: 'auto' }}
              >
                {projects.map(p => (
                  <label key={p.id} className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--text-primary)' }}>
                    <input
                      type="checkbox"
                      checked={form.projectIds.includes(p.id)}
                      onChange={() => toggleProject(p.id)}
                    />
                    {p.title}
                  </label>
                ))}
              </div>
            )}
          </div>

          {isManaging && (
            <div>
              <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--text-primary)' }}>
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={e => set('isActive', e.target.checked)}
                />
                Acesso ativo
              </label>
            </div>
          )}

          <div className="flex justify-between items-center mt-2 pt-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            {isManaging ? (
              <div className="flex items-center gap-2">
                <button type="button" onClick={handleRevoke} disabled={revoking} className="btn-danger btn-sm">
                  <Trash2 size={13} />
                  {revoking ? 'Revogando...' : confirmRevoke ? 'Confirmar revogação' : 'Revogar acesso'}
                </button>
                {confirmRevoke && (
                  <button type="button" onClick={() => setConfirmRevoke(false)} className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                    Cancelar
                  </button>
                )}
              </div>
            ) : <div />}

            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? 'Salvando...' : isManaging ? 'Salvar alterações' : 'Criar acesso'}
              </button>
            </div>
          </div>
        </form>
    </PortalModal>
  )
}