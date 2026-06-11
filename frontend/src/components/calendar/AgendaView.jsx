// frontend/components/calendar/AgendaView.jsx
// Módulo Agenda — Kronos


const STATUS_LABELS = {
  scheduled:   'Agendado',
  in_progress: 'Em andamento',
  completed:   'Concluído',
  cancelled:   'Cancelado',
};

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

function formatTime(iso) {
  if (!iso) return '';

  const time = iso.split('T')[1];

  if (!time) return '';

  return time.substring(0, 5);
}
function groupByDate(events) {
  const groups = {};
  events.forEach(ev => {
    const key = ev.start_date.substring(0, 10);
    if (!groups[key]) groups[key] = [];
    groups[key].push(ev);
  });
  return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
}

export default function AgendaView({ events, onEventClick, canEdit, canDelete, onDelete }) {
  if (!events.length) {
    return (
      <div className="agenda-empty">
        <p>Nenhum evento encontrado.</p>
      </div>
    );
  }

  const groups = groupByDate(events);

  return (
    <div className="agenda-view">
      {groups.map(([dateKey, dayEvents]) => (
        <div key={dateKey} className="agenda-group">
          <div className="agenda-date-label">
            {formatDate(dayEvents[0].start_date)}
          </div>

          <div className="agenda-events">
            {dayEvents.map(ev => (
              <div key={ev.id} className="agenda-event">
                <div
                  className="agenda-event-color-bar"
                  style={{ background: ev.color || '#4A90E2' }}
                />

                <div className="agenda-event-body">
                  <div className="agenda-event-time">
                    {formatTime(ev.start_date)} – {formatTime(ev.end_date)}
                  </div>
                  <div className="agenda-event-title">{ev.title}</div>
                  {ev.description && (
                    <div className="agenda-event-desc">{ev.description}</div>
                  )}
                  {ev.location && (
                    <div className="agenda-event-location">📍 {ev.location}</div>
                  )}
                  <div className="agenda-event-meta">
                    <span className={`agenda-status agenda-status--${ev.status}`}>
                      {STATUS_LABELS[ev.status] || ev.status}
                    </span>
                    {ev.responsible_name && (
                      <span className="agenda-responsible">👤 {ev.responsible_name}</span>
                    )}
                  </div>
                </div>

                <div className="agenda-event-actions">
                  {canEdit && (
                    <button
                      className="btn-secondary btn-sm"
                      onClick={() => onEventClick(ev)}
                    >
                      Editar
                    </button>
                  )}
                  {canDelete && (
                    <button
                      className="btn-danger btn-sm"
                      onClick={() => onDelete(ev.id)}
                    >
                      Excluir
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}