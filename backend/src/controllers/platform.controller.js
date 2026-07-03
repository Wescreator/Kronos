const platformService = require('../services/platform.service')
const fileService     = require('../services/file.service')
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

// Upload de logo — agora persiste no Cloudflare R2 (bucket público via
// r2.dev). O disco do Render é efêmero: qualquer arquivo salvo localmente
// é perdido a cada deploy/restart, por isso não usamos mais diskStorage
// nem montamos a URL a partir de req.protocol/req.get('host').
const uploadCompanyLogo = asyncHandler(async (req, res) => {
  if (!req.file) throw { status: 400, message: 'Nenhum arquivo enviado.' }

  const { url } = await fileService.upload({
    buffer:           req.file.buffer,
    originalFilename: req.file.originalname,
    mimeType:         req.file.mimetype,
    folder:           `companies/${req.params.id}/logo`,
  })

  const company = await platformService.uploadCompanyLogo(req.params.id, url)
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

const getCompanyHistory = asyncHandler(async (req, res) => {
  const history = await platformService.getCompanyHistory(req.params.id)
  return R.success(res, { history })
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
  getCompanyHistory,
}