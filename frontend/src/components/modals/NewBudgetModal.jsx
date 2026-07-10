import { useState, useEffect } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import PortalModal from '../ui/PortalModal'
import { createBudget, updateBudget } from '../../services/budgets.service'
import { useBudgetConfig } from '../../hooks/useBudgetConfig'
import { useBudgetCalculation } from '../../hooks/useBudgetCalculation'
import { toast } from 'react-hot-toast'
import api from '../../services/api'

// ── Seção com título (mesmo padrão do ProposalFormModal) ────────
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

// ── Linha dinâmica de item do orçamento ───────────────────────────
// Título de precificação -> Nível -> Rótulo customizável -> Área específica
function BudgetItemRow({ item, index, titles, lineTotal, onChange, onRemove }) {
  const selectedTitle = titles.find(t => t.id === item.budgetTitleId)
  const levels = selectedTitle?.levels || []

  const handleTitleChange = (budgetTitleId) => {
    onChange(index, { ...item, budgetTitleId, budgetLevelId: '', customLabel: '' })
  }

  const handleLevelChange = (budgetLevelId) => {
    const level = levels.find(l => l.id === budgetLevelId)
    onChange(index, {
      ...item,
      budgetLevelId,
      // Preenche o rótulo com o nível escolhido, mas o usuário pode
      // editar livremente depois (customização por orçamento).
      customLabel: item.customLabel || level?.label || '',
    })
  }

  return (
    <div
      className="p-4 rounded-2xl mb-3"
      style={{ border: '1px solid rgba(0,0,0,0.08)', background: 'rgba(0,0,0,0.015)' }}
    >
      <div className="grid gap-3 mb-3" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div>
          <label className="label" style={{ fontSize: 10 }}>Título</label>
          <select
            className="input"
            value={item.budgetTitleId || ''}
            onChange={e => handleTitleChange(e.target.value)}
          >
            <option value="">Selecionar título...</option>
            {titles.map(t => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" style={{ fontSize: 10 }}>Nível</label>
          <select
            className="input"
            value={item.budgetLevelId || ''}
            onChange={e => handleLevelChange(e.target.value)}
            disabled={!item.budgetTitleId}
          >
            <option value="">Selecionar nível...</option>
            {levels.map(l => (
              <option key={l.id} value={l.id}>{l.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-3 items-end" style={{ gridTemplateColumns: '1fr 140px 140px 36px' }}>
        <div>
          <label className="label" style={{ fontSize: 10 }}>Rótulo customizado</label>
          <input
            className="input"
            style={{ minHeight: 38, padding: '8px 12px' }}
            value={item.customLabel}
            onChange={e => onChange(index, { ...item, customLabel: e.target.value })}
            placeholder="Ex: Projeto Estrutural — Padrão Alto"
          />
        </div>
        <div>
          <label className="label" style={{ fontSize: 10 }}>Área específica (opcional)</label>
          <input
            className="input"
            style={{ minHeight: 38, padding: '8px 12px' }}
            type="number"
            min="0"
            step="0.01"
            value={item.areaUsed}
            onChange={e => onChange(index, { ...item, areaUsed: e.target.value })}
            placeholder="Usa área do projeto"
          />
        </div>
        <div>
          <label className="label" style={{ fontSize: 10 }}>Total da linha</label>
          <div
            className="text-sm font-bold flex items-center"
            style={{ minHeight: 38, color: '#34D399' }}
          >
            {lineTotal !== undefined
              ? `R$ ${Number(lineTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
              : '—'}
          </div>
        </div>
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="p-1.5 rounded-lg transition-all flex items-center justify-center"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={e => { e.currentTarget.style.color = '#FB7185'; e.currentTarget.style.background = 'rgba(251,113,133,0.10)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent' }}
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}

const EMPTY_FORM = {
  title:            '',
  client_id:        '',
  client_name:      '',
  project_area:     '',
  fixed_fees_total: '',
  final_notes:      '',
  items:            [],
}

export default function NewBudgetModal({ open, onClose, onSuccess, budget }) {
  const [form,    setForm]    = useState(EMPTY_FORM)
  const [clients, setClients] = useState([])
  const [saving,  setSaving]  = useState(false)

  const isEdit = !!budget
  const { titles } = useBudgetConfig()

  const { items: previewItems, total, calculating } = useBudgetCalculation({
    items: form.items,
    projectArea: form.project_area,
    fixedFeesTotal: form.fixed_fees_total,
  })

  useEffect(() => {
    if (!open) return
    api.get('/clients?limit=200').then(({ data }) => {
      setClients(data.data || data.clients || [])
    }).catch(() => setClients([]))
  }, [open])

  useEffect(() => {
    if (open && budget) {
      setForm({
        title:            budget.title            || '',
        client_id:        budget.client_id        || '',
        client_name:       budget.client_name       || '',
        project_area:     budget.project_area      || '',
        fixed_fees_total: budget.fixed_fees_total  || '',
        final_notes:      budget.final_notes       || '',
        items: (budget.items || []).map(it => ({
          budgetTitleId: it.budget_title_id || '',
          budgetLevelId: it.budget_level_id || '',
          customLabel:   it.custom_label || '',
          areaUsed:      it.area_used || '',
        })),
      })
    } else if (open && !budget) {
      setForm(EMPTY_FORM)
    }
  }, [open, budget])

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }))

  const addItem = () => {
    setForm(f => ({
      ...f,
      items: [...f.items, { budgetTitleId: '', budgetLevelId: '', customLabel: '', areaUsed: '' }],
    }))
  }

  const updateItem = (index, next) => {
    setForm(f => {
      const items = [...f.items]
      items[index] = next
      return { ...f, items }
    })
  }

  const removeItem = (index) => {
    setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== index) }))
  }

  const handleSubmit = async () => {
    if (!form.title.trim()) return toast.error('Título é obrigatório')
    if (form.items.length === 0) return toast.error('Adicione pelo menos um item ao orçamento')
    if (form.items.some(it => !it.budgetLevelId)) {
      return toast.error('Todos os itens precisam de um nível selecionado')
    }

    setSaving(true)
    try {
      const payload = {
        title:            form.title.trim(),
        client_id:        form.client_id || null,
        client_name:      form.client_name || null,
        project_area:     Number(form.project_area) || 0,
        fixed_fees_total: Number(form.fixed_fees_total) || 0,
        final_notes:      form.final_notes || null,
        items: form.items.map(it => ({
          customLabel:   it.customLabel,
          budgetLevelId: it.budgetLevelId,
          areaUsed:      it.areaUsed ? Number(it.areaUsed) : null,
        })),
      }

      if (isEdit) {
        await updateBudget(budget.id, payload)
        toast.success('Orçamento atualizado!')
      } else {
        await createBudget(payload)
        toast.success('Orçamento criado!')
      }
      onSuccess()
      onClose()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Erro ao salvar orçamento')
    } finally {
      setSaving(false)
    }
  }

  return (
    <PortalModal
      open={open}
      onClose={onClose}
      title={isEdit ? `Editar Orçamento — ${budget?.budget_number}` : 'Novo Orçamento'}
      size="xl"
    >
      <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '75vh' }}>
        <div className="space-y-6" style={{ overflowY: 'auto', flex: 1, paddingRight: 8, paddingLeft: 16 }}>

          {/* Título */}
          <div>
            <label className="block mb-1 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Título <span style={{ color: '#FB7185' }}>*</span>
            </label>
            <input
              className="input"
              placeholder="Ex: Orçamento — Residência Silva"
              value={form.title}
              onChange={e => set('title', e.target.value)}
            />
          </div>

          {/* Cliente */}
          <div>
            <label className="block mb-1 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
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
          </div>

          {/* Área do projeto + Taxas fixas */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block mb-1 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Área do Projeto (m²)
              </label>
              <input
                className="input"
                type="number"
                min="0"
                step="0.01"
                placeholder="0,00"
                value={form.project_area}
                onChange={e => set('project_area', e.target.value)}
              />
            </div>
            <div>
              <label className="block mb-1 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Taxas Fixas Adicionais (R$)
              </label>
              <input
                className="input"
                type="number"
                min="0"
                step="0.01"
                placeholder="0,00"
                value={form.fixed_fees_total}
                onChange={e => set('fixed_fees_total', e.target.value)}
              />
            </div>
          </div>

          {/* Itens do orçamento */}
          <Section title="▸ Itens do Orçamento">
            {form.items.map((item, i) => (
              <BudgetItemRow
                key={i}
                item={item}
                index={i}
                titles={titles}
                lineTotal={previewItems[i]?.lineTotal}
                onChange={updateItem}
                onRemove={removeItem}
              />
            ))}
            <button
              type="button"
              onClick={addItem}
              className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl w-full transition-all"
              style={{ color: 'var(--text-muted)', border: '1px dashed var(--border-medium)' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--text-muted)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border-medium)' }}
            >
              <Plus size={13} /> Adicionar item
            </button>

            <div className="flex justify-end mt-3 pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <span className="text-sm font-bold" style={{ color: '#34D399' }}>
                {calculating ? 'Calculando...' : `Total: R$ ${Number(total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
              </span>
            </div>
          </Section>

          {/* Considerações finais */}
          <div>
            <label className="block mb-1 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Considerações Finais
            </label>
            <textarea
              className="input resize-none"
              rows={4}
              value={form.final_notes}
              onChange={e => set('final_notes', e.target.value)}
              placeholder="Observações técnicas, condições gerais..."
              style={{ lineHeight: 1.6 }}
            />
          </div>
        </div>

        <div
          className="flex justify-end gap-3 pt-4 mt-2"
          style={{
            borderTop: '1px solid rgba(0,0,0,0.05)', position: 'sticky', bottom: 0,
            background: 'glassmorphism', marginLeft: -24, marginRight: -24,
            paddingLeft: 24, paddingRight: 24, paddingBottom: 20, zIndex: 10,
          }}
        >
          <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
          <button type="button" onClick={handleSubmit} disabled={saving} className="btn-primary">
            {saving ? 'Salvando...' : isEdit ? 'Salvar Alterações' : 'Criar Orçamento'}
          </button>
        </div>
      </div>
    </PortalModal>
  )
}