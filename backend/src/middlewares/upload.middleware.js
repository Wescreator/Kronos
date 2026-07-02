const multer = require('multer')
const path   = require('path')
const crypto = require('crypto')

// ─── diskStorage (comportamento atual — inalterado) ───────────────────────────
function buildStorage(subfolder) {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, path.join(__dirname, '..', '..', 'uploads', subfolder))
    },
    filename: (req, file, cb) => {
      const hash = crypto.randomBytes(8).toString('hex')
      const ext  = path.extname(file.originalname)
      cb(null, `${Date.now()}-${hash}${ext}`)
    }
  })
}

const imageFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp']
  allowed.includes(file.mimetype)
    ? cb(null, true)
    : cb(new Error('Apenas imagens são permitidas'), false)
}

// Allowlist de tipos permitidos para anexos (documentos e imagens comuns).
// Evita SVG/HTML (XSS armazenado) e executáveis. O mimetype é controlado
// pelo cliente — para máxima segurança, valide também os magic bytes.
const ALLOWED_FILE_TYPES = [
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain', 'text/csv',
  'application/zip',
]

const fileFilter = (req, file, cb) => {
  ALLOWED_FILE_TYPES.includes(file.mimetype)
    ? cb(null, true)
    : cb(new Error('Tipo de arquivo não permitido'), false)
}

const MAX = parseInt(process.env.UPLOAD_MAX_SIZE) || 10 * 1024 * 1024

module.exports = {
  // Existentes — não alterados
  uploadImage: multer({ storage: buildStorage('images'), fileFilter: imageFilter, limits: { fileSize: MAX } }),
  uploadFile:  multer({ storage: buildStorage('files'),  fileFilter: fileFilter,  limits: { fileSize: MAX } }),

  // Novo — para uploads ao Google Drive (sem gravação local)
  // Usa memoryStorage: arquivo disponível em req.file.buffer
  uploadDriveFile: multer({ storage: multer.memoryStorage(), fileFilter: fileFilter, limits: { fileSize: MAX } }),
}