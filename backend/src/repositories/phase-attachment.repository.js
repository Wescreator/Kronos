const pool = require('../config/database')

const findByPhaseIds = async (phaseIds) => {
  if (!phaseIds.length) return []
  const { rows } = await pool.query(
    `SELECT pa.*, u.name AS uploaded_by_name
       FROM phase_attachments pa
       INNER JOIN users u ON u.id = pa.uploaded_by
      WHERE pa.phase_id = ANY($1::uuid[])
      ORDER BY pa.created_at DESC`,
    [phaseIds]
  )
  return rows
}

// Usado ao excluir uma etapa inteira — precisa limpar do R2 os anexos de
// todas as fases dela antes do cascade no banco.
const findByStageId = async (stageId) => {
  const { rows } = await pool.query(
    `SELECT pa.*
       FROM phase_attachments pa
       INNER JOIN project_phases pph ON pph.id = pa.phase_id
      WHERE pph.project_stage_id = $1`,
    [stageId]
  )
  return rows
}

const create = async ({ phaseId, companyId, uploadedBy, fileName, fileSize, mimeType, objectKey, url }) => {
  const { rows } = await pool.query(
    `INSERT INTO phase_attachments (phase_id, company_id, uploaded_by, file_name, file_size, mime_type, object_key, url)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [phaseId, companyId, uploadedBy, fileName, fileSize, mimeType, objectKey, url]
  )
  return rows[0]
}

const remove = async (attachmentId) => {
  await pool.query(`DELETE FROM phase_attachments WHERE id = $1`, [attachmentId])
}

const findOwner = async (attachmentId) => {
  const { rows } = await pool.query(
    `SELECT pa.id, pa.uploaded_by, pa.object_key, p.id AS project_id, p.company_id
       FROM phase_attachments pa
       JOIN project_phases pph ON pph.id = pa.phase_id
       JOIN project_stages ps  ON ps.id = pph.project_stage_id
       JOIN projects p         ON p.id = ps.project_id
      WHERE pa.id = $1`,
    [attachmentId]
  )
  return rows[0] || null
}

module.exports = { findByPhaseIds, findByStageId, create, remove, findOwner }