const platformService = require('../services/platform.service')
const R = require('../utils/response')

const asyncHandler = fn => (req, res) =>
  Promise.resolve(fn(req, res)).catch(err =>
    R.error(res, err.message, err.status || 500)
  )

const listCompanies = asyncHandler(async (req, res) => {
  const companies = await platformService.listCompanies()
  return R.success(res, { companies })
})

const createCompany = asyncHandler(async (req, res) => {
  const company = await platformService.createCompany(req.body)
  return R.created(res, { company })
})

const setCompanyActive = asyncHandler(async (req, res) => {
  const result = await platformService.setCompanyActive(req.params.id, req.body.is_active)
  return R.success(res, result)
})

const updateCompany = asyncHandler(async (req, res) => {
  const company = await platformService.updateCompany(req.params.id, req.body)
  return R.success(res, { company })
})

// Monta a URL pública a partir da própria requisição (protocolo + host),
// já que o server.js expõe `uploads/` estaticamente em `/uploads`
// (app.use('/uploads', express.static(...))). Isso funciona em dev e em
// produção sem depender de nenhuma variável de ambiente extra.
const uploadCompanyLogo = asyncHandler(async (req, res) => {
  if (!req.file) throw { status: 400, message: 'Nenhum arquivo enviado.' }

  const publicUrl = `${req.protocol}://${req.get('host')}/uploads/images/${req.file.filename}`

  const company = await platformService.uploadCompanyLogo(req.params.id, publicUrl)
  return R.success(res, { company })
})

const listCompanyUsers = asyncHandler(async (req, res) => {
  const users = await platformService.listCompanyUsers(req.params.id)
  return R.success(res, { users })
})

const createCompanyUser = asyncHandler(async (req, res) => {
  const user = await platformService.createCompanyUser({
    companyId: req.params.id,
    ...req.body,
  })
  return R.created(res, { user })
})

const updateCompanyUser = asyncHandler(async (req, res) => {
  const user = await platformService.updateCompanyUser(req.params.id, req.params.userId, req.body)
  return R.success(res, { user })
})

const deleteCompanyUser = asyncHandler(async (req, res) => {
  await platformService.deleteCompanyUser(req.params.id, req.params.userId)
  return R.success(res, { deleted: true })
})

module.exports = {
  listCompanies,
  createCompany,
  updateCompany,
  uploadCompanyLogo,
  setCompanyActive,
  listCompanyUsers,
  createCompanyUser,
  updateCompanyUser,
  deleteCompanyUser,
}