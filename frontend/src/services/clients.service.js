import api from './api'

const BASE_URL = '/clients'

// Campos aceitos pelo backend (client.controller.js / client.repository.js).
// Mantidos em camelCase de propósito: o backend espera exatamente esses nomes
// no req.body e faz a tradução para snake_case internamente (project_id, user_id).
const ALLOWED_FIELDS = ['name', 'email', 'phone', 'status', 'situacao', 'financeiro', 'projectId', 'userId']
const UUID_FIELDS = ['projectId', 'userId']

// Monta o payload garantindo:
// - apenas campos que o backend reconhece (evita 400 "Campo(s) não permitido(s)")
// - nenhum campo `undefined` é enviado
// - string vazia em projectId/userId é convertida para null
//   (evita erro de cast UUID no Postgres: invalid input syntax for type uuid: "")
function buildPayload(source = {}) {
  const body = {}

  for (const field of ALLOWED_FIELDS) {
    const value = source[field]

    if (value === undefined) {
      continue
    }

    if (UUID_FIELDS.includes(field) && value === '') {
      body[field] = null
      continue
    }

    body[field] = value
  }

  return body
}

// Lista clientes/leads da empresa logada (company_id vem do JWT no backend).
export const getAllClients = (filters = {}) => {
  const params = {}
  if (filters.status) params.status = filters.status
  if (filters.search) params.search = filters.search

  return api.get(BASE_URL, { params })
}

// Busca um cliente/lead específico (id é UUID).
export const getClientById = (id) => api.get(`${BASE_URL}/${id}`)

// Cria cliente/lead. Payload esperado: { name, email, phone?, status?, projectId?, userId? }
// `idempotencyKey` (opcional) — ver hooks/useIdempotencyKey.
export const createClient = (payload, idempotencyKey) =>
  api.post(BASE_URL, buildPayload(payload), idempotencyKey ? { idempotencyKey } : {})

// Atualiza cliente/lead. Envia somente os campos definidos no payload.
export const updateClient = (id, payload) => {
  const body = buildPayload(payload)

  if (Object.keys(body).length === 0) {
    return Promise.reject(new Error('Nenhum campo para atualizar foi informado.'))
  }

  return api.put(`${BASE_URL}/${id}`, body)
}

// Remove cliente/lead.
export const deleteClient = (id) => api.delete(`${BASE_URL}/${id}`)