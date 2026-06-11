// frontend/components/calendar/EventModal.jsx
// Módulo Agenda — Kronos

import { useState, useEffect } from 'react';

const STATUS_OPTIONS = [
  { value: 'scheduled',   label: 'Agendado' },
  { value: 'in_progress', label: 'Em andamento' },
  { value: 'completed',   label: 'Concluído' },
  { value: 'cancelled',   label: 'Cancelado' },
];

const COLOR_OPTIONS = [
  '#4A90E2', '#7B68EE', '#50C878', '#FF6B6B',
  '#FFD700', '#FF8C00', '#20B2AA', '#DA70D6',
];

function toInputDate(iso) {
  if (!iso) return '';
  return iso.substring(0, 10);
}

function toInputTime(iso) {
  if (!iso) return '';
  return iso.substring(11, 16);
}

function buildIso(date, time) {
  if (!date) return '';
  return `${date}T${time || '00:00'}:00`;
}

export default function EventModal({ event, defaultDate, users = [], onSave, onClose, canDelete, onDelete }) {
  const isEdit = Boolean(event?.id);

  const [form, setForm] = useState({
    title:       '',
    description: '',
    date:        defaultDate || toInputDate(new Date().toISOString()),
    start_time:  '09:00',
    end_time:    '10:00',
    location:    '',
    color:       '#4A90E2',
    status:      'scheduled',
    user_id:     '',
  });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (event) {
      setForm({
        title:       event.title       || '',
        description: event.description || '',
        date:        toInputDate(event.start_date),
        start_time:  toInputTime(event.start_date),
        end_time:    toInputTime(event.end_date),
        location:    event.location    || '',
        color:       event.color       || '#4A90E2',
        status:      event.status      || 'scheduled',
        user_id:     event.user_id     || '',
      });
    }
  }, [event]);

  function set(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    if (!form.title.trim()) { setError('Título é obrigatório'); return; }
    if (!form.date)          { setError('Data é obrigatória');  return; }

    setError('');
    setLoading(true);
    try {
      await onSave({
        title:       form.title.trim(),
        description: form.description || null,
        start_date:  buildIso(form.date, form.start_time),
        end_date:    buildIso(form.date, form.end_time),
        location:    form.location || null,
        color:       form.color,
        status:      form.status,
        user_id:     form.user_id || null,
      });
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm('Excluir este evento?')) return;
    setLoading(true);
    try {
      await onDelete(event.id);
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="cal-modal-overlay" onClick={onClose}>
      <div className="cal-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="cal-modal-header">
          <h2 className="cal-modal-title">{isEdit ? 'Editar Evento' : 'Novo Evento'}</h2>
          <button className="cal-modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Body */}
        <div className="cal-modal-body">
          {error && <div className="cal-modal-error">{error}</div>}

          <div className="cal-field">
            <label>Título *</label>
            <input
              type="text"
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="Nome do evento"
              autoFocus
            />
          </div>

          <div className="cal-field">
            <label>Descrição</label>
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Descrição opcional"
              rows={3}
            />
          </div>

          <div className="cal-field-row">
            <div className="cal-field">
              <label>Data *</label>
              <input
                type="date"
                value={form.date}
                onChange={e => set('date', e.target.value)}
              />
            </div>
            <div className="cal-field">
              <label>Hora inicial</label>
              <input
                type="time"
                value={form.start_time}
                onChange={e => set('start_time', e.target.value)}
              />
            </div>
            <div className="cal-field">
              <label>Hora final</label>
              <input
                type="time"
                value={form.end_time}
                onChange={e => set('end_time', e.target.value)}
              />
            </div>
          </div>

          <div className="cal-field">
            <label>Local</label>
            <input
              type="text"
              value={form.location}
              onChange={e => set('location', e.target.value)}
              placeholder="Endereço ou link"
            />
          </div>

          <div className="cal-field-row">
            <div className="cal-field">
              <label>Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value)}>
                {STATUS_OPTIONS.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            {users.length > 0 && (
              <div className="cal-field">
                <label>Responsável</label>
                <select value={form.user_id} onChange={e => set('user_id', e.target.value)}>
                  <option value="">— Selecionar —</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="cal-field">
            <label>Cor do evento</label>
            <div className="cal-color-picker">
              {COLOR_OPTIONS.map(c => (
                <button
                  key={c}
                  className={`cal-color-swatch ${form.color === c ? 'active' : ''}`}
                  style={{ background: c }}
                  onClick={() => set('color', c)}
                  type="button"
                />
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="cal-modal-footer">
          {isEdit && canDelete && (
            <button className="btn-danger" onClick={handleDelete} disabled={loading}>
              Excluir
            </button>
          )}
          <div className="cal-modal-footer-right">
            <button className="btn-secondary" onClick={onClose} disabled={loading}>
              Cancelar
            </button>
            <button className="btn-primary" onClick={handleSave} disabled={loading}>
              {loading ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}