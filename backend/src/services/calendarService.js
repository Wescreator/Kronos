// backend/services/calendarService.js
// Módulo Agenda — Kronos (multi-tenant)

const repo = require('../repositories/calendarRepository');

function validateDates(start_date, end_date) {
  const s = new Date(start_date);
  const e = new Date(end_date);
  if (isNaN(s.getTime())) throw new Error('start_date inválido');
  if (isNaN(e.getTime())) throw new Error('end_date inválido');
  if (e < s) throw new Error('end_date deve ser após start_date');
}

async function getAll(companyId, query) {
  return repo.findAll({ companyId, ...query });
}

async function getById(id, companyId) {
  const event = await repo.findById(id, companyId);
  if (!event) throw new Error('Evento não encontrado');
  return event;
}

async function getByMonth(companyId, year, month) {
  if (!year || !month) throw new Error('year e month são obrigatórios');
  return repo.findByMonth(companyId, Number(year), Number(month));
}

async function getByWeek(companyId, startOfWeek, endOfWeek) {
  if (!startOfWeek || !endOfWeek) throw new Error('startOfWeek e endOfWeek são obrigatórios');
  return repo.findByWeek(companyId, startOfWeek, endOfWeek);
}

async function getAgenda(companyId, fromDate) {
  const date = fromDate || new Date().toISOString();
  return repo.findAgenda(companyId, date);
}

async function createEvent(data, createdBy, companyId) {
  const { title, description, start_date, end_date, location, color, status, user_id } = data;

  if (!title?.trim()) throw new Error('Título é obrigatório');
  validateDates(start_date, end_date);

  return repo.create({
    companyId,
    title: title.trim(),
    description: description || null,
    start_date,
    end_date,
    location: location || null,
    color: color || '#4A90E2',
    status: status || 'scheduled',
    user_id: user_id || null,
    created_by: createdBy,
  });
}

async function updateEvent(id, data, companyId) {
  await getById(id, companyId); // garante que existe e pertence à empresa

  if (data.start_date && data.end_date) {
    validateDates(data.start_date, data.end_date);
  }

  return repo.update(id, companyId, data);
}

async function deleteEvent(id, companyId) {
  const deleted = await repo.remove(id, companyId);
  if (!deleted) throw new Error('Evento não encontrado');
  return deleted;
}

module.exports = { getAll, getById, getByMonth, getByWeek, getAgenda, createEvent, updateEvent, deleteEvent };
