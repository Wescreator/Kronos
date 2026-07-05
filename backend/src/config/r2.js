const { S3Client } = require('@aws-sdk/client-s3')

// Em desenvolvimento, aponta para o MinIO local (S3-compatible).
// Em produção, mantém o comportamento original apontando para o R2.
// MinIO exige forcePathStyle: true; o R2 não usa (nem aceita) essa opção.
const isLocalS3 = process.env.NODE_ENV === 'development'

const r2Client = new S3Client({
  region: 'auto',
  endpoint: isLocalS3
    ? (process.env.S3_ENDPOINT || 'http://localhost:9000')
    : `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
  ...(isLocalS3 ? { forcePathStyle: true } : {}),
})

module.exports = r2Client