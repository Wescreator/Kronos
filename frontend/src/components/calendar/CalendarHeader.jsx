// frontend/components/calendar/CalendarHeader.jsx
// Módulo Agenda — Kronos
// CSS centralizado no App.css — sem import local

const MONTH_NAMES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];

export default function CalendarHeader({
  view, currentDate, onToday, onPrev, onNext, onViewChange, onNewEvent, canCreate,
}) {
  const month = MONTH_NAMES[currentDate.getMonth()];
  const year  = currentDate.getFullYear();

  return (
    <div className="cal-header">
      <div className="cal-header-left">
        <button className="btn-secondary btn-sm" onClick={onToday}>Hoje</button>
        <button className="cal-nav-btn" onClick={onPrev} title="Anterior">‹</button>
        <button className="cal-nav-btn" onClick={onNext} title="Próximo">›</button>
        <span className="cal-period-label">{month} {year}</span>
      </div>
      <div className="cal-header-right">
        <div className="cal-view-switcher">
          {['month', 'week', 'agenda'].map(v => (
            <button key={v} className={`cal-view-btn ${view === v ? 'active' : ''}`} onClick={() => onViewChange(v)}>
              {v === 'month' ? 'Mês' : v === 'week' ? 'Semana' : 'Agenda'}
            </button>
          ))}
        </div>
        {canCreate && (
          <button className="btn-primary" onClick={onNewEvent}>+ Novo Evento</button>
        )}
      </div>
    </div>
  );
}