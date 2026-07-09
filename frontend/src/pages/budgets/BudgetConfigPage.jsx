import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Plus, Trash2, Edit, Layers, ChevronDown, ChevronRight, DollarSign } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Modal from '../../components/ui/Modal'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { useBudgetConfig } from '../../hooks/useBudgetConfig'
import {
  createBudgetTitle, updateBudgetTitle, deleteBudgetTitle,
  createBudgetLevel, updateBudgetLevel, deleteBudgetLevel,
  setBudgetLevelRate,
} from '../../services/budgets.service'
import { toast } from 'react-hot-toast'
import useAuthStore from '../../store/authStore'
import { can } from '../../utils/permissions'

// ── Modal simples de Título ─────────────────────────────────────
function TitleFormModal({ open, onClose, onSuccess, title }) {
  const [label, setLabel]     = useState(title?.label || '')
  const [saving, setSaving]   = useState(false)
  const isEdit = !!title

  useState(() => { if (open) setLabel(title?.label || '') }, [open, title])

  const handleSubmit = async () => {
    if (!label.trim()) return toast.error('O rótulo do título é obrigatório')
    setSaving(true)
    try {
      if (isEdit) {
        await updateBudgetTitle(title.id, { label: label.trim() })
        toast.success('Título atualizado!')
      } else {
        await createBudgetTitle({ label: label.trim() })
        toast.success('Título criado!')
      }
      onSuccess()
      onClose()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Erro ao salvar título')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Editar Título' : 'Novo Título'} size="sm">
      <div className="mb-6">
        <label className="block mb-1 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          Rótulo <span style={{ color: '#FB7185' }}>*</span>
        </label>
        <input
          className="input"
          placeholder="Ex: Projeto Estrutural"
          value={label}
          onChange={e => setLabel(e.target.value)}
          autoFocus
        />
      </div>
      <div className="flex justify-end gap-3">
        <button onClick={onClose} className="btn-secondary" disabled={saving}>Cancelar</button>
        <button onClick={handleSubmit} disabled={saving} className="btn-primary">
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </Modal>
  )
}

// ── Modal de Nível (cria com taxa inicial, ou edita só o rótulo) ───
function LevelFormModal({ open, onClose, onSuccess, budgetTitleId, level }) {
  const [label,     setLabel]     = useState(level?.label || '')
  const [rateType,  setRateType]  = useState(level?.current_rate?.rate_type || 'per_area')
  const [rateValue, setRateValue] = useState(level?.current_rate?.value || '')
  const [saving,    setSaving]    = useState(false)
  const isEdit = !!level

  useState(() => {
    if (open) {
      setLabel(level?.label || '')
      setRateType(level?.current_rate?.rate_type || 'per_area')
      setRateValue(level?.current_rate?.value || '')
    }
  }, [open, level])

  const handleSubmit = async () => {
    if (!label.trim()) return toast.error('O rótulo do nível é obrigatório')
    if (!isEdit && (rateValue === '' || Number(rateValue) < 0)) {
      return toast.error('Informe uma taxa inicial válida')
    }

    setSaving(true)
    try {
      if (isEdit) {
        await updateBudgetLevel(level.id, { label: label.trim() })
        toast.success('Nível atualizado!')
      } else {
        await createBudgetLevel({
          budget_title_id: budgetTitleId,
          label: label.trim(),
          rate_type: rateType,
          rate_value: Number(rateValue),
        })
        toast.success('Nível criado!')
      }
      onSuccess()
      onClose()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Erro ao salvar nível')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Editar Nível' : 'Novo Nível'} size="sm">
      <div className="space-y-4 mb-6">
        <div>
          <label className="block mb-1 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Rótulo <span style={{ color: '#FB7185' }}>*</span>
          </label>
          <input
            className="input"
            placeholder="Ex: Padrão Alto"
            value={label}
            onChange={e => setLabel(e.target.value)}
            autoFocus
          />
        </div>

        {/* Taxa inicial só aparece na criação — para editar a taxa de um
            nível existente, usamos o RateFormModal (nunca sobrescreve,
            sempre cria uma nova versão vigente). */}
        {!isEdit && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" style={{ fontSize: 10 }}>Tipo de Taxa</label>
              <select className="input" value={rateType} onChange={e => setRateType(e.target.value)}>
                <option value="per_area">Por área (R$/m²)</option>
                <option value="fixed">Fixa (R$)</option>
              </select>
            </div>
            <div>
              <label className="label" style={{ fontSize: 10 }}>Valor Inicial</label>
              <input
                className="input"
                type="number"
                min="0"
                step="0.01"
                placeholder="0,00"
                value={rateValue}
                onChange={e => setRateValue(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>
      <div className="flex justify-end gap-3">
        <button onClick={onClose} className="btn-secondary" disabled={saving}>Cancelar</button>
        <button onClick={handleSubmit} disabled={saving} className="btn-primary">
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </Modal>
  )
}

// ── Modal de atualização de Taxa — sempre cria nova versão vigente ──
function RateFormModal({ open, onClose, onSuccess, level }) {
  const [rateType,  setRateType]  = useState(level?.current_rate?.rate_type || 'per_area')
  const [rateValue, setRateValue] = useState('')
  const [saving,    setSaving]    = useState(false)

  useState(() => {
    if (open) {
      setRateType(level?.current_rate?.rate_type || 'per_area')
      setRateValue('')
    }
  }, [open, level])

  const handleSubmit = async () => {
    if (rateValue === '' || Number(rateValue) < 0) return toast.error('Informe uma taxa válida')
    setSaving(true)
    try {
      await setBudgetLevelRate(level.id, { rate_type: rateType, value: Number(rateValue) })
      toast.success('Nova taxa vigente definida! Orçamentos já finalizados não são afetados.')
      onSuccess()
      onClose()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Erro ao atualizar taxa')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Atualizar Taxa — ${level?.label}`} size="sm">
      <div className="mb-4 p-3 rounded-xl" style={{ background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.20)' }}>
        <p className="text-xs" style={{ color: '#374151', lineHeight: 1.6 }}>
          Taxa vigente atual:{' '}
          <strong>
            {level?.current_rate
              ? `R$ ${Number(level.current_rate.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}${level.current_rate.rate_type === 'per_area' ? '/m²' : ' (fixa)'}`
              : 'não definida'}
          </strong>
          . A nova taxa só afeta orçamentos em rascunho e finalizados que forem recalculados — orçamentos já finalizados permanecem intactos.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div>
          <label className="label" style={{ fontSize: 10 }}>Tipo de Taxa</label>
          <select className="input" value={rateType} onChange={e => setRateType(e.target.value)}>
            <option value="per_area">Por área (R$/m²)</option>
            <option value="fixed">Fixa (R$)</option>
          </select>
        </div>
        <div>
          <label className="label" style={{ fontSize: 10 }}>Novo Valor</label>
          <input
            className="input"
            type="number"
            min="0"
            step="0.01"
            placeholder="0,00"
            value={rateValue}
            onChange={e => setRateValue(e.target.value)}
            autoFocus
          />
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button onClick={onClose} className="btn-secondary" disabled={saving}>Cancelar</button>
        <button onClick={handleSubmit} disabled={saving} className="btn-primary">
          {saving ? 'Salvando...' : 'Definir Nova Taxa'}
        </button>
      </div>
    </Modal>
  )
}

// ── Linha de Nível dentro do Título expandido ───────────────────
function LevelRow({ level, canManage, onEditLevel, onEditRate, onDelete }) {
  const rate = level.current_rate

  return (
    <div
      className="flex items-center justify-between px-4 py-3 rounded-xl mb-2"
      style={{ background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.06)' }}
    >
      <div>
        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{level.label}</p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
          {rate
            ? `R$ ${Number(rate.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}${rate.rate_type === 'per_area' ? '/m²' : ' (taxa fixa)'}`
            : 'Sem taxa definida'}
        </p>
      </div>

      {canManage && (
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEditRate(level)}
            title="Atualizar taxa"
            className="p-1.5 rounded-lg transition-all"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#38BDF8'; e.currentTarget.style.background = 'rgba(56,189,248,0.10)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent' }}
          >
            <DollarSign size={14} />
          </button>
          <button
            onClick={() => onEditLevel(level)}
            title="Editar rótulo"
            className="p-1.5 rounded-lg transition-all"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#374151'; e.currentTarget.style.background = 'rgba(0,0,0,0.06)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent' }}
          >
            <Edit size={14} />
          </button>
          <button
            onClick={() => onDelete(level)}
            title="Remover nível"
            className="p-1.5 rounded-lg transition-all"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#FB7185'; e.currentTarget.style.background = 'rgba(251,113,133,0.10)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent' }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}
    </div>
  )
}

// ── Card de Título expansível ────────────────────────────────────
function TitleCard({ title, canManage, onEditTitle, onDeleteTitle, onAddLevel, onEditLevel, onEditRate, onDeleteLevel }) {
  const [expanded, setExpanded] = useState(true)

  return (
    <div className="card p-5 mb-4">
      <div className="flex items-center justify-between mb-1">
        <button
          onClick={() => setExpanded(e => !e)}
          className="flex items-center gap-2 text-left"
        >
          {expanded ? <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} /> : <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />}
          <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{title.label}</span>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            ({title.levels.length} {title.levels.length === 1 ? 'nível' : 'níveis'})
          </span>
        </button>

        {canManage && (
          <div className="flex items-center gap-1">
            <button onClick={() => onEditTitle(title)} className="p-1.5 rounded-lg transition-all" style={{ color: 'var(--text-muted)' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#374151'; e.currentTarget.style.background = 'rgba(0,0,0,0.06)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent' }}
            >
              <Edit size={14} />
            </button>
            <button onClick={() => onDeleteTitle(title)} className="p-1.5 rounded-lg transition-all" style={{ color: 'var(--text-muted)' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#FB7185'; e.currentTarget.style.background = 'rgba(251,113,133,0.10)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent' }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>

      {expanded && (
        <div className="mt-4 pl-6">
          {title.levels.map(level => (
            <LevelRow
              key={level.id}
              level={level}
              canManage={canManage}
              onEditLevel={onEditLevel}
              onEditRate={onEditRate}
              onDelete={onDeleteLevel}
            />
          ))}

          {canManage && (
            <button
              onClick={() => onAddLevel(title.id)}
              className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl w-full mt-1 transition-all"
              style={{ color: 'var(--text-muted)', border: '1px dashed rgba(0,0,0,0.10)' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'rgba(0,0,0,0.20)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'rgba(0,0,0,0.10)' }}
            >
              <Plus size={13} /> Adicionar nível
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default function BudgetConfigPage() {
  const { user } = useAuthStore()
  const role     = user?.role || 'member'
  const canManage = can(role, 'budgets', 'manageConfig')
  const { titles, loading, refetch } = useBudgetConfig()
  const [showTitleModal, setShowTitleModal] = useState(false)
  const [editingTitle,   setEditingTitle]   = useState(null)
  const [showLevelModal, setShowLevelModal] = useState(false)
  const [levelTitleId,   setLevelTitleId]   = useState(null)
  const [editingLevel,   setEditingLevel]   = useState(null)
  const [showRateModal,  setShowRateModal]  = useState(false)
  const [rateLevel,      setRateLevel]      = useState(null)
  const [deleteTarget,   setDeleteTarget]   = useState(null)
  const [deleting,       setDeleting]       = useState(false)

  if (!canManage) {
    return <Navigate to="/app/budgets" replace />
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      if (deleteTarget.type === 'title') {
        await deleteBudgetTitle(deleteTarget.item.id)
        toast.success('Título removido')
      } else {
        await deleteBudgetLevel(deleteTarget.item.id)
        toast.success('Nível removido')
      }
      setDeleteTarget(null)
      refetch()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Erro ao remover')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="fade-in">
      <PageHeader
        title="Configuração de Orçamentos"
        subtitle="Defina os Títulos, Níveis e Taxas usados no motor de cálculo dos orçamentos"
        actions={
          <button onClick={() => { setEditingTitle(null); setShowTitleModal(true) }} className="btn-primary">
            Novo Título
          </button>
        }
      />

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : titles.length === 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 24, minHeight: 320, background: 'rgba(0,0,0,0.02)', border: '1px dashed rgba(0,0,0,0.10)' }}>
          <EmptyState
            icon={Layers}
            title="Nenhum título configurado"
            description="Crie o primeiro título de precificação para começar"
            action={
              <button onClick={() => { setEditingTitle(null); setShowTitleModal(true) }} className="btn-primary">
                Novo Título
              </button>
            }
          />
        </div>
      ) : (
        <div>
          {titles.map(title => (
            <TitleCard
              key={title.id}
              title={title}
              canManage={canManage}
              onEditTitle={(t) => { setEditingTitle(t); setShowTitleModal(true) }}
              onDeleteTitle={(t) => setDeleteTarget({ type: 'title', item: t })}
              onAddLevel={(titleId) => { setLevelTitleId(titleId); setEditingLevel(null); setShowLevelModal(true) }}
              onEditLevel={(level) => { setLevelTitleId(title.id); setEditingLevel(level); setShowLevelModal(true) }}
              onEditRate={(level) => { setRateLevel(level); setShowRateModal(true) }}
              onDeleteLevel={(level) => setDeleteTarget({ type: 'level', item: level })}
            />
          ))}
        </div>
      )}

      <TitleFormModal
        open={showTitleModal}
        onClose={() => setShowTitleModal(false)}
        onSuccess={refetch}
        title={editingTitle}
      />

      <LevelFormModal
        open={showLevelModal}
        onClose={() => setShowLevelModal(false)}
        onSuccess={refetch}
        budgetTitleId={levelTitleId}
        level={editingLevel}
      />

      <RateFormModal
        open={showRateModal}
        onClose={() => setShowRateModal(false)}
        onSuccess={refetch}
        level={rateLevel}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        deleteLoading={deleting}
        title={deleteTarget?.type === 'title' ? 'Excluir título' : 'Excluir nível'}
        message={
          deleteTarget?.type === 'title'
            ? `Deseja excluir o título "${deleteTarget?.item?.label}"? Todos os níveis e taxas vinculados também serão removidos.`
            : `Deseja excluir o nível "${deleteTarget?.item?.label}"? Orçamentos que já usam este nível manterão seus valores no snapshot, mas não poderão mais selecioná-lo.`
        }
        danger
      />
    </div>
  )
}