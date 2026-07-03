import React from 'react'
import Modal from './Modal'

export default function ConfirmDialog({ open, onClose, onConfirm, title, message, danger = false, deleteLoading = false }) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--text-secondary)' }}>
        {message}
      </p>
      <div className="flex justify-end gap-3">
        <button onClick={onClose} className="btn-secondary" disabled={deleteLoading}>
          Cancelar
        </button>
        <button
          onClick={onConfirm}
          disabled={deleteLoading}
          className={danger ? 'btn-danger' : 'btn-primary'}
        >
          {deleteLoading ? 'Excluindo...' : 'Confirmar'}
        </button>
      </div>
    </Modal>
  )
}