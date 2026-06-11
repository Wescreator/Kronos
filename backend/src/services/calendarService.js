// backend/services/calendarService.js
// Módulo Agenda — Kronos

const repo = require('../repositories/calendarRepository');

function validateDates(start_date, end_date) {
  const s = new Date(start_date);
  const e = new Date(end_date);
  if (isNaN(s.getTime())) throw new Error('start_date inválido');
  if (isNaN(e.getTime())) throw new Error('end_date inválido');
  if (e < s) throw new Error('end_date deve ser após start_date');
}

async function getAll(query) {
  return repo.findAll(query);
}

async function getById(id) {
  const event = await repo.findById(id);
  if (!event) throw new Error('Evento não encontrado');
  return event;
}

async function getByMonth(year, month) {
  if (!year || !month) throw new Error('year e month são obrigatórios');
  return repo.findByMonth(Number(year), Number(month));
}

async function getByWeek(startOfWeek, endOfWeek) {
  if (!startOfWeek || !endOfWeek) throw new Error('startOfWeek e endOfWeek são obrigatórios');
  return repo.findByWeek(startOfWeek, endOfWeek);
}

async function getAgenda(fromDate) {
  const date = fromDate || new Date().toISOString();
  return repo.findAgenda(date);
}

async function createEvent(data, created_by) {
  const { title, description, start_date, end_date, location, color, status, user_id } = data;

  if (!title?.trim()) throw new Error('Título é obrigatório');
  validateDates(start_date, end_date);

  return repo.create({
    title: title.trim(),
    description: description || null,
    start_date,
    end_date,
    location: location || null,
    color: color || '#4A90E2',
    status: status || 'scheduled',
    user_id: user_id || null,
    created_by,
  });
}

async function updateEvent(id, data) {
  await getById(id); // garante que existe

  if (data.start_date && data.end_date) {
    validateDates(data.start_date, data.end_date);
  }

  return repo.update(id, data);
}

async function deleteEvent(id) {
  const deleted = await repo.remove(id);
  if (!deleted) throw new Error('Evento não encontrado');
  return deleted;
}

module.exports = {
  getAll,
  getById,
  getByMonth,
  getByWeek,
  getAgenda,
  createEvent,
  updateEvent,
  deleteEvent,
};