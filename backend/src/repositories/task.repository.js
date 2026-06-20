const pool = require('../config/database')

const findAll = async ({ companyId, limit, offset, status, priority, projectId, userId }) => {
  const conditions = ['t.company_id = $1']
  const params     = [companyId]

  if (status)    { params.push(status);    conditions.push(`t.status = $${params.length}`) }
  if (priority)  { params.push(priority);  conditions.push(`t.priority = $${params.length}`) }
  if (projectId) { params.push(projectId); conditions.push(`t.project_id = $${params.length}`) }
  if (userId)    { params.push(userId);    conditions.push(`ta.user_id = $${params.length}`) }

  const where = `WHERE ${conditions.join(' AND ')}`
  params.push(limit, offset)

  const { rows } = await pool.query(
    `SELECT DISTINCT t.*,
            p.title AS project_title,
            u.name  AS created_by_name,
            ARRAY_AGG(DISTINCT jsonb_build_object('id', au.id, 'name', au.name, 'avatar_url', au.avatar_url))
              FILTER (WHERE au.id IS NOT NULL) AS assignees
     FROM tasks t
     LEFT JOIN projects p          ON p.id = t.project_id
     LEFT JOIN users u             ON u.id = t.created_by
     LEFT JOIN task_assignments ta ON ta.task_id = t.id
     LEFT JOIN users au            ON au.id = ta.user_id
     ${where}
     GROUP BY t.id, p.title, u.name
     ORDER BY t.created_at DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  )

  const { rows: cnt } = await pool.query(
    `SELECT COUNT(DISTINCT t.id) FROM tasks t
     LEFT JOIN task_assignments ta ON ta.task_id = t.id
     ${where}`,
    params.slice(0, -2)
  )

  return { rows, total: parseInt(cnt[0].count) }
}

const findById = async (id, companyId) => {
  const { rows } = await pool.query(
    `SELECT t.*,
            p.title AS project_title,
            u.name  AS created_by_name,
            ARRAY_AGG(DISTINCT jsonb_build_object('id', au.id, 'name', au.name, 'avatar_url', au.avatar_url))
              FILTER (WHERE au.id IS NOT NULL) AS assignees
     FROM tasks t
     LEFT JOIN projects p          ON p.id = t.project_id
     LEFT JOIN users u             ON u.id = t.created_by
     LEFT JOIN task_assignments ta ON ta.task_id = t.id
     LEFT JOIN users au            ON au.id = ta.user_id
     WHERE t.id = $1 AND t.company_id = $2
     GROUP BY t.id, p.title, u.name`,
    [id, companyId]
  )
  return rows[0] || null
}

const create = async ({ companyId, title, description, projectId, priority, dueDate, createdBy }) => {
  const { rows } = await pool.query(
    `INSERT INTO tasks (company_id, title, description, project_id, priority, due_date, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [companyId, title, description, projectId, priority, dueDate, createdBy]
  )
  return rows[0]
}

const update = async (id, companyId, fields) => {
  const keys   = Object.keys(fields)
  const values = Object.values(fields)
  const sets   = keys.map((k, i) => `${k} = $${i + 1}`).join(', ')
  values.push(id, companyId)

  const { rows } = await pool.query(
    `UPDATE tasks SET ${sets}, updated_at = NOW()
     WHERE id = $${values.length - 1} AND company_id = $${values.length} RETURNING *`,
    values
  )
  return rows[0]
}

const setAssignees = async (taskId, userIds) => {
  await pool.query('DELETE FROM task_assignments WHERE task_id = $1', [taskId])
  for (const uid of userIds) {
    await pool.query(
      'INSERT INTO task_assignments (task_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
      [taskId, uid]
    )
  }
}

const findComments = async (taskId) => {
  const { rows } = await pool.query(
    `SELECT tc.*, u.name AS user_name, u.avatar_url
     FROM task_comments tc
     JOIN users u ON u.id = tc.user_id
     WHERE tc.task_id = $1
     ORDER BY tc.created_at ASC`,
    [taskId]
  )
  return rows
}

const addComment = async (taskId, userId, content, fileUrl) => {
  const { rows } = await pool.query(
    `INSERT INTO task_comments (task_id, user_id, content, file_url)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [taskId, userId, content, fileUrl]
  )
  return rows[0]
}

const getDashboardStats = async (companyId) => {
  const { rows } = await pool.query(`
    SELECT
      COUNT(*)                                            AS total,
      COUNT(*) FILTER (WHERE status = 'open')            AS open,
      COUNT(*) FILTER (WHERE status = 'in_progress')     AS in_progress,
      COUNT(*) FILTER (WHERE status = 'completed')       AS completed,
      COUNT(*) FILTER (WHERE due_date < NOW()
        AND status NOT IN ('completed','cancelled'))      AS overdue
    FROM tasks
    WHERE company_id = $1
  `, [companyId])
  return rows[0]
}

module.exports = { findAll, findById, create, update, setAssignees, findComments, addComment, getDashboardStats }
