const pool = require('../config/database')
const R    = require('../utils/response')

const DEFAULT_STAGES = [
  { stage_name: 'Estudo Preliminar', stage_order: 1 },
  { stage_name: 'Projeto Básico',    stage_order: 2 },
  { stage_name: 'Ante Projeto',      stage_order: 3 },
  { stage_name: 'Executivo',         stage_order: 4 },
  { stage_name: 'Entrega Final',     stage_order: 5 },
]

// Garante que o projeto tem as 5 etapas padrão
async function ensureStages(projectId) {
  const { rows } = await pool.query(
    'SELECT id FROM project_stages WHERE project_id = $1',
    [projectId]
  )
  if (rows.length === 0) {
    for (const s of DEFAULT_STAGES) {
      await pool.query(
        'INSERT INTO project_stages (project_id, stage_name, stage_order) VALUES ($1,$2,$3)',
        [projectId, s.stage_name, s.stage_order]
      )
    }
  }
}

const getStages = async (req, res) => {
  try {
    const projectId = req.params.id
    await ensureStages(projectId)

    const { rows: stages } = await pool.query(
      `SELECT * FROM project_stages
       WHERE project_id = $1
       ORDER BY stage_order ASC`,
      [projectId]
    )

    // Busca fases de todas as etapas de uma vez
    const stageIds = stages.map(s => s.id)
    let phases = []
    if (stageIds.length > 0) {
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
      phases = rows
    }

    // Agrupa fases por etapa
    const result = stages.map(stage => ({
      ...stage,
      phases: phases.filter(ph => ph.project_stage_id === stage.id)
    }))

    return R.success(res, { stages: result })
  } catch (err) {
    return R.error(res, err.message)
  }
}

const addPhase = async (req, res) => {
  try {
    const { stageId } = req.params
    const { phase_name, comment } = req.body

    if (!phase_name?.trim()) {
      return R.badRequest(res, 'Nome da fase é obrigatório')
    }

    const { rows } = await pool.query(
      `INSERT INTO project_phases (project_stage_id, phase_name, comment, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [stageId, phase_name.trim(), comment || null, req.user.id]
    )
    return R.created(res, { phase: rows[0] })
  } catch (err) {
    return R.error(res, err.message)
  }
}

const updatePhase = async (req, res) => {
  try {
    const { phaseId } = req.params
    const { phase_name, comment, is_completed } = req.body

    const current = await pool.query(
      'SELECT * FROM project_phases WHERE id = $1',
      [phaseId]
    )
    if (!current.rows[0]) return R.notFound(res, 'Fase não encontrada')

    const wasCompleted = current.rows[0].is_completed
    const nowCompleted = is_completed === true || is_completed === 'true'

    const { rows } = await pool.query(
      `UPDATE project_phases SET
        phase_name   = COALESCE($1, phase_name),
        comment      = COALESCE($2, comment),
        is_completed = COALESCE($3, is_completed),
        completed_by = CASE
          WHEN $3 = TRUE AND $4 IS TRUE THEN $5
          WHEN $3 = FALSE THEN NULL
          ELSE completed_by
        END,
        completed_at = CASE
          WHEN $3 = TRUE AND $4 IS TRUE THEN NOW()
          WHEN $3 = FALSE THEN NULL
          ELSE completed_at
        END,
        updated_at   = NOW()
       WHERE id = $6
       RETURNING *`,
      [
        phase_name   ?? null,
        comment      ?? null,
        is_completed !== undefined ? nowCompleted : null,
        !wasCompleted && nowCompleted,
        req.user.id,
        phaseId
      ]
    )
    return R.success(res, { phase: rows[0] })
  } catch (err) {
    return R.error(res, err.message)
  }
}

const deletePhase = async (req, res) => {
  try {
    const { phaseId } = req.params
    await pool.query('DELETE FROM project_phases WHERE id = $1', [phaseId])
    return R.success(res, { message: 'Fase removida' })
  } catch (err) {
    return R.error(res, err.message)
  }
}

module.exports = { getStages, addPhase, updatePhase, deletePhase }