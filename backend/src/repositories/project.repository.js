const ctrl        = require('../controllers/project.controller')
const stageCtrl   = require('../controllers/stage.controller')
const fileCtrl    = require('../controllers/project-file.controller')
const { authenticate } = require('../middlewares/auth.middleware')
const tenantMiddleware = require('../middlewares/tenant.middleware')
const validate    = require('../middlewares/validate.middleware')
const V           = require('../validators/project.validator')
const { uploadImage, uploadFile } = require('../config/multer')
const logger      = require('../middlewares/logger.middleware')

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
    ORDER BY created_at DESC
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

module.exports = {findAll, findById, create, update, findStatusHistory}