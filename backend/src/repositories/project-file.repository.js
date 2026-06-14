const pool = require('../config/database')

const create = async ({ projectId, uploadedBy, fileName, fileSize, mimeType, driveFileId, driveUrl }) => {
  const { rows } = await pool.query(
    `INSERT INTO project_files
       (project_id, uploaded_by, file_name, file_size, mime_type, drive_file_id, drive_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [projectId, uploadedBy, fileName, fileSize, mimeType, driveFileId, driveUrl]
  )
  return rows[0]
}

const findByProject = async (projectId) => {
  const { rows } = await pool.query(
    `SELECT pf.*, u.name AS uploaded_by_name
     FROM project_files pf
     JOIN users u ON u.id = pf.uploaded_by
     WHERE pf.project_id = $1
     ORDER BY pf.created_at DESC`,
    [projectId]
  )
  return rows
}

module.exports = { create, findByProject }