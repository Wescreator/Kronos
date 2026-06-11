// backend/controllers/calendarController.js
// Módulo Agenda — Kronos

const service = require('../services/calendarService');

function handleError(res, err) {
  const status = err.message?.includes('não encontrado') ? 404 : 400;
  return res.status(status).json({ error: err.message });
}

// GET /calendar
async function getAll(req, res) {
  try {
    const { startDate, endDate } = req.query;
    const events = await service.getAll({ startDate, endDate });
    return res.json(events);
  } catch (err) {
    handleError(res, err);
  }
}

// GET /calendar/month?year=2026&month=6
async function getByMonth(req, res) {
  try {
    const { year, month } = req.query;
    const events = await service.getByMonth(year, month);
    return res.json(events);
  } catch (err) {
    handleError(res, err);
  }
}

// GET /calendar/week?startOfWeek=...&endOfWeek=...
async function getByWeek(req, res) {
  try {
    const { startOfWeek, endOfWeek } = req.query;
    const events = await service.getByWeek(startOfWeek, endOfWeek);
    return res.json(events);
  } catch (err) {
    handleError(res, err);
  }
}

// GET /calendar/agenda?fromDate=...
async function getAgenda(req, res) {
  try {
    const { fromDate } = req.query;
    const events = await service.getAgenda(fromDate);
    return res.json(events);
  } catch (err) {
    handleError(res, err);
  }
}

// GET /calendar/:id
async function getById(req, res) {
  try {
    const event = await service.getById(req.params.id);
    return res.json(event);
  } catch (err) {
    handleError(res, err);
  }
}

// POST /calendar
async function create(req, res) {
  try {
    const event = await service.createEvent(req.body, req.user.id);
    return res.status(201).json(event);
  } catch (err) {
    handleError(res, err);
  }
}

// PATCH /calendar/:id
async function update(req, res) {
  try {
    const event = await service.updateEvent(req.params.id, req.body);
    return res.json(event);
  } catch (err) {
    handleError(res, err);
  }
}

// DELETE /calendar/:id
async function remove(req, res) {
  try {
    await service.deleteEvent(req.params.id);
    return res.status(204).send();
  } catch (err) {
    handleError(res, err);
  }
}

module.exports = { getAll, getByMonth, getByWeek, getAgenda, getById, create, update, remove };