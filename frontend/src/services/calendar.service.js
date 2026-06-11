// frontend/services/calendar.service.js
// Módulo Agenda — Kronos

const API_URL = import.meta.env.VITE_API_URL;

function authHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

async function handleResponse(res) {
  if (res.status === 204) return null;
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erro na requisição');
  return data;
}

export async function getEventsByMonth(year, month) {
  const res = await fetch(
    `${API_URL}/calendar/month?year=${year}&month=${month}`,
    { headers: authHeaders() }
  );
  return handleResponse(res);
}

export async function getEventsByWeek(startOfWeek, endOfWeek) {
  const res = await fetch(
    `${API_URL}/calendar/week?startOfWeek=${startOfWeek}&endOfWeek=${endOfWeek}`,
    { headers: authHeaders() }
  );
  return handleResponse(res);
}

export async function getAgendaEvents(fromDate) {
  const from = fromDate || new Date().toISOString();
  const res = await fetch(
    `${API_URL}/calendar/agenda?fromDate=${from}`,
    { headers: authHeaders() }
  );
  return handleResponse(res);
}

export async function getEventById(id) {
  const res = await fetch(`${API_URL}/calendar/${id}`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function createEvent(data) {
  const res = await fetch(`${API_URL}/calendar`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function updateEvent(id, data) {
  const res = await fetch(`${API_URL}/calendar/${id}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function deleteEvent(id) {
  const res = await fetch(`${API_URL}/calendar/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  return handleResponse(res);
}