const router   = require('express').Router()
const userRepo = require('../repositories/user.repository')
const { authenticate, authorize } = require('../middlewares/auth.middleware')
const { paginate, paginatedResponse } = require('../utils/pagination')
const R        = require('../utils/response')
const { uploadImage } = require('../config/multer')

router.use(authenticate)

router.get('/', async (req, res) => {
  try {
    const { page, limit, offset } = paginate(req.query)
    const { rows, total } = await userRepo.findAll({ limit, offset, search: req.query.search })
    return R.success(res, paginatedResponse(rows, total, page, limit))
  } catch (err) { return R.error(res, err.message) }
})

router.get('/:id', async (req, res) => {
  try {
    const user = await userRepo.findById(req.params.id)
    if (!user) return R.notFound(res)
    return R.success(res, { user })
  } catch (err) { return R.error(res, err.message) }
})

router.patch('/:id', async (req, res) => {
  try {
    const fields = {}
    const allowed = ['name','position','phone','admitted_at']
    for (const k of allowed) { if (req.body[k] !== undefined) fields[k] = req.body[k] }
    const user = await userRepo.update(req.params.id, fields)
    return R.success(res, { user })
  } catch (err) { return R.error(res, err.message) }
})

router.post('/:id/avatar', uploadImage.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return R.badRequest(res, 'Nenhuma imagem enviada')
    const url  = `/uploads/images/${req.file.filename}`
    const user = await userRepo.update(req.params.id, { avatar_url: url })
    return R.success(res, { user })
  } catch (err) { return R.error(res, err.message) }
})

module.exports = router