const router   = require('express').Router()
const userRepo = require('../repositories/user.repository')
const companyRepo = require('../repositories/company.repository')
const { authenticate, authorize, BYPASS_ROLES } = require('../middlewares/auth.middleware')
const tenantMiddleware = require('../middlewares/tenant.middleware')
const { paginate, paginatedResponse } = require('../utils/pagination')
const R        = require('../utils/response')
const { uploadImage } = require('../config/multer')

router.use(authenticate, tenantMiddleware)

/**
 * Pode acessar o usuario alvo?
 *  - o proprio usuario (self); ou
 *  - Dev Global (BYPASS_ROLES), com ou sem impersonação ativa; ou
 *  - admin, desde que o alvo seja membro da MESMA empresa.
 * Impede que um admin acesse/edite usuarios de outra empresa por ID.
 */
async function canAccessTarget(req) {
  const targetId = req.params.id
  if (req.user.user_id === targetId) return true
  if (BYPASS_ROLES.includes(req.user.role)) return true
  if (!req.tenant) return false
  if (req.user.role !== 'admin') return false
  const link = await companyRepo.findCompanyUser(req.tenant.id, targetId)
  return !!link
}

/**
 * Pode alterar o campo is_active (ativar/desativar) do usuario alvo?
 *  - Ninguem pode alterar o proprio status, nem admin nem Dev Global.
 *  - Dev Global pode desativar qualquer membro, inclusive outro admin.
 *  - Admin so pode desativar membros com role !== 'admin' na empresa
 *    (nao pode desativar outro admin).
 */
async function canToggleStatus(req) {
  const targetId = req.params.id
  if (req.user.user_id === targetId) return false
  if (BYPASS_ROLES.includes(req.user.role)) return true
  if (!req.tenant) return false
  if (req.user.role !== 'admin') return false
  const link = await companyRepo.findCompanyUser(req.tenant.id, targetId)
  if (!link) return false
  return link.role !== 'admin'
}

/**
 * Listagem de usuários
 * Apenas admin e manager
 */
router.get(
  '/',
  authorize('admin', 'manager'),
  async (req, res) => {
    try {
      if (!req.tenant) {
        return R.forbidden(res, 'Selecione uma empresa para listar a equipe')
      }

      const { page, limit, offset } = paginate(req.query)

      const { rows, total } = await userRepo.findAll({
        companyId: req.tenant.id,
        limit,
        offset,
        search: req.query.search
      })

      return R.success(
        res,
        paginatedResponse(rows, total, page, limit)
      )
    } catch (err) {
      return R.error(res, err.message)
    }
  }
)

/**
 * Buscar usuário por ID
 * Próprio usuário, Dev Global ou admin
 */
router.get('/:id', async (req, res) => {
  try {
    if (!(await canAccessTarget(req))) {
      return R.forbidden(res, 'Acesso negado')
    }

    const user = await userRepo.findById(req.params.id)

    if (!user) {
      return R.notFound(res)
    }

    return R.success(res, { user })
  } catch (err) {
    return R.error(res, err.message)
  }
})

/**
 * Atualizar usuário
 * Próprio usuário, Dev Global ou admin
 */
router.patch('/:id', async (req, res) => {
  try {
    if (!(await canAccessTarget(req))) {
      return R.forbidden(res, 'Acesso negado')
    }

    if (req.body.is_active !== undefined && !(await canToggleStatus(req))) {
      return R.forbidden(res, 'Você não tem permissão para alterar o status deste membro')
    }

    const fields = {}

    const allowed = [
      'name',
      'position',
      'phone',
      'admitted_at',
      'is_active'
    ]

    for (const k of allowed) {
      if (req.body[k] !== undefined) {
        fields[k] = req.body[k]
      }
    }

    if (Object.keys(fields).length === 0) {
      return R.badRequest(res, 'Nenhum campo enviado')
    }

    const user = await userRepo.update(req.params.id, fields)

    return R.success(res, { user })
  } catch (err) {
    return R.error(res, err.message)
  }
})

/**
 * Upload de avatar
 * Próprio usuário, Dev Global ou admin
 */
router.post('/:id/avatar', uploadImage.single('avatar'), async (req, res) => {
  try {
    if (!(await canAccessTarget(req))) {
      return R.forbidden(res, 'Acesso negado')
    }

    if (!req.file) {
      return R.badRequest(res, 'Nenhuma imagem enviada')
    }

    const url = `/uploads/images/${req.file.filename}`

    const user = await userRepo.update(req.params.id, {
      avatar_url: url
    })

    return R.success(res, { user })
  } catch (err) {
    return R.error(res, err.message)
  }
})

module.exports = router