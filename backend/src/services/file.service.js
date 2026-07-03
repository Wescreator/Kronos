const crypto = require('crypto')
const { PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3')
const r2       = require('../config/r2')
const fileRepo = require('../repositories/project-file.repository')

const BUCKET      = process.env.R2_BUCKET_NAME
const PUBLIC_URL  = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '') // sem barra final

const generateObjectKey = (folder, filename) => {
  const safeName = filename.replace(/\s+/g, '-').toLowerCase()
  const unique = crypto.randomUUID()
  return `${folder}/${unique}-${safeName}`
}

const putToR2 = async (objectKey, buffer, mimeType) => {
  await r2.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: objectKey,
    Body: buffer,
    ContentType: mimeType,
  }))
}

/**
 * Upload "genérico" — sobe o arquivo para o R2 e retorna a URL pública.
 * NÃO grava linha em project_files (project_id é NOT NULL nessa tabela,
 * e casos como logo de empresa e capa de projeto não têm um projeto-dono
 * no sentido de "anexo"; a URL resultante já é persistida diretamente na
 * coluna correspondente — companies.logo_url / projects.cover_url — pelo
 * service que chama esta função).
 */
const upload = async ({ buffer, originalFilename, mimeType, folder }) => {
  const objectKey = generateObjectKey(folder, originalFilename)
  await putToR2(objectKey, buffer, mimeType)

  return {
    object_key: objectKey,
    url: `${PUBLIC_URL}/${objectKey}`,
  }
}

/**
 * Upload vinculado a um projeto (aba de Arquivos). Aqui sim persiste em
 * project_files, pois representa um anexo real do projeto.
 */
const uploadForProject = async ({
  buffer,
  originalFilename,
  mimeType,
  uploadedBy,
  projectId,
  companyId
}) => {
  if (!projectId) {
    throw { status: 400, message: 'projectId obrigatório' }
  }

  const objectKey = generateObjectKey(`projects/${projectId}`, originalFilename)
  await putToR2(objectKey, buffer, mimeType)

  const url = `${PUBLIC_URL}/${objectKey}`

  const file = await fileRepo.create({
    projectId,
    uploadedBy,
    fileName: originalFilename,
    fileSize: buffer?.length || 0,
    mimeType,
    driveFileId: objectKey,
    driveUrl: url,
    company_id: companyId || null
  })

  return { ...file, object_key: objectKey, url }
}

const listByProject = async (projectId) => {
  return await fileRepo.findByProject(projectId)
}

const getUrlFromKey = async (objectKey) => {
  if (!objectKey) return null
  return `${PUBLIC_URL}/${objectKey}`
}

const remove = async (objectKey) => {
  if (!objectKey) return
  await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: objectKey }))
}

module.exports = {
  upload,
  uploadForProject,
  listByProject,
  getUrlFromKey,
  remove,
}