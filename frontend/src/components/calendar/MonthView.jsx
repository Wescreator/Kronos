// frontend/components/calendar/MonthView.jsx
// Módulo Agenda — Kronos


const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth()    === b.getMonth()    &&
    a.getDate()     === b.getDate()
  );
}

function buildCalendarDays(year, month) {
  const firstDay = new Date(year, month, 1);
  const lastDay  = new Date(year, month + 1, 0);
  const days = [];

  // dias do mês anterior para preencher a primeira linha
  for (let i = 0; i < firstDay.getDay(); i++) {
    const d = new Date(year, month, -firstDay.getDay() + i + 1);
    days.push({ date: d, currentMonth: false });
  }

  // dias do mês atual
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push({ date: new Date(year, month, d), currentMonth: true });
  }

  // dias do mês seguinte para completar a última linha
  const remaining = 7 - (days.length % 7);
  if (remaining < 7) {
    for (let i = 1; i <= remaining; i++) {
      days.push({ date: new Date(year, month + 1, i), currentMonth: false });
    }
  }

  return days;
}

function getEventsForDay(events, date) {
  return events.filter(ev => {
    const evDate = new Date(ev.start_date);
    return isSameDay(evDate, date);
  });
}

function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export default function MonthView({ currentDate, events, onDayClick, onEventClick }) {
  const today  = new Date();
  const year   = currentDate.getFullYear();
  const month  = currentDate.getMonth();
  const days   = buildCalendarDays(year, month);

  return (
    <div className="month-view">
      {/* Cabeçalho dos dias da semana */}
      <div className="month-weekdays">
        {WEEKDAYS.map(d => (
          <div key={d} className="month-weekday-label">{d}</div>
        ))}
      </div>

      {/* Grid de dias */}
      <div className="month-grid">
        {days.map(({ date, currentMonth }, idx) => {
          const dayEvents = getEventsForDay(events, date);
          const isToday   = isSameDay(date, today);

          return (
            <div
              key={idx}
              className={[
                'month-cell',
                currentMonth ? '' : 'month-cell--outside',
                isToday ? 'month-cell--today' : '',
              ].join(' ')}
              onClick={() => onDayClick(date)}
            >
              <span className={`month-day-number ${isToday ? 'month-day-number--today' : ''}`}>
                {date.getDate()}
              </span>

              <div className="month-events">
                {dayEvents.slice(0, 3).map(ev => (
                  <div
                    key={ev.id}
                    className="month-event-chip"
                    style={{ background: ev.color || '#4A90E2' }}
                    onClick={e => { e.stopPropagation(); onEventClick(ev); }}
                    title={ev.title}
                  >
                    <span className="month-event-time">{formatTime(ev.start_date)}</span>
                    <span className="month-event-title">{ev.title}</span>
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="month-event-more">+{dayEvents.length - 3} mais</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}