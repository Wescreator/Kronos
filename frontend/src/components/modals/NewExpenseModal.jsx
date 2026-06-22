import { useState, useEffect, useCallback } from 'react'
import { toast } from 'react-hot-toast'
import { Tag, Repeat } from 'lucide-react'
import PortalModal from '../ui/PortalModal'
import { createExpense, updateExpense, getCategories, createCategory } from '../../services/financial.service'

// ── Seletor de categoria com criação inline ───────────────────────
function CategorySelect({ categories, value, onChange, onCategoryCreated }) {
  const [showCreate, setShowCreate] = useState(false)
  const [newName,    setNewName]    = useState('')
  const [newColor,   setNewColor]   = useState('#7C5CFC')
  const [saving,     setSaving]     = useState(false)

  const PRESET_COLORS = [
    '#7C5CFC','#34D399','#FB7185','#38BDF8',
    '#FBBF24','#F472B6','#A78BFA','#6EE7B7'
  ]

  const handleCreate = async () => {
    if (!newName.trim()) return toast.error('Informe o nome da categoria')
    setSaving(true)
    try {
      const { data } = await createCategory({ name: newName.trim(), color: newColor })
      toast.success(`Categoria "${newName}" criada!`)
      onCategoryCreated(data.category)
      onChange(data.category.id)
      setNewName(''); setNewColor('#7C5CFC'); setShowCreate(false)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erro ao criar categoria')
    } finally { setSaving(false) }
  }

  return (
    <div>
      <label className="label">Categoria</label>
      <div className="flex gap-2">
        <select
          className="input flex-1"
          value={value}
          onChange={e => onChange(e.target.value)}
        >
          <option value="">Sem categoria</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setShowCreate(!showCreate)}
          title="Criar nova categoria"
          className="px-3 rounded-xl transition-all duration-150 shrink-0"
          style={{
            background: showCreate ? 'rgba(107,114,128,0.15)' : 'rgba(0,0,0,0.03)',
            border:     `1px solid ${showCreate ? 'rgba(107,114,128,0.35)' : 'rgba(0,0,0,0.08)'}`,
            color:      showCreate ? '#374151' : 'var(--text-muted)'
          }}
        >
          <Tag size={14} />
        </button>
      </div>

      {showCreate && (
        <div
          className="mt-2 p-4 rounded-2xl"
          style={{
            background: 'rgba(107,114,128,0.06)',
            border:     '1px solid rgba(107,114,128,0.18)',
            animation:  'fadeInUp 0.15s ease'
          }}
        >
          <p className="text-xs font-bold mb-3" style={{ color: '#374151' }}>
            Nova categoria
          </p>
          <input
            className="input flex-1 text-sm mb-3"
            placeholder="Nome da categoria"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
          />
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Cor:</span>
            <div className="flex gap-1.5">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewColor(c)}
                  className="h-5 w-5 rounded-full transition-all duration-150"
                  style={{
                    background:    c,
                    outline:       newColor === c ? `2px solid ${c}` : 'none',
                    outlineOffset: 2,
                    transform:     newColor === c ? 'scale(1.2)' : 'scale(1)'
                  }}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary text-xs py-1.5 px-3">
              Cancelar
            </button>
            <button type="button" onClick={handleCreate} disabled={saving} className="btn-primary text-xs py-1.5 px-3">
              {saving ? 'Salvando...' : 'Criar categoria'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const EMPTY_FORM = {
  title:        '',
  amount:       '',
  due_date:     '',
  category_id:  '',
  description:  '',
  is_recurring: false,
}

/**
 * Modal de criação/edição de Despesa.
 * @param {object|null} expense — null = modo criação, objeto = modo edição
 */
export default function NewExpenseModal({ open, onClose, onSuccess, expense }) {
  const [form,       setForm]       = useState(EMPTY_FORM)
  const [categories, setCategories] = useState([])

  const isEdit = !!expense

  const loadCategories = useCallback(async () => {
    try {
      const { data } = await getCategories()
      const sorted = [...(data.categories || [])].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
      setCategories(sorted)
    } catch { /* silencioso */ }
  }, [])

  useEffect(() => {
    if (open) loadCategories()
  }, [open, loadCategories])

  useEffect(() => {
    if (open && expense) {
      setForm({
        title:        expense.title,
        amount:       expense.amount,
        due_date:     expense.due_date?.slice(0, 10) || '',
        category_id:  expense.category_id || '',
        description:  expense.description || '',
        is_recurring: expense.is_recurring || false,
      })
    } else if (open && !expense) {
      setForm(EMPTY_FORM)
    }
  }, [open, expense])

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (isEdit) {
        await updateExpense(expense.id, { ...form, amount: parseFloat(form.amount) })
        toast.success('Despesa atualizada!')
      } else {
        await createExpense({
          ...form,
          amount:       parseFloat(form.amount),
          is_recurring: form.is_recurring,
        })
        toast.success(form.is_recurring ? 'Despesa recorrente criada para os próximos 24 meses!' : 'Despesa criada!')
        setForm(EMPTY_FORM)
      }
      onSuccess()
    } catch (err) {
      if (isEdit) {
        toast.error(err.response?.data?.message || 'Erro ao editar despesa')
      } else {
        toast.error(err.response?.data?.message || 'Erro ao criar despesa')
      }
    }
  }

  return (
    <PortalModal open={open} onClose={onClose} title={isEdit ? 'Editar Despesa' : 'Nova Despesa'} size="md">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="label">Título *</label>
          <input
            className="input"
            required
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Valor *</label>
            <input
              type="number" step="0.01" min="0"
              className="input" required
              value={form.amount}
              onChange={e => setForm({ ...form, amount: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Vencimento *</label>
            <input
              type="date" className="input" required
              value={form.due_date}
              onChange={e => setForm({ ...form, due_date: e.target.value })}
            />
          </div>
        </div>

        <CategorySelect
          categories={categories}
          value={form.category_id}
          onChange={(id) => setForm({ ...form, category_id: id })}
          onCategoryCreated={(cat) => {
            setCategories(prev => [...prev, cat].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')))
            loadCategories()
          }}
        />

        <div>
          <label className="label">Descrição</label>
          <textarea
            className="input resize-none" rows={2}
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
          />
        </div>

        {/* ── Despesa recorrente — só aparece ao criar ── */}
        {!isEdit && (
          <div
            className="rounded-2xl p-4"
            style={{
              background: form.is_recurring ? 'rgba(107,114,128,0.08)' : 'rgba(0,0,0,0.02)',
              border:     `1px solid ${form.is_recurring ? 'rgba(107,114,128,0.28)' : 'rgba(0,0,0,0.06)'}`,
              transition: 'background 0.2s, border-color 0.2s',
            }}
          >
            <label
              className="flex items-start gap-3 cursor-pointer select-none"
              style={{ color: 'var(--text-secondary)' }}
            >
              <input
                type="checkbox"
                checked={form.is_recurring}
                onChange={e => setForm({ ...form, is_recurring: e.target.checked })}
                style={{ marginTop: 2, accentColor: '#374151', width: 15, height: 15, cursor: 'pointer', flexShrink: 0 }}
              />
              <div>
                <span className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: form.is_recurring ? '#374151' : 'var(--text-secondary)' }}>
                  <Repeat size={14} />
                  Despesa recorrente
                </span>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  Gera automaticamente uma ocorrência pendente por mês pelos próximos 24 meses. Cada mês tem status independente.
                </p>
              </div>
            </label>
          </div>
        )}

        {/* ── Indicador no modo edição (somente leitura) ── */}
        {isEdit && expense.is_recurring && (
          <div
            className="flex items-center gap-2 rounded-xl px-4 py-3"
            style={{
              background: 'rgba(107,114,128,0.08)',
              border:     '1px solid rgba(107,114,128,0.22)',
            }}
          >
            <Repeat size={14} style={{ color: '#374151', flexShrink: 0 }} />
            <p className="text-xs" style={{ color: '#374151' }}>
              Esta é uma despesa recorrente. As outras ocorrências mensais não são afetadas por esta edição.
            </p>
          </div>
        )}

        <div
          className="flex justify-end gap-3 pt-2"
          style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}
        >
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <button type="submit" className="btn-primary">
            {isEdit ? 'Salvar alterações' : 'Criar Despesa'}
          </button>
        </div>
      </form>
    </PortalModal>
  )
}