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
    ORDER BY changed_at DESC
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

const updateCover = async (id, companyId, coverUrl) => {
  const { rows } = await pool.query(
    `
    UPDATE projects
    SET cover_url = $1, updated_at = NOW()
    WHERE id = $2 AND company_id = $3
    RETURNING *
    `,
    [coverUrl, id, companyId]
  )

  return rows[0]
}

// Idempotente. A tabela tem UNIQUE (project_id, user_id): sem o ON CONFLICT,
// um duplo clique em "Adicionar membro" adicionava o membro na 1ª requisição
// e estourava 23505 (→ 500 "Erro ao adicionar membro") na 2ª, mentindo para o
// usuário sobre um vínculo que já existia. Mesmo padrão já usado em
// chat.repository.addMember e task.repository.setAssignees.
// Retorna { member, created } — `created: false` indica que o vínculo já
// existia, para que o service não dispare a notificação de novo.
const addMember = async (projectId, userId, role) => {
  const { rows } = await pool.query(
    `
    INSERT INTO project_members (project_id, user_id, role)
    VALUES ($1, $2, $3)
    ON CONFLICT (project_id, user_id) DO NOTHING
    RETURNING *
    `,
    [projectId, userId, role || 'member']
  )

  if (rows[0]) return { member: rows[0], created: true }

  const { rows: existing } = await pool.query(
    `SELECT * FROM project_members WHERE project_id = $1 AND user_id = $2`,
    [projectId, userId]
  )
  return { member: existing[0] || null, created: false }
}

const removeMember = async (projectId, userId) => {
  const { rowCount } = await pool.query(
    `DELETE FROM project_members 
     WHERE project_id = $1 AND user_id = $2`,
    [projectId, userId]
  )
  return rowCount > 0
}

/**
 * Atualiza o projeto e, se o status mudou, registra o histórico — tudo sob LOCK.
 *
 * Antes o service lia o projeto, comparava o status e só depois gravava, sem
 * lock. Duas requisições concorrentes (duplo clique em "Salvar", duas abas) liam
 * o MESMO status antigo, ambas passavam no `if` e ambas inseriam → DUAS linhas
 * idênticas no histórico de status do projeto.
 *
 * O `SELECT ... FOR UPDATE` trava a linha do projeto: a segunda requisição
 * espera, relê o status JÁ atualizado e, com isso, não registra a transição de
 * novo. A comparação e a escrita passam a ser atômicas.
 */
const updateWithStatusHistory = async (id, companyId, fields, changedBy, statusNote) => {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const { rows: locked } = await client.query(
      'SELECT status FROM projects WHERE id = $1 AND company_id = $2 FOR UPDATE',
      [id, companyId]
    )
    if (!locked[0]) {
      await client.query('ROLLBACK')
      return null
    }

    const currentStatus = locked[0].status

    if (fields.status && fields.status !== currentStatus) {
      await client.query(
        `INSERT INTO project_status_history
           (project_id, company_id, from_status, to_status, changed_by, note)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [id, companyId, currentStatus, fields.status, changedBy, statusNote || null]
      )
    }

    const keys = Object.keys(fields)
    if (!keys.length) {
      await client.query('COMMIT')
      return findById(id, companyId)
    }

    const values = Object.values(fields)
    const sets = keys.map((k, i) => `${k} = $${i + 1}`).join(', ')
    values.push(id, companyId)

    const { rows } = await client.query(
      `UPDATE projects SET ${sets}, updated_at = NOW()
        WHERE id = $${values.length - 1} AND company_id = $${values.length}
        RETURNING *`,
      values
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

const addStatusHistory = async (projectId, companyId, fromStatus, toStatus, changedBy, note) => {
  const { rows } = await pool.query(
    `
    INSERT INTO project_status_history 
    (project_id, company_id, from_status, to_status, changed_by, note)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
    `,
    [projectId, companyId, fromStatus, toStatus, changedBy, note]
  )
  return rows[0]
}

const findMembers = async (projectId) => {
  const { rows } = await pool.query(
    `
    SELECT pm.id, pm.user_id, pm.role, pm.joined_at, u.name, u.email, u.avatar_url
    FROM project_members pm
    INNER JOIN users u ON u.id = pm.user_id
    WHERE pm.project_id = $1
    ORDER BY pm.joined_at ASC
    `,
    [projectId]
  )

  return rows
}

// NOVO — verifica se um usuário está vinculado ao projeto (project_members).
// Usado pelo utils/authz.js para liberar criar/editar/anexar/comentar/
// reordenar etapas e fases a qualquer membro do projeto.
const isMember = async (projectId, userId) => {
  const { rows } = await pool.query(
    `SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2 LIMIT 1`,
    [projectId, userId]
  )
  return rows.length > 0
}

const countDependents = async (id) => {
  const { rows } = await pool.query(
    `
    SELECT
      (SELECT COUNT(*) FROM tasks         WHERE project_id = $1) AS tasks,
      (SELECT COUNT(*) FROM expenses      WHERE project_id = $1) AS expenses,
      (SELECT COUNT(*) FROM revenues      WHERE project_id = $1) AS revenues,
      (SELECT COUNT(*) FROM clients_leads WHERE project_id = $1) AS leads
    `,
    [id]
  )
  const r = rows[0]
  return {
    tasks:    Number(r.tasks),
    expenses: Number(r.expenses),
    revenues: Number(r.revenues),
    leads:    Number(r.leads),
  }
}

const remove = async (id, companyId) => {
  const { rowCount } = await pool.query(
    `DELETE FROM projects WHERE id = $1 AND company_id = $2`,
    [id, companyId]
  )
  return rowCount > 0
}

module.exports = {findAll, findById, create, update, updateWithStatusHistory, updateCover, findStatusHistory, findMembers, addMember, removeMember, addStatusHistory, isMember, countDependents, remove}