const crypto = require('crypto')
const fileRepo = require('../repositories/project-file.repository')

/**
 * STORAGE ABSTRACTION (atual neutro)
 * - hoje salva apenas metadata no banco
 * - preparado para R2/S3 futuramente
 */

const generateObjectKey = (projectId, filename) => {
  const safeName = filename.replace(/\s+/g, '-').toLowerCase()
  const unique = crypto.randomUUID()
  return `projects/${projectId}/${unique}-${safeName}`
}

/**
 * Upload vinculado ao projeto (usado pelo controller principal)
 */
const uploadForProject = async ({
  buffer,
  originalFilename,
  mimeType,
  uploadedBy,
  projectId,
  companyId // futuro (já preparado)
}) => {
  if (!projectId) {
    throw { status: 400, message: 'projectId obrigatório' }
  }

  const objectKey = generateObjectKey(projectId, originalFilename)

  // ⚠️ atualmente não há storage externo real (R2/S3)
  // buffer fica ignorado por enquanto (estrutura preparada)

  const file = await fileRepo.create({
    projectId,
    uploadedBy,
    fileName: originalFilename,
    fileSize: buffer?.length || 0,
    mimeType,
    driveFileId: objectKey,
    driveUrl: null,
    company_id: companyId || null
  })

  return {
    ...file,
    object_key: objectKey
  }
}

/**
 * Upload genérico (usado no cover)
 */
const upload = async ({
  buffer,
  originalFilename,
  mimeType,
  uploadedBy,
  folder
}) => {
  const objectKey = `${folder}/${generateObjectKey('generic', originalFilename)}`

  const file = await fileRepo.create({
    projectId: null,
    uploadedBy,
    fileName: originalFilename,
    fileSize: buffer?.length || 0,
    mimeType,
    driveFileId: objectKey,
    driveUrl: null
  })

  return {
    ...file,
    object_key: objectKey
  }
}

/**
 * Lista arquivos por projeto (tenant-safe via repo)
 */
const listByProject = async (projectId) => {
  return await fileRepo.findByProject(projectId)
}

/**
 * Gera URL de acesso (stub atual)
 * futuro: Cloudflare R2 signed URL
 */
const getUrlFromKey = async (objectKey) => {
  if (!objectKey) return null

  // placeholder seguro (não quebra frontend)
  return `https://files.local/${objectKey}`
}

module.exports = {
  uploadForProject,
  upload,
  listByProject,
  getUrlFromKey
}