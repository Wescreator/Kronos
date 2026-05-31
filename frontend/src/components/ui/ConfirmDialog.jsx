import Modal from './Modal'

export default function ConfirmDialog({ open, onClose, onConfirm, title, message, danger = false }) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--text-secondary)' }}>
        {message}
      </p>
      <div className="flex justify-end gap-3">
        <button onClick={onClose} className="btn-secondary">Cancelar</button>
        <button
          onClick={() => { onConfirm(); onClose() }}
          className={danger ? 'btn-danger' : 'btn-primary'}
        >
          Confirmar
        </button>
      </div>
    </Modal>
  )
}