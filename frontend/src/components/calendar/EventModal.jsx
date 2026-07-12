// frontend/components/calendar/EventModal.jsx
// Módulo Agenda — Kronos

import { useState, useEffect } from 'react';
import PortalModal from '../ui/PortalModal';
import useIdempotencyKey from '../../hooks/useIdempotencyKey';

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

  // O modal é montado a cada abertura, então uma chave por montagem já
  // representa exatamente uma intenção. Ver hooks/useIdempotencyKey.
  const [idemKey] = useIdempotencyKey(true);

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
      }, idemKey);
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

  const labelClass = 'block mb-1 text-sm font-semibold';
  const labelStyle = { color: 'var(--text-primary)' };

  return (
    <PortalModal
      open
      onClose={onClose}
      title={isEdit ? 'Editar Evento' : 'Novo Evento'}
      size="lg"
      footer={
        <div className="flex items-center justify-between">
          {isEdit && canDelete ? (
            <button className="btn-danger" onClick={handleDelete} disabled={loading}>
              Excluir
            </button>
          ) : <span />}
          <div className="flex gap-3">
            <button className="btn-secondary" onClick={onClose} disabled={loading}>
              Cancelar
            </button>
            <button className="btn-primary" onClick={handleSave} disabled={loading}>
              {loading ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        {error && (
          <div style={{
            background: 'rgba(220,38,38,0.08)',
            border: '1px solid rgba(220,38,38,0.20)',
            color: 'var(--color-danger)',
            padding: '0.55rem 0.85rem',
            borderRadius: 12,
            fontSize: 13,
            fontWeight: 500,
          }}>
            {error}
          </div>
        )}

        <div>
          <label className={labelClass} style={labelStyle}>Título *</label>
          <input
            className="input"
            type="text"
            value={form.title}
            onChange={e => set('title', e.target.value)}
            placeholder="Nome do evento"
            autoFocus
          />
        </div>

        <div>
          <label className={labelClass} style={labelStyle}>Descrição</label>
          <textarea
            className="input resize-none"
            rows={3}
            value={form.description}
            onChange={e => set('description', e.target.value)}
            placeholder="Descrição opcional"
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={labelClass} style={labelStyle}>Data *</label>
            <input className="input" type="date" value={form.date}
              onChange={e => set('date', e.target.value)} />
          </div>
          <div>
            <label className={labelClass} style={labelStyle}>Hora inicial</label>
            <input className="input" type="time" value={form.start_time}
              onChange={e => set('start_time', e.target.value)} />
          </div>
          <div>
            <label className={labelClass} style={labelStyle}>Hora final</label>
            <input className="input" type="time" value={form.end_time}
              onChange={e => set('end_time', e.target.value)} />
          </div>
        </div>

        <div>
          <label className={labelClass} style={labelStyle}>Local</label>
          <input
            className="input"
            type="text"
            value={form.location}
            onChange={e => set('location', e.target.value)}
            placeholder="Endereço ou link"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass} style={labelStyle}>Status</label>
            <select className="input" value={form.status} onChange={e => set('status', e.target.value)}>
              {STATUS_OPTIONS.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          {users.length > 0 && (
            <div>
              <label className={labelClass} style={labelStyle}>Responsável</label>
              <select className="input" value={form.user_id} onChange={e => set('user_id', e.target.value)}>
                <option value="">— Selecionar —</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div>
          <label className={labelClass} style={labelStyle}>Cor do evento</label>
          <div className="flex flex-wrap gap-2 mt-1.5">
            {COLOR_OPTIONS.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => set('color', c)}
                className="rounded-full transition-all duration-150"
                style={{
                  width: 28,
                  height: 28,
                  background: c,
                  border: form.color === c ? '2px solid var(--text-primary)' : '2px solid transparent',
                  boxShadow: form.color === c ? '0 0 0 3px rgba(120,120,130,0.20)' : 'none',
                  cursor: 'pointer',
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </PortalModal>
  );
}