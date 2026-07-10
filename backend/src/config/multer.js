const multer = require('multer')

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

// memoryStorage: arquivo disponível em req.file.buffer, sem gravação em
// disco (o disco do Render é efêmero). Todos os destinos finais são
// externos: Cloudflare R2 (avatars, logos, capas, arquivos e anexos de
// comentário) e Google Drive (anexos de proposta). As variantes de
// diskStorage foram removidas quando o último fluxo (anexo de comentário
// de tarefa) migrou para o R2.
module.exports = {
  uploadImageMemory: multer({ storage: multer.memoryStorage(), fileFilter: imageFilter, limits: { fileSize: MAX } }),
  uploadDriveFile:   multer({ storage: multer.memoryStorage(), fileFilter: fileFilter,  limits: { fileSize: MAX } }),
}