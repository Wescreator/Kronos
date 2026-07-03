const clientRepo = require('../repositories/client.repository')

// Validação simples de formato de e-mail. Não pretende ser 100% RFC-compliant
// (isso é praticamente impossível com regex) — só barra os erros mais comuns
// de digitação (falta de @, falta de domínio, espaços).
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Enum de status usado no frontend (ClientsPage.jsx / NewClientModal.jsx).
// Qualquer valor fora dessa lista é rejeitado aqui, antes de chegar no banco
// (a coluna é VARCHAR(20) livre — sem essa checagem, um typo no frontend
// criaria um "status fantasma" que nenhum filtro da UI reconheceria).
const VALID_STATUSES = ['lead', 'cliente']

// Limites espelhando exatamente as colunas do Postgres (schema.prisma):
// name VARCHAR(255), email VARCHAR(255), phone VARCHAR(50).
const FIELD_LIMITS = { name: 255, email: 255, phone: 50 }

const notFoundError = (message) => {
  const error = new Error(message)
  error.statusCode = 404
  return error
}

const validationError = (message) => {
  const error = new Error(message)
  error.statusCode = 400
  return error
}

const normalizeString = (value) => (typeof value === 'string' ? value.trim() : value)

// name é sempre obrigatório (create e update, quando enviado).
const validateName = (value, { required }) => {
  const normalized = normalizeString(value)

  if (required && (!normalized || normalized.length === 0)) {
    throw validationError('O campo "name" é obrigatório.')
  }
  if (normalized && normalized.length > FIELD_LIMITS.name) {
    throw validationError(`O campo "name" excede o limite de ${FIELD_LIMITS.name} caracteres.`)
  }

  return normalized
}

// email é OPCIONAL — alinhado ao formulário (NewClientModal.jsx marca o
// campo como "opcional"). Um Lead pode ser cadastrado só com nome.
// Se for enviado, precisa ter formato válido.
const validateEmail = (value) => {
  const normalized = normalizeString(value)

  if (!normalized) {
    return null
  }
  if (normalized.length > FIELD_LIMITS.email) {
    throw validationError(`O campo "email" excede o limite de ${FIELD_LIMITS.email} caracteres.`)
  }
  if (!EMAIL_REGEX.test(normalized)) {
    throw validationError('O e-mail informado é inválido.')
  }

  return normalized
}

const validatePhone = (value) => {
  const normalized = normalizeString(value)

  if (!normalized) {
    return null
  }
  if (normalized.length > FIELD_LIMITS.phone) {
    throw validationError(`O campo "phone" excede o limite de ${FIELD_LIMITS.phone} caracteres.`)
  }

  return normalized
}

// Retorna undefined quando o valor não foi enviado (permite diferenciar
// "não mandou status" de "mandou status inválido" no update).
const validateStatus = (value) => {
  if (value === undefined || value === null || value === '') {
    return undefined
  }
  if (!VALID_STATUSES.includes(value)) {
    throw validationError(`Status inválido. Valores aceitos: ${VALID_STATUSES.join(', ')}.`)
  }
  return value
}

const getAllClients = async (companyId, filters) => {
  return await clientRepo.findAll(companyId, filters)
}

const getClientById = async (id, companyId) => {
  const client = await clientRepo.findById(id, companyId)
  if (!client) {
    throw notFoundError('Cliente ou Lead não encontrado.')
  }
  return client
}

const createClientOrLead = async (companyId, data = {}) => {
  const name = validateName(data.name, { required: true })
  const email = validateEmail(data.email)
  const phone = validatePhone(data.phone)
  const status = validateStatus(data.status) || 'lead'

  return await clientRepo.create(companyId, {
    name,
    email,
    phone,
    status,
    projectId: data.projectId,
    userId: data.userId,
  })
}

const updateClientOrLead = async (id, companyId, fields) => {
  if (!fields || typeof fields !== 'object' || Array.isArray(fields)) {
    throw validationError('Payload de atualização inválido.')
  }

  const incomingKeys = Object.keys(fields)
  if (incomingKeys.length === 0) {
    throw validationError('Nenhum campo enviado para atualização.')
  }

  // Bloqueia explicitamente qualquer chave fora da whitelist (ex: company_id,
  // id, createdAt) ANTES de chegar no banco.
  const allowedKeys = Object.keys(clientRepo.UPDATABLE_FIELDS)
  const unknownKeys = incomingKeys.filter((key) => !allowedKeys.includes(key))
  if (unknownKeys.length > 0) {
    throw validationError(`Campo(s) não permitido(s) para atualização: ${unknownKeys.join(', ')}`)
  }

  // Sanitiza/valida apenas os campos que realmente vieram no payload —
  // não força re-validação de campos que o usuário não está alterando.
  const sanitized = { ...fields }

  if ('name' in sanitized) {
    sanitized.name = validateName(sanitized.name, { required: true })
  }
  if ('email' in sanitized) {
    sanitized.email = validateEmail(sanitized.email)
  }
  if ('phone' in sanitized) {
    sanitized.phone = validatePhone(sanitized.phone)
  }
  if ('status' in sanitized) {
    const status = validateStatus(sanitized.status)
    if (!status) {
      throw validationError('O campo "status" não pode ser vazio.')
    }
    sanitized.status = status
  }

  // Garante que o cliente existe e pertence à empresa antes de atualizar
  await getClientById(id, companyId)
  return await clientRepo.update(id, companyId, sanitized)
}

const deleteClientOrLead = async (id, companyId) => {
  await getClientById(id, companyId) // garante que existe e pertence à empresa
  await clientRepo.remove(id, companyId)
}

module.exports = {
  getAllClients,
  getClientById,
  createClientOrLead,
  updateClientOrLead,
  deleteClientOrLead,
}