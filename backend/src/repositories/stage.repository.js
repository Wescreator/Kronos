const pool = require('../config/database')

const DEFAULT_STAGES = [
  { stage_name: 'Estudo Preliminar', stage_order: 1 },
  { stage_name: 'Projeto Básico',    stage_order: 2 },
  { stage_name: 'Ante Projeto',      stage_order: 3 },
  { stage_name: 'Executivo',         stage_order: 4 },
  { stage_name: 'Entrega Final',     stage_order: 5 },
]

// company_id é NOT NULL em project_stages — precisa ser passado explicitamente
// (não dá pra derivar só do projectId sem uma consulta extra).
const createDefaultStages = async (projectId, companyId) => {
  for (const stage of DEFAULT_STAGES) {
    await pool.query(
      `INSERT INTO project_stages (project_id, company_id, stage_name, stage_order) VALUES ($1,$2,$3,$4)`,
      [projectId, companyId, stage.stage_name, stage.stage_order]
    )
  }
}

const findStagesByProject = async (projectId) => {
  const { rows } = await pool.query(
    `SELECT * FROM project_stages WHERE project_id = $1 ORDER BY stage_order ASC`,
    [projectId]
  )
  return rows
}

const hasStages = async (projectId) => {
  const { rows } = await pool.query(
    `SELECT id FROM project_stages WHERE project_id = $1 LIMIT 1`,
    [projectId]
  )
  return rows.length > 0
}

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
     ORDER BY pph.created_at ASC`,
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

const createPhase = async ({ stageId, phaseName, comment, createdBy }) => {
  const { rows } = await pool.query(
    `INSERT INTO project_phases (project_stage_id, phase_name, comment, created_by)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [stageId, phaseName, comment || null, createdBy]
  )
  return rows[0]
}

const updatePhase = async (phaseId, { phaseName, comment, nowCompleted, wasCompleted, userId }) => {
  const { rows } = await pool.query(
    `UPDATE project_phases
        SET phase_name   = COALESCE($1, phase_name),
            comment      = COALESCE($2, comment),
            is_completed = COALESCE($3, is_completed),
            completed_by = CASE
              WHEN $3 = TRUE  AND $4 IS TRUE THEN $5
              WHEN $3 = FALSE THEN NULL
              ELSE completed_by
            END,
            completed_at = CASE
              WHEN $3 = TRUE  AND $4 IS TRUE THEN NOW()
              WHEN $3 = FALSE THEN NULL
              ELSE completed_at
            END,
            updated_at   = NOW()
      WHERE id = $6
      RETURNING *`,
    [
      phaseName  ?? null,
      comment    ?? null,
      nowCompleted !== undefined ? nowCompleted : null,
      !wasCompleted && nowCompleted,
      userId,
      phaseId,
    ]
  )
  return rows[0]
}

const deletePhase = async (phaseId) => {
  await pool.query(`DELETE FROM project_phases WHERE id = $1`, [phaseId])
}

// ── Resolucao de dono (empresa) para checagem de tenant ──────────
// Escopa via projects.company_id (fonte confiavel), nao pela coluna
// company_id das tabelas filhas (que pode estar nula em dados antigos).
const findStageOwner = async (stageId) => {
  const { rows } = await pool.query(
    `SELECT ps.id, ps.project_id, p.company_id
       FROM project_stages ps
       JOIN projects p ON p.id = ps.project_id
      WHERE ps.id = $1`,
    [stageId]
  )
  return rows[0] || null
}

const findPhaseOwner = async (phaseId) => {
  const { rows } = await pool.query(
    `SELECT pph.id, pph.project_stage_id, p.company_id
       FROM project_phases pph
       JOIN project_stages ps ON ps.id = pph.project_stage_id
       JOIN projects p        ON p.id = ps.project_id
      WHERE pph.id = $1`,
    [phaseId]
  )
  return rows[0] || null
}

module.exports = {DEFAULT_STAGES, createDefaultStages, findStagesByProject, hasStages, findPhasesByStageIds, findPhaseById, createPhase, updatePhase, deletePhase, findStageOwner, findPhaseOwner,}