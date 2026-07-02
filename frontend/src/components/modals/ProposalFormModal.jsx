import { useState, useEffect } from 'react'
import { Plus, Trash2, GripVertical } from 'lucide-react'
import PortalModal from '../ui/PortalModal'
import { createProposal, updateProposal } from '../../services/proposals.service'
import { toast } from 'react-hot-toast'
import api from '../../services/api'

// ── Editor Rich Text minimalista (sem dependência externa) ──────
function RichTextArea({ value, onChange, placeholder }) {
  return (
    <textarea
      className="input resize-none"
      rows={5}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ lineHeight: 1.6 }}
    />
  )
}

// ── Lista dinâmica de escopo ────────────────────────────────────
function ScopeList({ items, onChange, disabled }) {
  const add    = () => onChange([...items, { description: '' }])
  const remove = (i) => onChange(items.filter((_, idx) => idx !== i))
  const edit   = (i, val) => {
    const next = [...items]
    next[i] = { ...next[i], description: val }
    onChange(next)
  }

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          <GripVertical size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <input
            className="input"
            style={{ minHeight: 38, padding: '8px 12px' }}
            value={item.description}
            onChange={e => edit(i, e.target.value)}
            placeholder={`Item ${i + 1}`}
            disabled={disabled}
          />
          {!disabled && (
            <button
              type="button"
              onClick={() => remove(i)}
              className="p-1.5 rounded-lg shrink-0 transition-all"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#FB7185'; e.currentTarget.style.background = 'rgba(251,113,133,0.10)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent' }}
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      ))}
      {!disabled && (
        <button
          type="button"
          onClick={add}
          className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl w-full transition-all"
          style={{ color: 'var(--text-muted)', border: '1px dashed rgba(0,0,0,0.10)' }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'rgba(0,0,0,0.20)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'rgba(0,0,0,0.10)' }}
        >
          <Plus size={13} /> Adicionar item
        </button>
      )}
    </div>
  )
}

// ── Tabela dinâmica de serviços ─────────────────────────────────
function ServicesTable({ items, onChange, disabled }) {
  const add    = () => onChange([...items, { description: '', amount: '', deadline_days: '' }])
  const remove = (i) => onChange(items.filter((_, idx) => idx !== i))
  const edit   = (i, field, val) => {
    const next = [...items]
    next[i] = { ...next[i], [field]: val }
    onChange(next)
  }

  const total = items.reduce((s, it) => s + (parseFloat(it.amount) || 0), 0)

  return (
    <div>
      <div className="grid gap-2 mb-2" style={{ gridTemplateColumns: '1fr 130px 100px 36px' }}>
        {['Serviço', 'Valor (R$)', 'Prazo (dias)', ''].map(h => (
          <span key={h} className="label" style={{ marginBottom: 0 }}>{h}</span>
        ))}
      </div>

      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="grid gap-2 items-center" style={{ gridTemplateColumns: '1fr 130px 100px 36px' }}>
            <input
              className="input"
              style={{ minHeight: 38, padding: '8px 12px' }}
              value={item.description}
              onChange={e => edit(i, 'description', e.target.value)}
              placeholder="Etapas do serviço"
              disabled={disabled}
            />
            <input
              className="input"
              style={{ minHeight: 38, padding: '8px 12px' }}
              type="number"
              min="0"
              step="0.01"
              value={item.amount}
              onChange={e => edit(i, 'amount', e.target.value)}
              placeholder="0,00"
              disabled={disabled}
            />
            <input
              className="input"
              style={{ minHeight: 38, padding: '8px 12px' }}
              type="number"
              min="0"
              value={item.deadline_days}
              onChange={e => edit(i, 'deadline_days', e.target.value)}
              placeholder="0"
              disabled={disabled}
            />
            {!disabled ? (
              <button
                type="button"
                onClick={() => remove(i)}
                className="p-1.5 rounded-lg transition-all flex items-center justify-center"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#FB7185'; e.currentTarget.style.background = 'rgba(251,113,133,0.10)' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent' }}
              >
                <Trash2 size={14} />
              </button>
            ) : <div />}
          </div>
        ))}
      </div>

      {!disabled && (
        <button
          type="button"
          onClick={add}
          className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl w-full mt-2 transition-all"
          style={{ color: 'var(--text-muted)', border: '1px dashed rgba(0,0,0,0.10)' }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'rgba(0,0,0,0.20)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'rgba(0,0,0,0.10)' }}
        >
          <Plus size={13} /> Adicionar serviço
        </button>
      )}

      {items.length > 0 && (
        <div className="flex justify-end mt-3 pt-3" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
          <span className="text-sm font-bold" style={{ color: '#34D399' }}>
            Total: R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>
      )}
    </div>
  )
}

// ── Tabela dinâmica de condições de pagamento ───────────────────
function PaymentTermsTable({ items, onChange, disabled }) {
  const add    = () => onChange([...items, { description: '', amount: '' }])
  const remove = (i) => onChange(items.filter((_, idx) => idx !== i))
  const edit   = (i, field, val) => {
    const next = [...items]
    next[i] = { ...next[i], [field]: val }
    onChange(next)
  }

  const total = items.reduce((s, it) => s + (parseFloat(it.amount) || 0), 0)

  return (
    <div>
      <div className="grid gap-2 mb-2" style={{ gridTemplateColumns: '1fr 150px 36px' }}>
        {['Descrição', 'Valor (R$)', ''].map(h => (
          <span key={h} className="label" style={{ marginBottom: 0 }}>{h}</span>
        ))}
      </div>

      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="grid gap-2 items-center" style={{ gridTemplateColumns: '1fr 150px 36px' }}>
            <input
              className="input"
              style={{ minHeight: 38, padding: '8px 12px' }}
              value={item.description}
              onChange={e => edit(i, 'description', e.target.value)}
              placeholder="Ex: 50% na assinatura"
              disabled={disabled}
            />
            <input
              className="input"
              style={{ minHeight: 38, padding: '8px 12px' }}
              type="number"
              min="0"
              step="0.01"
              value={item.amount}
              onChange={e => edit(i, 'amount', e.target.value)}
              placeholder="0,00"
              disabled={disabled}
            />
            {!disabled ? (
              <button
                type="button"
                onClick={() => remove(i)}
                className="p-1.5 rounded-lg transition-all flex items-center justify-center"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#FB7185'; e.currentTarget.style.background = 'rgba(251,113,133,0.10)' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent' }}
              >
                <Trash2 size={14} />
              </button>
            ) : <div />}
          </div>
        ))}
      </div>

      {!disabled && (
        <button
          type="button"
          onClick={add}
          className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl w-full mt-2 transition-all"
          style={{ color: 'var(--text-muted)', border: '1px dashed rgba(0,0,0,0.10)' }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'rgba(0,0,0,0.20)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'rgba(0,0,0,0.10)' }}
        >
          <Plus size={13} /> Adicionar condição
        </button>
      )}

      {items.length > 0 && (
        <div className="flex justify-end mt-3 pt-3" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
          <span className="text-sm font-bold" style={{ color: '#34D399' }}>
            Total: R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>
      )}
    </div>
  )
}

// ── Seção com título ────────────────────────────────────────────
function Section({ title, children }) {
  return (
    <div>
      <p className="label mb-3" style={{ fontSize: 11, color: 'var(--text-secondary)', letterSpacing: '0.12em' }}>
        {title}
      </p>
      {children}
    </div>
  )
}

// ── MODAL PRINCIPAL ─────────────────────────────────────────────
const EMPTY_FORM = {
  title:            '',
  client_id:        '',
  client_name:      '',
  service_object:   '',
  scope_items:      [],
  services:         [],
  payment_terms:    [],
  payment_message:  '',
  final_notes:      '',
  service_deadline: '',
  valid_until:      '',
}

export default function ProposalFormModal({ open, onClose, onSuccess, proposal }) {
  const [form,   setForm]   = useState(EMPTY_FORM)
  const [clients, setClients] = useState([])
  const [saving,  setSaving]  = useState(false)

  const isEdit = !!proposal

  useEffect(() => {
    if (!open) return
    api.get('/clients?limit=200').then(({ data }) => {
      setClients(data.data || data.clients || [])
    }).catch(() => setClients([]))
  }, [open])

  useEffect(() => {
    if (open && proposal) {
      setForm({
        title:            proposal.title            || '',
        client_id:        proposal.client_id        || '',
        client_name:      proposal.client_name      || '',
        service_object:   proposal.service_object   || '',
        scope_items:      proposal.scope_items      || [],
        services:         proposal.services         || [],
        payment_terms:    proposal.payment_terms    || [],
        payment_message:  proposal.payment_message  || '',
        final_notes:      proposal.final_notes      || '',
        service_deadline: proposal.service_deadline || '',
        valid_until:      proposal.valid_until ? proposal.valid_until.slice(0, 10) : '',
      })
    } else if (open && !proposal) {
      setForm(EMPTY_FORM)
    }
  }, [open, proposal])

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }))

  const handleSubmit = async () => {
    if (!form.title.trim())          return toast.error('Título é obrigatório')
    if (!form.service_object.trim()) return toast.error('Objeto do serviço é obrigatório')

    setSaving(true)
    try {
      const payload = {
        ...form,
        client_id:   form.client_id   || null,
        client_name: form.client_name || null,
      }
      if (isEdit) {
        await updateProposal(proposal.id, payload)
        toast.success('Proposta atualizada!')
      } else {
        await createProposal(payload)
        toast.success('Proposta criada!')
      }
      onSuccess()
      onClose()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Erro ao salvar proposta')
    } finally {
      setSaving(false)
    }
  }

  return (
    <PortalModal
      open={open}
      onClose={onClose}
      title={isEdit ? `Editar Proposta — ${proposal?.proposal_number}` : 'Nova Proposta'}
      size="xl"
    >
      {/* ── Container do modal ── */}
      <div
        style={{
        display:        'flex',
        flexDirection:  'column',
        maxHeight:      '75vh',
        
      }}
      >
      {/* ── Conteúdo scrollável ── */}
      <div
      className="space-y-6"
      style={{
        overflowY:      'auto',
        flex:           1,
        paddingRight:   '8px',
        paddingLeft:    '16px',
      }}  

      >
        {/* Campo 1: Título */}
        <div>
          <label
          className="block mb-1 text-sm font-semibold"
          style={{ color: "var(--text-primary)" }}>Título <span style={{ color: '#FB7185' }}>*</span></label>
          <input
            className="input"
            placeholder="Ex: Proposta de Projeto Arquitetônico — Residência Silva"
            value={form.title}
            onChange={e => set('title', e.target.value)}
          />
        </div>

        {/* Campo 2: Cliente */}
        <div>
          <label
            className="block mb-1 text-sm font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            Cliente
          </label>
          {clients.length > 0 ? (
            <select
              className="input"
              value={form.client_id}
              onChange={e => {
                const id = e.target.value
                const client = clients.find(c => String(c.id) === id)
                set('client_id', id)
                set('client_name', client?.name || '')
              }}
            >
              <option value="">Selecionar cliente...</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          ) : (
            <input
              className="input"
              placeholder="Nome do cliente"
              value={form.client_name}
              onChange={e => set('client_name', e.target.value)}
            />
          )}
          {clients.length > 0 && !form.client_id && (
            <div className="mt-2">
              <label className="label" style={{ fontSize: 10 }}>Ou digitar nome manualmente:</label>
              <input
                className="input"
                style={{ minHeight: 38, padding: '8px 12px' }}
                placeholder="Nome do cliente (sem cadastro)"
                value={form.client_name}
                onChange={e => set('client_name', e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Campo 3: Objeto do Serviço */}
        <div>
          <label
            className="block mb-1 text-sm font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            Objeto do Serviço <span style={{ color: '#FB7185' }}>*</span>
          </label>
          <input
            className="input"
            placeholder="Ex: Elaboração de projeto arquitetônico de residência unifamiliar"
            value={form.service_object}
            onChange={e => set('service_object', e.target.value)}
          />
        </div>

        {/* Campo 4: Escopo */}
        <Section title="▸ Etapas dos Serviços">
          <ScopeList
            items={form.scope_items}
            onChange={val => set('scope_items', val)}
          />
        </Section>

        {/* Campo 5: Cálculo Técnico */}
        <Section title="▸ Cálculo Técnico dos Serviços">
          <ServicesTable
            items={form.services}
            onChange={val => set('services', val)}
          />
        </Section>

        {/* Campo 6: Condições de Pagamento */}
        <Section title="▸ Condições de Pagamento">
          <PaymentTermsTable
            items={form.payment_terms}
            onChange={val => set('payment_terms', val)}
          />
          <div className="mt-4">
            <label className="label" style={{ fontSize: 10 }}>Mensagem padrão de pagamento</label>
            <textarea
              className="input resize-none"
              rows={3}
              value={form.payment_message}
              onChange={e => set('payment_message', e.target.value)}
              placeholder="Ex: A proposta poderá ser reajustada caso ocorram alterações de escopo ou condições previamente acordadas."
              style={{ lineHeight: 1.6 }}
            />
          </div>
        </Section>

        {/* Campo 7: Considerações Finais */}
        <div>
          <label
            className="block mb-1 text-sm font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            Considerações Finais
          </label>
          <RichTextArea
            value={form.final_notes}
            onChange={val => set('final_notes', val)}
            placeholder="Informações adicionais, observações técnicas, condições gerais..."
          />
        </div>

        {/* Campos 8 + 9: Prazo e Validade */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              className="block mb-1 text-sm font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              Prazo dos Serviços
            </label>
            <input
              className="input"
              placeholder="Ex: 30 dias corridos"
              value={form.service_deadline}
              onChange={e => set('service_deadline', e.target.value)}
            />
          </div>
          <div>
            <label
              className="block mb-1 text-sm font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              Validade da Proposta
            </label>
            <input
              className="input"
              type="date"
              value={form.valid_until}
              onChange={e => set('valid_until', e.target.value)}
            />
          </div>
        </div>  
        </div>
      </div>

      {/* ── Footer fixo — sempre visível ── */}
      <div
        className="flex justify-end gap-3 pt-4 mt-2"
        style={{
          borderTop:       '1px solid rgba(0,0,0,0.05)',
          position:        'sticky',
          bottom:          0,
          background:      'glassmorphism',
          marginLeft:      '-24px',
          marginRight:     '-24px',
          paddingLeft:     '24px',
          paddingRight:    '24px',
          paddingBottom:   '20px',
          zIndex:          10,
        }}
      >
        <button type="button" onClick={onClose} className="btn-secondary">
          Cancelar
        </button>
        <button type="button" onClick={handleSubmit} disabled={saving} className="btn-primary">
          {saving ? 'Salvando...' : isEdit ? 'Salvar Alterações' : 'Criar Proposta'}
        </button>
      </div>
    </PortalModal>
  )
}