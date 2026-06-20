const calendarService = require('../services/calendarService')
const R = require('../utils/response')

// Toda a Agenda e isolada pela empresa do usuario (req.user.company_id).
const getAll = async (req, res) => {
  try {
    const { startDate, endDate } = req.query
    const events = await calendarService.getAll(req.user.company_id, { startDate, endDate })
    return R.success(res, { events })
  } catch (err) {
    return R.error(res, err.message, err.status || 500)
  }
}

const getByMonth = async (req, res) => {
  try {
    const { year, month } = req.query
    const events = await calendarService.getByMonth(req.user.company_id, year, month)
    return R.success(res, { events })
  } catch (err) {
    return R.error(res, err.message, err.status || 500)
  }
}

const getByWeek = async (req, res) => {
  try {
    const { startOfWeek, endOfWeek } = req.query
    const events = await calendarService.getByWeek(req.user.company_id, startOfWeek, endOfWeek)
    return R.success(res, { events })
  } catch (err) {
    return R.error(res, err.message, err.status || 500)
  }
}

const getAgenda = async (req, res) => {
  try {
    const { fromDate } = req.query
    const events = await calendarService.getAgenda(req.user.company_id, fromDate)
    return R.success(res, { events })
  } catch (err) {
    return R.error(res, err.message, err.status || 500)
  }
}

const getById = async (req, res) => {
  try {
    const event = await calendarService.getById(req.params.id, req.user.company_id)
    if (!event) {
      return R.notFound(res, 'Evento não encontrado')
    }
    return R.success(res, { event })
  } catch (err) {
    return R.error(res, err.message, err.status || 500)
  }
}

const create = async (req, res) => {
  try {
    const event = await calendarService.createEvent(req.body, req.user.user_id, req.user.company_id)
    return R.created(res, { event })
  } catch (err) {
    return R.error(res, err.message, err.status || 500)
  }
}

const update = async (req, res) => {
  try {
    const event = await calendarService.updateEvent(req.params.id, req.body, req.user.company_id)
    return R.success(res, { event })
  } catch (err) {
    return R.error(res, err.message, err.status || 500)
  }
}

const remove = async (req, res) => {
  try {
    await calendarService.deleteEvent(req.params.id, req.user.company_id)
    return R.success(res, { message: 'Evento removido com sucesso.' })
  } catch (err) {
    return R.error(res, err.message, err.status || 500)
  }
}

module.exports = { getAll, getByMonth, getByWeek, getAgenda, getById, create, update, remove }
