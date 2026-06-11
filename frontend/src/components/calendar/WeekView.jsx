// frontend/components/calendar/WeekView.jsx
// Módulo Agenda — Kronos


const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function getWeekDays(baseDate) {
  const d = new Date(baseDate);
  const day = d.getDay(); // 0 = dom
  const sunday = new Date(d);
  sunday.setDate(d.getDate() - day);

  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(sunday);
    date.setDate(sunday.getDate() + i);
    return date;
  });
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth()    === b.getMonth()    &&
    a.getDate()     === b.getDate()
  );
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function getEventsForDay(events, date) {
  return events.filter(ev => isSameDay(new Date(ev.start_date), date));
}

export default function WeekView({ currentDate, events, onDayClick, onEventClick }) {
  const today   = new Date();
  const weekDays = getWeekDays(currentDate);

  return (
    <div className="week-view">
      {weekDays.map((date, i) => {
        const dayEvents = getEventsForDay(events, date);
        const isToday   = isSameDay(date, today);

        return (
          <div
            key={i}
            className={`week-column ${isToday ? 'week-column--today' : ''}`}
            onClick={() => onDayClick(date)}
          >
            <div className={`week-column-header ${isToday ? 'week-column-header--today' : ''}`}>
              <span className="week-weekday">{WEEKDAY_LABELS[i]}</span>
              <span className={`week-day-number ${isToday ? 'week-day-number--today' : ''}`}>
                {date.getDate()}
              </span>
            </div>

            <div className="week-events">
              {dayEvents.length === 0 && (
                <div className="week-empty">—</div>
              )}
              {dayEvents.map(ev => (
                <div
                  key={ev.id}
                  className="week-event"
                  style={{ borderLeft: `3px solid ${ev.color || '#4A90E2'}` }}
                  onClick={e => { e.stopPropagation(); onEventClick(ev); }}
                >
                  <div className="week-event-time">
                    {formatTime(ev.start_date)} – {formatTime(ev.end_date)}
                  </div>
                  <div className="week-event-title">{ev.title}</div>
                  {ev.location && (
                    <div className="week-event-location">📍 {ev.location}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}