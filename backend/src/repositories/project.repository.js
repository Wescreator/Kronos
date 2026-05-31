const pool = require('../config/database')

const findAll = async ({ limit, offset, status, search }) => {
  const conditions = []
  const params     = []

  if (status) {
    params.push(status)
    conditions.push(`p.status = $${params.length}`)
  }
  if (search) {
    params.push(`%${search}%`)
    conditions.push(`(p.title ILIKE $${params.length} OR p.client ILIKE $${params.length})`)
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  params.push(limit, offset)

  const { rows } = await pool.query(
    `SELECT p.*,
            u.name  AS owner_name,
            u.avatar_url AS owner_avatar,
            COUNT(DISTINCT pm.user_id)::int AS member_count
     FROM projects p
     LEFT JOIN users u          ON u.id = p.owner_id
     LEFT JOIN project_members pm ON pm.project_id = p.id
     ${where}
     GROUP BY p.id, u.name, u.avatar_url
     ORDER BY p.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  )

  const { rows: cnt } = await pool.query(
    `SELECT COUNT(*) FROM projects p ${where}`,
    params.slice(0, -2)
  )

  return { rows, total: parseInt(cnt[0].count) }
}

const findById = async (id) => {
  const { rows } = await pool.query(
    `SELECT p.*,
            u.name       AS owner_name,
            u.avatar_url AS owner_avatar,
            cb.name      AS created_by_name
     FROM projects p
     LEFT JOIN users u  ON u.id  = p.owner_id
     LEFT JOIN users cb ON cb.id = p.created_by
     WHERE p.id = $1`,
    [id]
  )
  return rows[0] || null
}

const findMembers = async (projectId) => {
  const { rows } = await pool.query(
    `SELECT u.id, u.name, u.email, u.avatar_url, u.position, pm.role, pm.joined_at
     FROM project_members pm
     JOIN users u ON u.id = pm.user_id
     WHERE pm.project_id = $1
     ORDER BY u.name`,
    [projectId]
  )
  return rows
}

const create = async ({ title, client, description, budget, startDate, expectedDate, ownerId, createdBy }) => {
  const { rows } = await pool.query(
    `INSERT INTO projects
       (title, client, description, budget, start_date, expected_date, owner_id, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING *`,
    [title, client, description, budget, startDate, expectedDate, ownerId, createdBy]
  )
  return rows[0]
}

const update = async (id, fields) => {
  const keys   = Object.keys(fields)
  const values = Object.values(fields)
  const sets   = keys.map((k, i) => `${k} = $${i + 1}`).join(', ')
  values.push(id)

  const { rows } = await pool.query(
    `UPDATE projects SET ${sets}, updated_at = NOW()
     WHERE id = $${values.length} RETURNING *`,
    values
  )
  return rows[0]
}

const addMember = async (projectId, userId, role = 'member') => {
  await pool.query(
    `INSERT INTO project_members (project_id, user_id, role)
     VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
    [projectId, userId, role]
  )
}

const removeMember = async (projectId, userId) => {
  await pool.query(
    'DELETE FROM project_members WHERE project_id = $1 AND user_id = $2',
    [projectId, userId]
  )
}

const addStatusHistory = async (projectId, fromStatus, toStatus, changedBy, note) => {
  await pool.query(
    `INSERT INTO project_status_history (project_id, from_status, to_status, changed_by, note)
     VALUES ($1,$2,$3,$4,$5)`,
    [projectId, fromStatus, toStatus, changedBy, note]
  )
}

const findStatusHistory = async (projectId) => {
  const { rows } = await pool.query(
    `SELECT psh.*, u.name AS changed_by_name
     FROM project_status_history psh
     JOIN users u ON u.id = psh.changed_by
     WHERE psh.project_id = $1
     ORDER BY psh.changed_at DESC`,
    [projectId]
  )
  return rows
}

const updateCover = async (id, coverUrl) => {
  const { rows } = await pool.query(
    'UPDATE projects SET cover_url = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
    [coverUrl, id]
  )
  return rows[0]
}

module.exports = {
  findAll, findById, findMembers, create, update,
  addMember, removeMember, addStatusHistory, findStatusHistory, updateCover
}