const pool = require('../config/database')

// ───────── ETAPAS (project_stages) ─────────

const findStagesByProject = async (projectId) => {
  const { rows } = await pool.query(
    `SELECT * FROM project_stages WHERE project_id = $1 ORDER BY stage_order ASC`,
    [projectId]
  )
  return rows
}

const findStageById = async (stageId) => {
  const { rows } = await pool.query(`SELECT * FROM project_stages WHERE id = $1`, [stageId])
  return rows[0] || null
}

const createStage = async ({ projectId, companyId, stageName, createdBy }) => {
  const { rows: maxRows } = await pool.query(
    `SELECT COALESCE(MAX(stage_order), 0) AS max_order FROM project_stages WHERE project_id = $1`,
    [projectId]
  )
  const nextOrder = Number(maxRows[0].max_order) + 1

  const { rows } = await pool.query(
    `INSERT INTO project_stages (project_id, company_id, stage_name, stage_order, created_by)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [projectId, companyId, stageName, nextOrder, createdBy]
  )
  return rows[0]
}

const updateStage = async (stageId, stageName) => {
  const { rows } = await pool.query(
    `UPDATE project_stages SET stage_name = $1 WHERE id = $2 RETURNING *`,
    [stageName, stageId]
  )
  return rows[0]
}

const deleteStage = async (stageId) => {
  await pool.query(`DELETE FROM project_stages WHERE id = $1`, [stageId])
}

const reorderStages = async (projectId, companyId, orderedIds) => {
  await Promise.all(orderedIds.map((stageId, index) =>
    pool.query(
      `UPDATE project_stages SET stage_order = $1 WHERE id = $2 AND project_id = $3 AND company_id = $4`,
      [index + 1, stageId, projectId, companyId]
    )
  ))
}

// ───────── FASES (project_phases) ─────────

const findPhasesByStageIds = async (stageIds) => {
  if (!stageIds.length) return []
  const { rows } = await pool.query(
    `SELECT pph.*,
            u.name  AS created_by_name,
            cu.name AS completed_by_name
     FROM project_phases pph
     LEFT JOIN users u  ON u.id  = pph.created_by
     LEFT JOIN users cu ON cu.id = pph.completed_by
     WHERE pph.project_stage_id = ANY($1::uuid[])
     ORDER BY pph.phase_order ASC, pph.created_at ASC`,
    [stageIds]
  )
  return rows
}

const findPhaseById = async (phaseId) => {
  const { rows } = await pool.query(
    `SELECT * FROM project_phases WHERE id = $1`,
    [phaseId]
  )
  return rows[0] || null
}

const createPhase = async ({ stageId, phaseName, createdBy, companyId }) => {
  const { rows: maxRows } = await pool.query(
    `SELECT COALESCE(MAX(phase_order), 0) AS max_order FROM project_phases WHERE project_stage_id = $1`,
    [stageId]
  )
  const nextOrder = Number(maxRows[0].max_order) + 1

  const { rows } = await pool.query(
    `INSERT INTO project_phases (project_stage_id, phase_name, created_by, company_id, phase_order)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [stageId, phaseName, createdBy, companyId, nextOrder]
  )
  return rows[0]
}

// fields aceitos: { phaseName?, isCompleted?, completedBy?, completedAt? }
const updatePhase = async (phaseId, fields) => {
  const sets   = []
  const values = []
  let i = 1

  if (fields.phaseName !== undefined)   { sets.push(`phase_name = $${i++}`);   values.push(fields.phaseName) }
  if (fields.isCompleted !== undefined) { sets.push(`is_completed = $${i++}`); values.push(fields.isCompleted) }
  if (fields.completedBy !== undefined) { sets.push(`completed_by = $${i++}`); values.push(fields.completedBy) }
  if (fields.completedAt !== undefined) { sets.push(`completed_at = $${i++}`); values.push(fields.completedAt) }
  sets.push(`updated_at = NOW()`)

  values.push(phaseId)
  const { rows } = await pool.query(
    `UPDATE project_phases SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
    values
  )
  return rows[0]
}

const deletePhase = async (phaseId) => {
  await pool.query(`DELETE FROM project_phases WHERE id = $1`, [phaseId])
}

const reorderPhases = async (stageId, companyId, orderedIds) => {
  await Promise.all(orderedIds.map((phaseId, index) =>
    pool.query(
      `UPDATE project_phases SET phase_order = $1, updated_at = NOW() WHERE id = $2 AND project_stage_id = $3 AND company_id = $4`,
      [index + 1, phaseId, stageId, companyId]
    )
  ))
}

// ── Resolucao de dono (empresa/projeto) para checagem de tenant/membro ──
// Escopa via projects.company_id (fonte confiavel), nao pela coluna
// company_id das tabelas filhas (que pode estar nula em dados antigos).
const findStageOwner = async (stageId) => {
  const { rows } = await pool.query(
    `SELECT ps.id, ps.project_id, ps.created_by, p.company_id
       FROM project_stages ps
       JOIN projects p ON p.id = ps.project_id
      WHERE ps.id = $1`,
    [stageId]
  )
  return rows[0] || null
}

const findPhaseOwner = async (phaseId) => {
  const { rows } = await pool.query(
    `SELECT pph.id, pph.project_stage_id, pph.created_by, p.id AS project_id, p.company_id
       FROM project_phases pph
       JOIN project_stages ps ON ps.id = pph.project_stage_id
       JOIN projects p        ON p.id = ps.project_id
      WHERE pph.id = $1`,
    [phaseId]
  )
  return rows[0] || null
}

module.exports = {
  findStagesByProject, findStageById, createStage, updateStage, deleteStage, reorderStages,
  findPhasesByStageIds, findPhaseById, createPhase, updatePhase, deletePhase, reorderPhases,
  findStageOwner, findPhaseOwner,
}