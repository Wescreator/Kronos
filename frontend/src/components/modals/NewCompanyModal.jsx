import { useState } from 'react'
import { X } from 'lucide-react'
import toast from 'react-hot-toast'
import platformService from '../../services/platform.service'

// ⚠️ Valores de plano assumidos — ajuste para os planos reais do Kronos.
const PLAN_OPTIONS = [
  { value: 'free',       label: 'Free'       },
  { value: 'pro',        label: 'Pro'        },
  { value: 'business',   label: 'Business'   },
  { value: 'enterprise', label: 'Enterprise' },
]

const EMPTY = { name: '', trade_name: '', document: '', email: '', phone: '', plan: 'free' }

export default function NewCompanyModal({ open, onClose, onCreated }) {
  const [form,   setForm]   = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  if (!open) return null

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return toast.error('Informe o nome da empresa')
    setSaving(true)
    try {
      const created = await platformService.createCompany(form)
      toast.success('Empresa criada')
      setForm(EMPTY)
      onCreated(created)
      onClose()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Erro ao criar empresa')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="modal-overlay"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="modal-content" style={{ maxWidth: 520 }}>
        <div className="flex items-center justify-between px-7 pt-6 pb-5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div>
            <p className="label" style={{ marginBottom: 3 }}>Plataforma</p>
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-secondary)' }}>Nova Empresa</h2>
          </div>
          <button onClick={onClose} className="btn-secondary" style={{ padding: 8, borderRadius: 12 }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-7 py-6 flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Nome da empresa *</label>
              <input className="input" placeholder="Razão social" value={form.name}
                onChange={e => set('name', e.target.value)} required />
            </div>
            <div>
              <label className="label">Nome fantasia</label>
              <input className="input" value={form.trade_name}
                onChange={e => set('trade_name', e.target.value)} />
            </div>
            <div>
              <label className="label">Documento (CNPJ/CPF)</label>
              <input className="input" value={form.document}
                onChange={e => set('document', e.target.value)} />
            </div>
            <div>
              <label className="label">E-mail</label>
              <input className="input" type="email" value={form.email}
                onChange={e => set('email', e.target.value)} />
            </div>
            <div>
              <label className="label">Telefone</label>
              <input className="input" value={form.phone}
                onChange={e => set('phone', e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Plano</label>
              <select className="input" value={form.plan} onChange={e => set('plan', e.target.value)}>
                {PLAN_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-2 pt-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Criando...' : 'Criar empresa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}