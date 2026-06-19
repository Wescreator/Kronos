const R = require('../utils/response')
const asyncHandler = fn => (req, res) =>
  Promise.resolve(fn(req, res)).catch(err =>
    R.error(res, err.message, err.status || 500)
  )

// placeholder repository (ajustar quando você enviar storage/file repo)
const fileRepo = {
  list: async (proposalId) => [],
  upload: async () => ({}),
  remove: async () => {}
}

// ── LISTAR ARQUIVOS ───────────────────────────────────────────
const listFiles = asyncHandler(async (req, res) => {
  const { id: proposalId } = req.params
  const files = await fileRepo.list(proposalId)
  return R.success(res, { files })
})

// ── UPLOAD ARQUIVO ───────────────────────────────────────────
const uploadFile = asyncHandler(async (req, res) => {
  const { id: proposalId } = req.params

  if (!req.file) {
    return R.error(res, 'Arquivo não enviado', 400)
  }

  const file = await fileRepo.upload({
    proposalId,
    file: req.file,
    userId: req.user.id,
    tenantId: req.user.tenant_id
  })

  return R.created(res, { file })
})

// ── DELETE ARQUIVO ───────────────────────────────────────────
const deleteFile = asyncHandler(async (req, res) => {
  const { id: proposalId, fileId } = req.params

  await fileRepo.remove({
    proposalId,
    fileId,
    tenantId: req.user.tenant_id
  })

  return R.success(res, { message: 'Arquivo removido' })
})

module.exports = {
  listFiles,
  uploadFile,
  deleteFile
}