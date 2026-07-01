import { useState, useEffect } from 'react'
import { toast }               from 'react-hot-toast'
import { AlertTriangle }       from 'lucide-react'
import PortalModal from '../ui/PortalModal'
import { createProject, uploadCover, getProjects } from '../../services/projects.service'
import { addDays, format, startOfMonth, endOfMonth } from 'date-fns'

const BLOCKING_STATUSES = ['in_progress', 'paused']
const BLOCK_THRESHOLD   = 5
const BLOCK_DAYS        = 45

function getBlockedUntil(projects) {
  const now        = new Date()
  const monthStart = startOfMonth(now)
  const monthEnd   = endOfMonth(now)

  const activeThisMonth = projects.filter(p => {
    if (!BLOCKING_STATUSES.includes(p.status)) return false
    const created = new Date(p.created_at || p.start_date || now)
    return created >= monthStart && created <= monthEnd
  })

  return activeThisMonth.length >= BLOCK_THRESHOLD
    ? addDays(now, BLOCK_DAYS)
    : null
}

export default function NewProjectModal({ open, onClose, onSuccess }) {
  const [form, setForm] = useState({
    title: '', client: '', description: '',
    budget: '', start_date: '', expected_date: ''
  })
  const [cover,        setCover]        = useState(null)
  const [loading,      setLoading]      = useState(false)
  const [blockedUntil, setBlockedUntil] = useState(null)
  const [activeCount,  setActiveCount]  = useState(0)

  useEffect(() => {
    if (!open) return
    getProjects({ limit: 200 }).then(({ data }) => {
      const all   = data.data || []
      const until = getBlockedUntil(all)
      const count = all.filter(p => BLOCKING_STATUSES.includes(p.status)).length
      setBlockedUntil(until)
      setActiveCount(count)
    })
  }, [open])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const minStartDate = blockedUntil
    ? format(blockedUntil, 'yyyy-MM-dd')
    : format(new Date(), 'yyyy-MM-dd')

  const handleStartDateChange = (val) => {
    if (blockedUntil && val < format(blockedUntil, 'yyyy-MM-dd')) {
      toast.error(`Data bloqueada. Inicie após ${format(blockedUntil, 'dd/MM/yyyy')}.`)
      return
    }
    set('start_date', val)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (blockedUntil && form.start_date && form.start_date < format(blockedUntil, 'yyyy-MM-dd')) {
      toast.error(`Não é possível iniciar antes de ${format(blockedUntil, 'dd/MM/yyyy')}.`)
      return
    }
    setLoading(true)
    try {
      const { data } = await createProject({ ...form, budget: parseFloat(form.budget) || 0 })
      if (cover) await uploadCover(data.project.id, cover)
      toast.success('Projeto criado! As 5 etapas padrão foram adicionadas automaticamente.')
      setForm({ title:'', client:'', description:'', budget:'', start_date:'', expected_date:'' })
      setCover(null)
      onSuccess()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erro ao criar projeto')
    } finally { setLoading(false) }
  }

  return (
    <PortalModal open={open} onClose={onClose} title="Novo Projeto" size="lg">
      <form onSubmit={handleSubmit} className="space-y-5">

        {blockedUntil && (
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl"
            style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.20)' }}>
            <AlertTriangle size={16} style={{ color: '#FBBF24', marginTop: 1 }} />
            <div>
              <p className="text-xs font-bold mb-0.5" style={{ color: '#FBBF24' }}>
                Capacidade limitada este mês
              </p>
              <p className="text-xs" style={{ color: 'rgba(251,191,36,0.75)' }}>
                {activeCount} projetos ativos. Datas disponíveis a partir de{' '}
                <strong>{format(blockedUntil, 'dd/MM/yyyy')}</strong>.
              </p>
            </div>
          </div>
        )}

        <div>
          <label
          className="block mb-1 text-sm font-semibold"
          style={{ color: "var(--text-primary)" }}>Título *</label>
          <input className="input" placeholder="Nome do projeto" required
            value={form.title} onChange={e => set('title', e.target.value)} />
        </div>
        <div>
          <label
            className="block mb-1 text-sm font-semibold"
            style={{ color: "var(--text-primary)" }}>Cliente</label>
          <input className="input" placeholder="Nome do cliente"
            value={form.client} onChange={e => set('client', e.target.value)} />
        </div>
        <div>
          <label
            className="block mb-1 text-sm font-semibold"
            style={{ color: "var(--text-primary)" }}>Descrição</label>
          <textarea className="input resize-none" rows={3}
            placeholder="Descreva o objetivo do projeto"
            value={form.description} onChange={e => set('description', e.target.value)} />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label
              className="block mb-1 text-sm font-semibold"
              style={{ color: "var(--text-primary)" }}>Orçamento (R$)</label>
            <input type="number" min="0" className="input" placeholder="0,00"
              value={form.budget} onChange={e => set('budget', e.target.value)} />
          </div>
          <div>
            <label
              className="block mb-1 text-sm font-semibold"
              style={{ color: "var(--text-primary)" }}>
              Data de início
              {blockedUntil && (
                <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded"
                  style={{ background: 'rgba(251,191,36,0.12)', color: '#FBBF24' }}>
                  bloqueada
                </span>
              )}
            </label>
            <input type="date" className="input" min={minStartDate}
              value={form.start_date} onChange={e => handleStartDateChange(e.target.value)}
              style={blockedUntil ? { borderColor: 'rgba(251,191,36,0.30)' } : {}} />
          </div>
          <div>
            <label
              className="block mb-1 text-sm font-semibold"
              style={{ color: "var(--text-primary)" }}>
              Previsão de entrega
            </label>
            <input type="date" className="input"
              min={form.start_date || format(new Date(), 'yyyy-MM-dd')}
              value={form.expected_date} onChange={e => set('expected_date', e.target.value)} />
          </div>
        </div>

        <div>
          <label
            className="block mb-1 text-sm font-semibold"
            style={{ color: "var(--text-primary)" }}>
            Capa do projeto
          </label>
          <div className="relative rounded-2xl text-center py-5 px-4"
            style={{ background: 'rgba(0,0,0,0.02)', border: '1px dashed rgba(0,0,0,0.10)' }}>
            <input type="file" accept="image/*"
              className="absolute inset-0 opacity-0 cursor-pointer"
              onChange={e => setCover(e.target.files[0])} />
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {cover ? cover.name : 'Clique ou arraste uma imagem aqui'}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2"
          style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
          <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Criando...' : 'Criar Projeto'}
          </button>
        </div>
      </form>
    </PortalModal>
  )
}