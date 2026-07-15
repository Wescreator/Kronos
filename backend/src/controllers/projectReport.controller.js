const svc = require('../services/projectReport.service')
const R = require('../utils/response')

const getReport = async (req, res) => {
  try { return R.success(res, await svc.getOrCreate(req.params.id, req.tenant.id, req.user.user_id)) }
  catch (err) { return R.error(res, err.message, err.status || 500) }
}

const saveReport = async (req, res) => {
  try { return R.success(res, await svc.save(req.params.id, req.tenant.id, req.user.user_id, req.body)) }
  catch (err) { return R.error(res, err.message, err.status || 500) }
}

module.exports = { getReport, saveReport }
