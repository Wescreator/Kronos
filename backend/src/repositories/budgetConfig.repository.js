// backend/src/repositories/budgetConfig.repository.js
const pool = require('../config/database')

// ── Busca (ou cria) a config única da empresa, com títulos/níveis/taxas vigentes ──
const findOrCreateConfig = async (companyId) => {
  const { rows } = await pool.query(
    'SELECT * FROM budget_configs WHERE company_id = $1',
    [companyId]
  )
  if (rows[0]) return rows[0]

  const { rows: created } = await pool.query(
    `INSERT INTO budget_configs (id, company_id, name)
     VALUES (gen_random_uuid(), $1, 'Configuração de Orçamentos')
     RETURNING *`,
    [companyId]
  )
  return created[0]
}

// ── Estrutura completa: títulos -> níveis -> taxa vigente ──────────────
const getFullStructure = async (companyId) => {
  const config = await findOrCreateConfig(companyId)

  const { rows: titles } = await pool.query(
    `SELECT * FROM budget_titles
     WHERE budget_config_id = $1 AND company_id = $2 AND is_active = true
     ORDER BY sort_order`,
    [config.id, companyId]
  )

  const { rows: levels } = await pool.query(
    `SELECT l.* FROM budget_levels l
     JOIN budget_titles t ON t.id = l.budget_title_id
     WHERE t.budget_config_id = $1 AND l.company_id = $2 AND l.is_active = true
     ORDER BY l.sort_order`,
    [config.id, companyId]
  )

  const { rows: rates } = await pool.query(
    `SELECT r.* FROM budget_rates r
     JOIN budget_levels l ON l.id = r.budget_level_id
     JOIN budget_titles t ON t.id = l.budget_title_id
     WHERE t.budget_config_id = $1 AND r.company_id = $2 AND r.is_current = true`,
    [config.id, companyId]
  )

  const ratesByLevel = new Map(rates.map(r => [r.budget_level_id, r]))

  return {
    config,
    titles: titles.map(title => ({
      ...title,
      levels: levels
        .filter(l => l.budget_title_id === title.id)
        .map(level => ({ ...level, current_rate: ratesByLevel.get(level.id) || null })),
    })),
  }
}

// ── Títulos ──────────────────────────────────────────────────────────
const createTitle = async (companyId, { label, sortOrder }) => {
  const config = await findOrCreateConfig(companyId)
  const { rows } = await pool.query(
    `INSERT INTO budget_titles (id, budget_config_id, company_id, label, sort_order)
     VALUES (gen_random_uuid(), $1, $2, $3, $4) RETURNING *`,
    [config.id, companyId, label, sortOrder || 0]
  )
  return rows[0]
}

const updateTitle = async (id, companyId, { label, sortOrder, isActive }) => {
  const { rows } = await pool.query(
    `UPDATE budget_titles
     SET label = COALESCE($1, label),
         sort_order = COALESCE($2, sort_order),
         is_active = COALESCE($3, is_active)
     WHERE id = $4 AND company_id = $5 RETURNING *`,
    [label, sortOrder, isActive, id, companyId]
  )
  return rows[0]
}

const removeTitle = async (id, companyId) => {
  await pool.query(
    'DELETE FROM budget_titles WHERE id = $1 AND company_id = $2',
    [id, companyId]
  )
}

// ── Níveis ───────────────────────────────────────────────────────────
const createLevel = async (companyId, { budgetTitleId, label, sortOrder }) => {
  const { rows } = await pool.query(
    `INSERT INTO budget_levels (id, budget_title_id, company_id, label, sort_order)
     VALUES (gen_random_uuid(), $1, $2, $3, $4) RETURNING *`,
    [budgetTitleId, companyId, label, sortOrder || 0]
  )
  return rows[0]
}

const updateLevel = async (id, companyId, { label, sortOrder, isActive }) => {
  const { rows } = await pool.query(
    `UPDATE budget_levels
     SET label = COALESCE($1, label),
         sort_order = COALESCE($2, sort_order),
         is_active = COALESCE($3, is_active)
     WHERE id = $4 AND company_id = $5 RETURNING *`,
    [label, sortOrder, isActive, id, companyId]
  )
  return rows[0]
}

const removeLevel = async (id, companyId) => {
  await pool.query(
    'DELETE FROM budget_levels WHERE id = $1 AND company_id = $2',
    [id, companyId]
  )
}

// ── Taxas — nunca faz UPDATE destrutivo: fecha a vigente e cria uma nova ──
const setLevelRate = async (levelId, companyId, { rateType, value }) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    await client.query(
      `UPDATE budget_rates SET is_current = false
       WHERE budget_level_id = $1 AND company_id = $2 AND is_current = true`,
      [levelId, companyId]
    )

    const { rows } = await client.query(
      `INSERT INTO budget_rates (id, budget_level_id, company_id, rate_type, value, is_current)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, true) RETURNING *`,
      [levelId, companyId, rateType, value]
    )

    await client.query('COMMIT')
    return rows[0]
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

// ── Busca taxas vigentes de uma lista de níveis (usado no cálculo) ────
const getCurrentRatesByLevelIds = async (levelIds, companyId) => {
  if (!levelIds.length) return []
  const { rows } = await pool.query(
    `SELECT * FROM budget_rates
     WHERE budget_level_id = ANY($1::uuid[]) AND company_id = $2 AND is_current = true`,
    [levelIds, companyId]
  )
  return rows
}

module.exports = {
  findOrCreateConfig,
  getFullStructure,
  createTitle, updateTitle, removeTitle,
  createLevel, updateLevel, removeLevel,
  setLevelRate,
  getCurrentRatesByLevelIds,
}