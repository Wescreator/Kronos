const pool = require('../config/database')

const create = async ({
  projectId, uploadedBy, fileName, fileSize, mimeType, driveFileId, driveUrl,

  /*
    Preparação para Multi-Tenant.
    Ainda não utilizado enquanto a migration
    não adicionar company_id.
  */
  company_id = null
}) => {
  const { rows } = await pool.query(
    `INSERT INTO project_files (project_id, uploaded_by, file_name, file_size, mime_type, drive_file_id, drive_url) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *
    `,
    [projectId, uploadedBy, fileName, fileSize, mimeType, driveFileId, driveUrl]
  )

  return rows[0]
}

const findByProject = async (projectId, companyId) => {
  const params = [projectId]
  let where = 'WHERE pf.project_id = $1'
if (companyId) {
    params.push(companyId)
    where += ` AND pf.company_id = $2`}

  const { rows } = await pool.query(
    `SELECT pf.*, u.name AS uploaded_by_name FROM project_files pf INNER JOIN users u ON u.id = pf.uploaded_by ${where} ORDER BY pf.created_at DESC`, params)
  return rows
}

const findById = async (fileId) => {
  const { rows } = await pool.query(`SELECT * FROM project_files WHERE id = $1`, [fileId])
  return rows[0] || null
}

const deleteById = async (fileId) => {
  const { rowCount } = await pool.query(`DELETE FROM project_files WHERE id = $1`, [fileId])
  return rowCount > 0
}

module.exports = {
  create,
  findByProject,
  findById,
  deleteById
}