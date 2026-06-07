const multer = require('multer')
const path   = require('path')
const crypto = require('crypto')

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

const fileFilter = (req, file, cb) => {
  const blocked = ['application/x-msdownload', 'application/x-sh']
  blocked.includes(file.mimetype)
    ? cb(new Error('Tipo de arquivo não permitido'), false)
    : cb(null, true)
}

const MAX = parseInt(process.env.UPLOAD_MAX_SIZE) || 10 * 1024 * 1024

module.exports = {
  uploadImage: multer({ storage: buildStorage('images'), fileFilter: imageFilter, limits: { fileSize: MAX } }),
  uploadFile:  multer({ storage: buildStorage('files'),  fileFilter: fileFilter,  limits: { fileSize: MAX } })
}