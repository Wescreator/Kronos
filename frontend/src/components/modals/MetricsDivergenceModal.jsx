import Modal from '../ui/Modal'
import { AlertTriangle } from 'lucide-react'

// Modal simples de confirmação — por isso usa `Modal`, não `PortalModal`
// (que é reservado para formulários grandes, como o NewBudgetModal).
export default function MetricsDivergenceModal({ open, onClose, onApply, divergences = [], applying = false }) {
  return (
    <Modal open={open} onClose={onClose} title="Métricas desatualizadas" size="md">
      <div className="flex items-start gap-3 mb-4">
        <div className="p-2 rounded-xl shrink-0" style={{ background: 'rgba(251,191,36,0.12)' }}>
          <AlertTriangle size={18} style={{ color: '#FBBF24' }} />
        </div>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          As taxas configuradas para {divergences.length === 1 ? 'este item' : 'estes itens'} mudaram desde
          que este rascunho foi salvo. Deseja aplicar as métricas vigentes?
        </p>
      </div>

      <div className="space-y-2 mb-6">
        {divergences.map(d => (
          <div
            key={d.item_id}
            className="flex items-center justify-between px-3 py-2.5 rounded-xl"
            style={{ background: 'rgba(0,0,0,0.02)', border: '1px solid var(--border-subtle)' }}
          >
            <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{d.label}</span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              R$ {Number(d.saved_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              {' → '}
              <span style={{ color: '#34D399', fontWeight: 600 }}>
                R$ {Number(d.current_value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </span>
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-3">
        <button onClick={onClose} className="btn-secondary" disabled={applying}>
          Manter valores salvos
        </button>
        <button onClick={onApply} disabled={applying} className="btn-primary">
          {applying ? 'Aplicando...' : 'Aplicar métricas vigentes'}
        </button>
      </div>
    </Modal>
  )
}