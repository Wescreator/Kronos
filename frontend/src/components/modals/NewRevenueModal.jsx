import { useState, useEffect } from 'react'
import { Plus, Trash2, FolderKanban, FileText } from 'lucide-react'
import { toast } from 'react-hot-toast'
import PortalModal from '../ui/PortalModal'
import { formatCurrency } from '../../utils/format'
import { createRevenue } from '../../services/financial.service'
import { getProjects } from '../../services/projects.service'

const REVENUE_MODES = [
  { key: 'new',     label: 'Nova Receita',    icon: FileText,     desc: 'Receita avulsa' },
  { key: 'project', label: 'Vincular Projeto', icon: FolderKanban, desc: 'Receita de projeto' },
]

const EMPTY_INSTALLMENT = { amount: '', due_date: '' }

const EMPTY_FORM = {
  title: '', client: '', description: '', project_id: '',
  installments_list: [{ ...EMPTY_INSTALLMENT }]
}

export default function NewRevenueModal({ open, onClose, onSuccess }) {
  const [projects,    setProjects]    = useState([])
  const [revenueMode, setRevenueMode] = useState('new')
  const [form,        setForm]        = useState(EMPTY_FORM)

  useEffect(() => {
    if (open) {
      getProjects({ limit: 200 }).then(r => {
        const sortedProjects = [...(r.data.data || [])].sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'))
        setProjects(sortedProjects)
      })
    }
  }, [open])

  useEffect(() => {
    if (open) {
      setForm({ title: '', client: '', description: '', project_id: '', installments_list: [{ ...EMPTY_INSTALLMENT }] })
      setRevenueMode('new')
    }
  }, [open])

  const handleProjectSelect = (projectId) => {
    const proj = projects.find(p => p.id === projectId)
    setForm(f => ({
      ...f,
      project_id: projectId,
      title:  proj ? proj.title : f.title,
      client: proj ? (proj.client || f.client) : f.client,
    }))
  }

  const addInstallment = () => {
    setForm(f => ({ ...f, installments_list: [...f.installments_list, { ...EMPTY_INSTALLMENT }] }))
  }

  const removeInstallment = (index) => {
    if (form.installments_list.length === 1) return toast.error('É necessário ao menos uma parcela')
    setForm(f => ({ ...f, installments_list: f.installments_list.filter((_, i) => i !== index) }))
  }

  const updateInstallmentField = (index, field, value) => {
    setForm(f => ({
      ...f,
      installments_list: f.installments_list.map((inst, i) =>
        i === index ? { ...inst, [field]: value } : inst
      )
    }))
  }

  const totalAmount = form.installments_list.reduce((s, inst) => s + (parseFloat(inst.amount) || 0), 0)

  const handleCreate = async (e) => {
    e.preventDefault()
    if (revenueMode === 'project' && !form.project_id) return toast.error('Selecione um projeto')
    if (!form.title.trim()) return toast.error('Informe o título')

    const invalid = form.installments_list.some(inst => !inst.amount || !inst.due_date)
    if (invalid) return toast.error('Preencha valor e data de todas as parcelas')

    try {
      await createRevenue({
        title:             form.title,
        client:            form.client,
        project_id:        form.project_id || null,
        description:       form.description,
        total_amount:      totalAmount,
        installments_list: form.installments_list.map(inst => ({
          amount:   parseFloat(inst.amount),
          due_date: inst.due_date
        }))
      })
      toast.success('Receita criada!')
      onSuccess()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erro ao criar receita')
    }
  }

  return (
    <PortalModal open={open} onClose={onClose} title="Nova Receita" size="lg">
      <form onSubmit={handleCreate} className="space-y-5">
        <div>
          <label className="label">Tipo de receita</label>
          <div className="grid grid-cols-2 gap-3 mt-1">
            {REVENUE_MODES.map(mode => {
              const Icon = mode.icon
              return (
                <button key={mode.key} type="button"
                  onClick={() => { setRevenueMode(mode.key); setForm(f => ({ ...f, project_id: '', title: '' })) }}
                  className="flex flex-col items-start gap-1.5 p-4 rounded-2xl text-left transition-all duration-150"
                  style={revenueMode === mode.key
                    ? { background: 'rgba(107,114,128,0.15)', border: '1px solid rgba(107,114,128,0.35)', color: '#374151' }
                    : { background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.08)', color: 'var(--text-secondary)' }
                  }>
                  <div className="flex items-center gap-2">
                    <Icon size={15} />
                    <span className="text-sm font-bold">{mode.label}</span>
                  </div>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{mode.desc}</p>
                </button>
              )
            })}
          </div>
        </div>

        {revenueMode === 'project' && (
          <div>
            <label className="label">Projeto *</label>
            <select className="input" value={form.project_id}
              onChange={e => handleProjectSelect(e.target.value)} required>
              <option value="">Selecione um projeto...</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.title}{p.client ? ` — ${p.client}` : ''}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="label">Título *</label>
          <input className="input" required placeholder="Nome da receita"
            value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
        </div>

        {revenueMode === 'new' && (
          <div>
            <label className="label">Cliente</label>
            <input className="input" placeholder="Nome do cliente"
              value={form.client} onChange={e => setForm({ ...form, client: e.target.value })} />
          </div>
        )}

        <div>
          <label className="label">Parcelas</label>
          <div className="space-y-2.5">
            {form.installments_list.map((inst, index) => (
              <div key={index}
                className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end p-3 rounded-xl"
                style={{ background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.06)' }}>
                <div>
                  <label className="label text-[10px] mb-1">
                    Parcela {index + 1} — Valor *
                  </label>
                  <input type="number" step="0.01" min="0" className="input py-2 text-sm" required
                    placeholder="0,00"
                    value={inst.amount}
                    onChange={e => updateInstallmentField(index, 'amount', e.target.value)} />
                </div>
                <div>
                  <label className="label text-[10px] mb-1">Vencimento *</label>
                  <input type="date" className="input py-2 text-sm" required
                    value={inst.due_date}
                    onChange={e => updateInstallmentField(index, 'due_date', e.target.value)} />
                </div>
                <button type="button" onClick={() => removeInstallment(index)}
                  className="p-2 rounded-xl mb-0.5 transition-all duration-150"
                  style={{ color: '#FB7185' }}
                  onMouseEnter={ev => ev.currentTarget.style.background = 'rgba(251,113,133,0.10)'}
                  onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}>
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>

          <button type="button" onClick={addInstallment}
            className="mt-2 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150"
            style={{ border: '1px dashed rgba(107,114,128,0.30)', color: '#374151' }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(107,114,128,0.08)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <Plus size={13} /> Adicionar parcela
          </button>

          {totalAmount > 0 && (
            <div className="mt-2 px-4 py-2.5 rounded-xl text-xs"
              style={{ background: 'rgba(107,114,128,0.08)', border: '1px solid rgba(107,114,128,0.18)', color: '#374151' }}>
              Total: <strong>{formatCurrency(totalAmount)}</strong>
              {form.installments_list.length > 1 && ` em ${form.installments_list.length} parcelas`}
            </div>
          )}
        </div>

        <div>
          <label className="label">Descrição</label>
          <textarea className="input resize-none" rows={2}
            value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
        </div>

        <div className="flex justify-end gap-3 pt-2" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
          <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
          <button type="submit" className="btn-primary">Criar Receita</button>
        </div>
      </form>
    </PortalModal>
  )
}