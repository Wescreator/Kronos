const importService = require('../services/import.service')
const R = require('../utils/response')

// Developer sem X-Impersonate-Company chega aqui com req.tenant = null —
// importação sempre grava em uma empresa concreta.
const requireTenant = (req, res) => {
  if (!req.tenant) {
    R.badRequest(res, 'Selecione uma empresa (header X-Impersonate-Company) para importar')
    return false
  }
  return true
}

const createImport = async (req, res) => {
  try {
    if (!requireTenant(req, res)) return
    const job = await importService.createImport({
      file: req.file,
      module: req.body.module,
      userId: req.user.user_id,
      companyId: req.tenant.id,
    })
    return R.created(res, { job })
  } catch (err) { return R.error(res, err.message, err.status || 500) }
}

const listImports = async (req, res) => {
  try {
    if (!requireTenant(req, res)) return
    return R.success(res, await importService.listImports(req.query, req.tenant.id, req.user.role))
  } catch (err) { return R.error(res, err.message, err.status || 500) }
}

const getImport = async (req, res) => {
  try {
    if (!requireTenant(req, res)) return
    return R.success(res, { job: await importService.getImport(req.params.id, req.tenant.id, req.user.role) })
  } catch (err) { return R.error(res, err.message, err.status || 500) }
}

const getMapping = async (req, res) => {
  try {
    if (!requireTenant(req, res)) return
    return R.success(res, await importService.getMapping(req.params.id, req.tenant.id, req.user.role))
  } catch (err) { return R.error(res, err.message, err.status || 500) }
}

const saveMapping = async (req, res) => {
  try {
    if (!requireTenant(req, res)) return
    return R.success(res, await importService.applyMapping(req.params.id, req.body, req.tenant.id, req.user.role))
  } catch (err) { return R.error(res, err.message, err.status || 500) }
}

const getRows = async (req, res) => {
  try {
    if (!requireTenant(req, res)) return
    return R.success(res, await importService.getRows(req.params.id, req.query, req.tenant.id, req.user.role))
  } catch (err) { return R.error(res, err.message, err.status || 500) }
}

const setRowAction = async (req, res) => {
  try {
    if (!requireTenant(req, res)) return
    return R.success(res, await importService.setRowAction(req.params.id, req.params.rowId, req.body.action, req.tenant.id, req.user.role))
  } catch (err) { return R.error(res, err.message, err.status || 500) }
}

const bulkRowAction = async (req, res) => {
  try {
    if (!requireTenant(req, res)) return
    return R.success(res, await importService.bulkRowAction(req.params.id, req.body.action, req.tenant.id, req.user.role))
  } catch (err) { return R.error(res, err.message, err.status || 500) }
}

const confirmImport = async (req, res) => {
  try {
    if (!requireTenant(req, res)) return
    return R.success(res, await importService.confirmImport(req.params.id, req.tenant.id, req.user.role, req.user.user_id))
  } catch (err) { return R.error(res, err.message, err.status || 500) }
}

module.exports = { createImport, listImports, getImport, getMapping, saveMapping, getRows, setRowAction, bulkRowAction, confirmImport }
