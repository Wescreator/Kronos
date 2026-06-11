// frontend/pages/calendar/CalendarPage.jsx
// Módulo Agenda — Kronos

import { useState, useEffect, useCallback } from 'react'
import CalendarHeader from '../../components/calendar/CalendarHeader'
import MonthView from '../../components/calendar/MonthView'
import WeekView from '../../components/calendar/WeekView'
import AgendaView from '../../components/calendar/AgendaView'
import EventModal from '../../components/calendar/EventModal'
import '../../App.css'
import {
  getEventsByMonth,
  getEventsByWeek,
  getAgendaEvents,
  createEvent,
  updateEvent,
  deleteEvent,
} from '../../services/calendar.service'

import { getUsers } from '../../services/team.service'
import { useAuth } from '../../hooks/useAuth'
import { can } from '../../utils/permissions'

function getWeekRange(date) {
  const d = new Date(date)

  const day = d.getDay()

  const start = new Date(d)
  start.setDate(d.getDate() - day)
  start.setHours(0, 0, 0, 0)

  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  end.setHours(23, 59, 59, 999)

  return {
    startOfWeek: start.toISOString(),
    endOfWeek: end.toISOString(),
  }
}

export default function CalendarPage() {
  const { user } = useAuth()

  const [view, setView] = useState('month')
  const [currentDate, setCurrentDate] = useState(new Date())

  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(false)

  const [modalOpen, setModalOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [defaultDate, setDefaultDate] = useState('')

  const [teamUsers, setTeamUsers] = useState([])

  // Permissões do Kronos
  const canCreate = can(user?.role, 'agenda', 'create')
  const canEdit = can(user?.role, 'agenda', 'edit')
  const canDelete = can(user?.role, 'agenda', 'delete')

  // ─────────────────────────────────────────────────────────────
  // Usuários da equipe
  // ─────────────────────────────────────────────────────────────

  useEffect(() => {
    async function loadUsers() {
      try {
        const { data } = await getUsers()

        setTeamUsers(
          data?.users ||
          data?.data ||
          data ||
          []
        )
      } catch (error) {
        console.error('Erro ao carregar equipe:', error)
        setTeamUsers([])
      }
    }

    loadUsers()
  }, [])

  // ─────────────────────────────────────────────────────────────
  // Eventos
  // ─────────────────────────────────────────────────────────────

  const loadEvents = useCallback(async () => {
    setLoading(true)

    try {
      let data = []

      if (view === 'month') {
        data = await getEventsByMonth(
          currentDate.getFullYear(),
          currentDate.getMonth() + 1
        )
      }

      else if (view === 'week') {
        const { startOfWeek, endOfWeek } =
          getWeekRange(currentDate)

        data = await getEventsByWeek(
          startOfWeek,
          endOfWeek
        )
      }

      else {
        data = await getAgendaEvents(
          currentDate.toISOString()
        )
      }

      setEvents(data || [])
    }

    catch (error) {
      console.error(
        '[Calendar] Erro ao carregar eventos:',
        error
      )

      setEvents([])
    }

    finally {
      setLoading(false)
    }
  }, [view, currentDate])

  useEffect(() => {
    loadEvents()
  }, [loadEvents])

  // ─────────────────────────────────────────────────────────────
  // Navegação
  // ─────────────────────────────────────────────────────────────

  function navigate(direction) {
    setCurrentDate((prev) => {
      const d = new Date(prev)

      if (view === 'month') {
        d.setMonth(d.getMonth() + direction)
      } else {
        d.setDate(d.getDate() + direction * 7)
      }

      return d
    })
  }

  function goToday() {
    setCurrentDate(new Date())
  }

  // ─────────────────────────────────────────────────────────────
  // Modal
  // ─────────────────────────────────────────────────────────────

  function openCreate(date) {
    if (!canCreate) return

    setSelectedEvent(null)

    setDefaultDate(
      date
        ? date.toISOString().substring(0, 10)
        : ''
    )

    setModalOpen(true)
  }

  function openEdit(event) {
    if (!canEdit) return

    setSelectedEvent(event)
    setDefaultDate('')

    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setSelectedEvent(null)
  }

  async function handleSave(payload) {
    try {
      if (selectedEvent?.id) {
        await updateEvent(selectedEvent.id, payload)
      } else {
        await createEvent(payload)
      }

      await loadEvents()
      closeModal()
    } catch (error) {
      console.error(
        '[Calendar] Erro ao salvar evento:',
        error
      )
    }
  }

  async function handleDelete(id) {
    try {
      await deleteEvent(id)

      await loadEvents()
      closeModal()
    } catch (error) {
      console.error(
        '[Calendar] Erro ao excluir evento:',
        error
      )
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────

  return (
    <div className="calendar-page">
      <CalendarHeader
        view={view}
        currentDate={currentDate}
        onToday={goToday}
        onPrev={() => navigate(-1)}
        onNext={() => navigate(1)}
        onViewChange={setView}
        onNewEvent={() => openCreate(null)}
        canCreate={canCreate}
      />

      <div className="calendar-body">
        {loading && (
          <div className="calendar-loading">
            Carregando...
          </div>
        )}

        {!loading && view === 'month' && (
          <MonthView
            currentDate={currentDate}
            events={events}
            onDayClick={openCreate}
            onEventClick={openEdit}
          />
        )}

        {!loading && view === 'week' && (
          <WeekView
            currentDate={currentDate}
            events={events}
            onDayClick={openCreate}
            onEventClick={openEdit}
          />
        )}

        {!loading && view === 'agenda' && (
          <AgendaView
            events={events}
            onEventClick={openEdit}
            canEdit={canEdit}
            canDelete={canDelete}
            onDelete={handleDelete}
          />
        )}
      </div>

      {modalOpen && (
        <EventModal
          event={selectedEvent}
          defaultDate={defaultDate}
          users={teamUsers}
          onSave={handleSave}
          onClose={closeModal}
          canDelete={canDelete}
          onDelete={handleDelete}
        />
      )}
    </div>
  )
}