const pool = require('../config/database')

// ───────── PROJECTS ─────────
const findAll = async ({ companyId, limit, offset, status, search }) => {
  const conditions = ['p.company_id = $1']
  const params = [companyId]
  if (status) {
    params.push(status)
    conditions.push(`p.status = $${params.length}`)
  }

  if (search) {
    params.push(`%${search}%`)
    conditions.push(`p.title ILIKE $${params.length}`)
  }

  params.push(limit, offset)

  const { rows } = await pool.query(
    `SELECT p.*
    FROM projects p
    WHERE ${conditions.join(' AND ')}
    ORDER BY p.created_at DESC
    LIMIT $${params.length - 1}
    OFFSET $${params.length}
    `,
    params
  )

  const { rows: count } = await pool.query(
    `
    SELECT COUNT(*)
    FROM projects p
    WHERE ${conditions.join(' AND ')}
    `,
    params.slice(0, -2)
  )

  return {
    rows,
    total: Number(count[0].count)
  }
}

const findStatusHistory = async (projectId, companyId) => {
  const { rows } = await pool.query(
    `
    SELECT *
    FROM project_status_history
    WHERE project_id = $1
      AND company_id = $2
    ORDER BY changed_at DESC
    `,
    [projectId, companyId]
  )

  return rows
}

const findById = async (id, companyId) => {
  const { rows } = await pool.query(
    `
    SELECT *
    FROM projects
    WHERE id = $1 AND company_id = $2
    `,
    [id, companyId]
  )

  return rows[0] || null
}

const create = async (data) => {
  const { rows } = await pool.query(
    `
    INSERT INTO projects (
      company_id,
      title,
      client,
      description,
      budget,
      start_date,
      expected_date,
      owner_id,
      created_by
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    RETURNING *
    `,
    [
      data.companyId,
      data.title,
      data.client,
      data.description,
      data.budget,
      data.startDate,
      data.expectedDate,
      data.ownerId,
      data.createdBy
    ]
  )

  return rows[0]
}

const update = async (id, companyId, fields) => {
  const keys = Object.keys(fields)
  const values = Object.values(fields)

  const sets = keys.map((k, i) => `${k} = $${i + 1}`).join(', ')
  values.push(id, companyId)

  const { rows } = await pool.query(
    `
    UPDATE projects
    SET ${sets}, updated_at = NOW()
    WHERE id = $${values.length - 1}
      AND company_id = $${values.length}
    RETURNING *
    `,
    values
  )

  return rows[0]
}

// Atualiza apenas a capa do projeto. Faltava neste repository — era a
// causa do erro ao trocar a capa (uploadCover chamava um método inexistente).
const updateCover = async (id, companyId, coverUrl) => {
  const { rows } = await pool.query(
    `
    UPDATE projects
    SET cover_url = $1, updated_at = NOW()
    WHERE id = $2 AND company_id = $3
    RETURNING *
    `,
    [coverUrl, id, companyId]
  )

  return rows[0]
}
// Adicionar membro ao projeto
const addMember = async (projectId, userId, role) => {
  const { rows } = await pool.query(
    `
    INSERT INTO project_members (project_id, user_id, role)
    VALUES ($1, $2, $3)
    RETURNING *
    `,
    [projectId, userId, role || 'member']
  )
  return rows[0]
}


const removeMember = async (projectId, userId) => {
  const { rowCount } = await pool.query(
    `DELETE FROM project_members 
     WHERE project_id = $1 AND user_id = $2`,
    [projectId, userId]
  )
  return rowCount > 0
}

// Adicionar histórico de status
const addStatusHistory = async (projectId, companyId, fromStatus, toStatus, changedBy, note) => {
  const { rows } = await pool.query(
    `
    INSERT INTO project_status_history 
    (project_id, company_id, from_status, to_status, changed_by, note)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
    `,
    [projectId, companyId, fromStatus, toStatus, changedBy, note]
  )
  return rows[0]
}

const findMembers = async (projectId) => {
  const { rows } = await pool.query(
    `
    SELECT pm.id, pm.role, pm.joined_at, u.name, u.email, u.avatar_url
    FROM project_members pm
    INNER JOIN users u ON u.id = pm.user_id
    WHERE pm.project_id = $1
    ORDER BY pm.joined_at ASC
    `,
    [projectId]
  )

  return rows
}

// Conta registros que impedem a exclusão do projeto (FKs sem CASCADE:
// tasks, expenses, revenues, clients_leads).
const countDependents = async (id) => {
  const { rows } = await pool.query(
    `
    SELECT
      (SELECT COUNT(*) FROM tasks         WHERE project_id = $1) AS tasks,
      (SELECT COUNT(*) FROM expenses      WHERE project_id = $1) AS expenses,
      (SELECT COUNT(*) FROM revenues      WHERE project_id = $1) AS revenues,
      (SELECT COUNT(*) FROM clients_leads WHERE project_id = $1) AS leads
    `,
    [id]
  )
  const r = rows[0]
  return {
    tasks:    Number(r.tasks),
    expenses: Number(r.expenses),
    revenues: Number(r.revenues),
    leads:    Number(r.leads),
  }
}

const remove = async (id, companyId) => {
  const { rowCount } = await pool.query(
    `DELETE FROM projects WHERE id = $1 AND company_id = $2`,
    [id, companyId]
  )
  return rowCount > 0
}

module.exports = {findAll, findById, create, update, updateCover, findStatusHistory, findMembers, addMember, removeMember, addStatusHistory, countDependents, remove}