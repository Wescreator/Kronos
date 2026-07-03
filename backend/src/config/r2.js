const { S3Client } = require('@aws-sdk/client-s3')

// Cliente S3 apontando para o endpoint do Cloudflare R2 (S3-compatible).
// region: 'auto' é o valor exigido pela Cloudflare para R2.
// O endpoint NÃO deve conter o nome do bucket no path (a Cloudflare
// alerta sobre isso na documentação) — o bucket é informado por comando
// (PutObjectCommand, DeleteObjectCommand etc.), não pela URL.
const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
})

module.exports = r2Client