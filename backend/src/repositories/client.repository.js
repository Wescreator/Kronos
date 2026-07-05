const pool = require('../config/database')

// Mapa de campos permitidos para UPDATE (camelCase do payload -> coluna real no banco).
// Isso resolve dois problemas ao mesmo tempo:
// 1) Elimina o risco de SQL injection via nomes de coluna construídos a partir
//    de chaves arbitrárias do req.body.
// 2) Garante que campos sensíveis (company_id, id, created_at) NUNCA possam
//    ser sobrescritos via payload, preservando o isolamento multitenant.
const UPDATABLE_FIELDS = {
  name: 'name',
  email: 'email',
  phone: 'phone',
  status: 'status',
  situacao: 'situacao',
  financeiro: 'financeiro',
  projectId: 'project_id',
  userId: 'user_id',
}

// project_id e user_id são FK do tipo UUID. Uma string vazia ('') enviada
// por um <select> sem item selecionado quebra o cast para UUID no Postgres.
// Convertendo para null aqui.
const NULLABLE_UUID_FIELDS = new Set(['projectId', 'userId'])

// Defesa em profundidade: mesmo o client.service.js já validando os enums de
// status/situacao/financeiro, o repository (última camada antes do banco)
// também garante que nenhum valor fora do enum seja persistido — caso algum
// outro service futuro esqueça de validar antes de chamar create/update.
const VALID_STATUSES   = new Set(['lead', 'cliente'])
const VALID_SITUACOES  = new Set(['aguardando_aprovacao', 'revisao_proposta', 'proposta_aprovada', 'contrato_assinado'])
const VALID_FINANCEIRO = new Set(['adimplente', 'inadimplente'])

const toNullableUuid = (value) => {
  if (value === undefined || value === null || value === '') return null
  return value
}

const translateDbError = (error) => {
  if (error.code === '22P02') {
    const friendly = new Error('Valor inválido enviado em um dos campos (status, projectId ou userId).')
    friendly.statusCode = 400
    return friendly
  }
  if (error.code === '23502') {
    const friendly = new Error(`O campo "${error.column || 'obrigatório'}" não pode ser vazio.`)
    friendly.statusCode = 400
    return friendly
  }
  if (error.code === '23503') {
    const friendly = new Error('Projeto ou usuário vinculado não existe ou não pertence à empresa.')
    friendly.statusCode = 400
    return friendly
  }
  if (error.code === '23505') {
    const friendly = new Error('Já existe um cliente/lead com esse e-mail nesta empresa.')
    friendly.statusCode = 409
    return friendly
  }

  console.error('[client.repository] Erro inesperado no banco de dados:', error)
  const fallback = new Error('Erro interno ao processar a solicitação.')
  fallback.statusCode = 500
  return fallback
}

// Buscar todos os clientes/leads do escritório (Multitenant)
const findAll = async (companyId, { status, search }) => {
  const conditions = ['p.company_id = $1']
  const params = [companyId]

  if (status) {
    params.push(status)
    conditions.push(`p.status = $${params.length}`)
  }

  if (search) {
    params.push(`%${search}%`)
    conditions.push(`(p.name ILIKE $${params.length} OR p.email ILIKE $${params.length})`)
  }

  try {
    const { rows } = await pool.query(
      `SELECT p.*, proj.title as project_title
       FROM clients_leads p
       LEFT JOIN projects proj ON proj.id = p.project_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY p.created_at DESC`,
      params
    )
    return rows
  } catch (error) {
    throw translateDbError(error)
  }
}

const findById = async (id, companyId) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM clients_leads WHERE id = $1 AND company_id = $2`,
      [id, companyId]
    )
    return rows[0] || null
  } catch (error) {
    throw translateDbError(error)
  }
}

// Criar um Lead/Cliente novo
const create = async (companyId, data) => {
  const status     = VALID_STATUSES.has(data.status) ? data.status : 'lead'
  const situacao   = VALID_SITUACOES.has(data.situacao) ? data.situacao : null
  const financeiro = VALID_FINANCEIRO.has(data.financeiro) ? data.financeiro : null

  try {
    const { rows } = await pool.query(
      `INSERT INTO clients_leads (company_id, name, email, phone, status, situacao, financeiro, project_id, user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        companyId,
        data.name,
        data.email,
        data.phone || null,
        status,
        situacao,
        financeiro,
        toNullableUuid(data.projectId),
        toNullableUuid(data.userId),
      ]
    )
    return rows[0]
  } catch (error) {
    throw translateDbError(error)
  }
}

// Atualizar os dados (inclusive quando vincular a um projeto ou mudar status)
const update = async (id, companyId, fields) => {
  const sets = []
  const values = []

  for (const [key, value] of Object.entries(fields)) {
    const column = UPDATABLE_FIELDS[key]
    if (!column) continue

    // Defesa em profundidade: ignora valores fora do enum em vez de
    // deixá-los serem persistidos (o service já deveria ter barrado antes).
    if (key === 'status' && !VALID_STATUSES.has(value)) continue
    if (key === 'situacao' && value !== null && !VALID_SITUACOES.has(value)) continue
    if (key === 'financeiro' && value !== null && !VALID_FINANCEIRO.has(value)) continue

    const finalValue = NULLABLE_UUID_FIELDS.has(key) ? toNullableUuid(value) : value
    values.push(finalValue)
    sets.push(`${column} = $${values.length}`)
  }

  if (sets.length === 0) {
    const error = new Error('Nenhum campo válido foi enviado para atualização.')
    error.statusCode = 400
    throw error
  }

  values.push(id, companyId)
  const idParamIndex = values.length - 1
  const companyParamIndex = values.length

  try {
    const { rows } = await pool.query(
      `UPDATE clients_leads
       SET ${sets.join(', ')}, updated_at = NOW()
       WHERE id = $${idParamIndex} AND company_id = $${companyParamIndex}
       RETURNING *`,
      values
    )
    return rows[0]
  } catch (error) {
    throw translateDbError(error)
  }
}

const remove = async (id, companyId) => {
  try {
    await pool.query(
      `DELETE FROM clients_leads WHERE id = $1 AND company_id = $2`,
      [id, companyId]
    )
  } catch (error) {
    throw translateDbError(error)
  }
}

module.exports = { findAll, findById, create, update, remove, UPDATABLE_FIELDS }