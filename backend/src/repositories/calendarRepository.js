// backend/repositories/calendarRepository.js
// Módulo Agenda — Kronos
// ADITIVO: não altera nenhum outro repositório

const { pool } = require('../config/database'); // ajuste ao import real do projeto

// ─── helpers ────────────────────────────────────────────────────────────────

const BASE_SELECT = `
  SELECT
    ce.*,
    u.name  AS responsible_name,
    u.email AS responsible_email,
    cb.name AS created_by_name
  FROM calendar_events ce
  LEFT JOIN users u  ON u.id  = ce.user_id
  LEFT JOIN users cb ON cb.id = ce.created_by
`;

// ─── queries ─────────────────────────────────────────────────────────────────

async function findAll({ startDate, endDate } = {}) {
  let query = BASE_SELECT;
  const params = [];

  if (startDate && endDate) {
    query += `
      WHERE ce.start_date >= $1
        AND ce.start_date <= $2
    `;
    params.push(startDate, endDate);
  }

  query += ' ORDER BY ce.start_date ASC';
  const { rows } = await pool.query(query, params);
  return rows;
}

async function findById(id) {
  const { rows } = await pool.query(
    `${BASE_SELECT} WHERE ce.id = $1`,
    [id]
  );
  return rows[0] || null;
}

async function findByMonth(year, month) {
  const start = new Date(year, month - 1, 1).toISOString();
  const end   = new Date(year, month, 0, 23, 59, 59).toISOString();
  return findAll({ startDate: start, endDate: end });
}

async function findByWeek(startOfWeek, endOfWeek) {
  return findAll({ startDate: startOfWeek, endDate: endOfWeek });
}

async function findAgenda(fromDate) {
  const { rows } = await pool.query(
    `${BASE_SELECT}
     WHERE ce.start_date >= $1
     ORDER BY ce.start_date ASC
     LIMIT 50`,
    [fromDate]
  );
  return rows;
}

async function create({ title, description, start_date, end_date, location, color, status, user_id, created_by }) {
  const { rows } = await pool.query(
    `INSERT INTO calendar_events
       (title, description, start_date, end_date, location, color, status, user_id, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING *`,
    [title, description, start_date, end_date, location, color, status, user_id, created_by]
  );
  return rows[0];
}

async function update(id, { title, description, start_date, end_date, location, color, status, user_id }) {
  const fields = [];
  const values = [];
  let idx = 1;

  const add = (col, val) => { if (val !== undefined) { fields.push(`${col} = $${idx++}`); values.push(val); } };

  add('title',       title);
  add('description', description);
  add('start_date',  start_date);
  add('end_date',    end_date);
  add('location',    location);
  add('color',       color);
  add('status',      status);
  add('user_id',     user_id);

  if (fields.length === 0) return findById(id);

  values.push(id);
  const { rows } = await pool.query(
    `UPDATE calendar_events SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  );
  return rows[0];
}

async function remove(id) {
  const { rows } = await pool.query(
    'DELETE FROM calendar_events WHERE id = $1 RETURNING id',
    [id]
  );
  return rows[0] || null;
}

module.exports = {
  findAll,
  findById,
  findByMonth,
  findByWeek,
  findAgenda,
  create,
  update,
  remove,
};