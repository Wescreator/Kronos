// backend/repositories/calendarRepository.js
// Módulo Agenda — Kronos
// Multi-tenant: todas as consultas sao escopadas por company_id.

const pool = require('../config/database');

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

async function findAll({ companyId, startDate, endDate } = {}) {
  let query = `${BASE_SELECT} WHERE ce.company_id = $1`;
  const params = [companyId];

  if (startDate && endDate) {
    params.push(startDate, endDate);
    query += ` AND ce.start_date >= $2 AND ce.start_date <= $3`;
  }

  query += ' ORDER BY ce.start_date ASC';
  const { rows } = await pool.query(query, params);
  return rows;
}

async function findById(id, companyId) {
  const { rows } = await pool.query(
    `${BASE_SELECT} WHERE ce.id = $1 AND ce.company_id = $2`,
    [id, companyId]
  );
  return rows[0] || null;
}

async function findByMonth(companyId, year, month) {
  const start = new Date(year, month - 1, 1).toISOString();
  const end   = new Date(year, month, 0, 23, 59, 59).toISOString();
  return findAll({ companyId, startDate: start, endDate: end });
}

async function findByWeek(companyId, startOfWeek, endOfWeek) {
  return findAll({ companyId, startDate: startOfWeek, endDate: endOfWeek });
}

async function findAgenda(companyId, fromDate) {
  const { rows } = await pool.query(
    `${BASE_SELECT}
     WHERE ce.company_id = $1
       AND ce.start_date >= $2
     ORDER BY ce.start_date ASC
     LIMIT 50`,
    [companyId, fromDate]
  );
  return rows;
}

async function create({ companyId, title, description, start_date, end_date, location, color, status, user_id, created_by }) {
  const { rows } = await pool.query(
    `INSERT INTO calendar_events
       (company_id, title, description, start_date, end_date, location, color, status, user_id, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING *`,
    [companyId, title, description, start_date, end_date, location, color, status, user_id, created_by]
  );
  return rows[0];
}

async function update(id, companyId, { title, description, start_date, end_date, location, color, status, user_id }) {
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

  if (fields.length === 0) return findById(id, companyId);

  values.push(id);
  values.push(companyId);
  const { rows } = await pool.query(
    `UPDATE calendar_events SET ${fields.join(', ')}
      WHERE id = $${idx++} AND company_id = $${idx}
      RETURNING *`,
    values
  );
  return rows[0];
}

async function remove(id, companyId) {
  const { rows } = await pool.query(
    'DELETE FROM calendar_events WHERE id = $1 AND company_id = $2 RETURNING id',
    [id, companyId]
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
