const clientService = require('../services/client.service')

// clients_leads.id é UUID. Validamos o formato antes de tocar no banco,
// mesmo padrão usado pelo tenantMiddleware para X-Impersonate-Company.
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const isValidUuid = (value) => typeof value === 'string' && UUID_REGEX.test(value)

const handleError = (res, error, fallbackStatus = 400) => {
  const statusCode = error.statusCode || fallbackStatus
  if (statusCode >= 500) {
    console.error('[client.controller] Erro inesperado:', error)
  }
  return res.status(statusCode).json({
    success: false,
    message: statusCode >= 500 ? 'Erro interno ao processar a solicitação.' : error.message,
  })
}

// Extrai o ID da empresa a partir do req.tenant (resolvido pelo
// tenantMiddleware), em vez de usar req.user.company_id diretamente.
//
// Por quê: req.user.company_id é o valor CRU do JWT. Ele não reflete
// impersonação (usuários "global" acessando dados de outra empresa via
// X-Impersonate-Company) e não sabe se a empresa está ativa/suspensa —
// tudo isso já é resolvido pelo tenantMiddleware e fica em req.tenant.
const getTenantId = (req, res) => {
  if (!req.tenant || !req.tenant.id) {
    res.status(400).json({
      success: false,
      message: 'Nenhuma empresa selecionada para esta operação.',
    })
    return null
  }
  return req.tenant.id
}

// ALTERADO — agora lê page/limit de req.query e repassa ao service. A
// resposta muda de um array cru para { data, pagination }, então o
// ClientsPage.jsx precisa ler res.data.data em vez de res.data direto.
const getAll = async (req, res) => {
  try {
    const companyId = getTenantId(req, res)
    if (!companyId) return

    const filters = {
      status: req.query.status,
      search: req.query.search,
      page:   req.query.page,
      limit:  req.query.limit,
    }

    const result = await clientService.getAllClients(companyId, filters)
    return res.status(200).json(result)
  } catch (error) {
    return handleError(res, error, 500)
  }
}

const getById = async (req, res) => {
  try {
    const { id } = req.params
    if (!isValidUuid(id)) {
      return res.status(400).json({ success: false, message: 'ID inválido.' })
    }

    const companyId = getTenantId(req, res)
    if (!companyId) return

    const client = await clientService.getClientById(id, companyId)
    return res.status(200).json(client)
  } catch (error) {
    return handleError(res, error, 404)
  }
}

const create = async (req, res) => {
  try {
    const companyId = getTenantId(req, res)
    if (!companyId) return

    const newClient = await clientService.createClientOrLead(companyId, req.body)
    return res.status(201).json(newClient)
  } catch (error) {
    return handleError(res, error, 400)
  }
}

const update = async (req, res) => {
  try {
    const { id } = req.params
    if (!isValidUuid(id)) {
      return res.status(400).json({ success: false, message: 'ID inválido.' })
    }

    const companyId = getTenantId(req, res)
    if (!companyId) return

    const updatedClient = await clientService.updateClientOrLead(id, companyId, req.body)
    return res.status(200).json(updatedClient)
  } catch (error) {
    return handleError(res, error, 400)
  }
}

const remove = async (req, res) => {
  try {
    const { id } = req.params
    if (!isValidUuid(id)) {
      return res.status(400).json({ success: false, message: 'ID inválido.' })
    }

    const companyId = getTenantId(req, res)
    if (!companyId) return

    await clientService.deleteClientOrLead(id, companyId)
    return res.status(200).json({ success: true, message: 'Cliente excluído' })
  } catch (error) {
    return handleError(res, error, 400)
  }
}

module.exports = { getAll, getById, create, update, remove }