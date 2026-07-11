const { Readable } = require('stream')
const drive = require('../config/google-drive')
const { validateFileSignature } = require('../utils/fileSignature')

/**
 * Cria uma pasta no Google Drive.
 * SEMPRE usa parentId (ID), nunca nome de pasta.
 */
async function createFolder(name, parentId) {
  console.log(`[Drive] Criando pasta "${name}" | parent: ${parentId}`)

  const response = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents:  [parentId],   // ID obrigatório — nunca usar nome
    },
    fields:            'id, webViewLink',
    supportsAllDrives: true,
  })

  const folderId  = response.data.id
  const folderUrl = response.data.webViewLink

  console.log(`[Drive] Pasta criada. ID: ${folderId} | URL: ${folderUrl}`)
  return { id: folderId, url: folderUrl }
}

/**
 * Retorna o ID da pasta de empresa dentro da raiz KRONOS.
 * Cria a pasta se ainda não existir.
 * Preparado para futura arquitetura multiempresa.
 */
async function getOrCreateCompanyFolder(companyName = 'Empresa Principal') {
  const rootId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID
  if (!rootId) throw new Error('GOOGLE_DRIVE_ROOT_FOLDER_ID não configurado no .env')

  console.log(`[Drive] Buscando pasta de empresa "${companyName}" | root: ${rootId}`)

  const res = await drive.files.list({
    q: `name = '${companyName}' and '${rootId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields:                    'files(id, name)',
    supportsAllDrives:         true,
    includeItemsFromAllDrives: true,
  })

  if (res.data.files.length > 0) {
    const existing = res.data.files[0]
    console.log(`[Drive] Pasta de empresa encontrada. ID: ${existing.id}`)
    return existing.id
  }

  console.log(`[Drive] Pasta de empresa não encontrada. Criando...`)
  const folder = await createFolder(companyName, rootId)
  return folder.id
}

/**
 * Cria pasta do projeto dentro da pasta de empresa.
 * Fluxo garantido: empresa → projeto (await em cada etapa).
 */
async function createProjectFolder(projectName, companyName = 'Empresa Principal') {
  // Passo 1: garante que pasta de empresa existe e aguarda conclusão
  const companyFolderId = await getOrCreateCompanyFolder(companyName)

  // Passo 2: cria pasta do projeto APÓS confirmar o ID da empresa
  console.log(`[Drive] Criando pasta do projeto "${projectName}" | parent: ${companyFolderId}`)
  const folder = await createFolder(projectName, companyFolderId)

  console.log(`[Drive] Pasta do projeto pronta. ID: ${folder.id}`)
  return { id: folder.id, url: folder.url }
}

/**
 * Faz upload de um arquivo para uma pasta específica no Google Drive.
 * Recebe buffer de memória — sem gravação local.
 * Valida que o arquivo foi para o parent correto após upload.
 */
async function uploadFile(buffer, originalName, mimeType, folderId) {
  if (!folderId) throw new Error('folderId é obrigatório para upload no Drive')

  // Barra arquivo disfarçado (MIME falsificável do multer) antes de subir.
  validateFileSignature(buffer, mimeType)

  console.log(`[Drive] Upload iniciado: "${originalName}" | destino: ${folderId}`)

  const stream = Readable.from(buffer)

  const response = await drive.files.create({
    requestBody: {
      name:    originalName,
      parents: [folderId],   // ID da pasta do projeto — nunca nome
    },
    media: {
      mimeType,
      body: stream,
    },
    fields:            'id, webViewLink, parents',
    supportsAllDrives: true,
  })

  const fileId  = response.data.id
  const fileUrl = response.data.webViewLink
  const parents = response.data.parents

  console.log(`[Drive] Upload concluído. ID: ${fileId} | URL: ${fileUrl}`)
  console.log(`[Drive] Parents do arquivo: ${JSON.stringify(parents)}`)

  // Validação: confirma que o arquivo está na pasta correta
  if (!parents || !parents.includes(folderId)) {
    console.warn(`[Drive] AVISO: arquivo não está no parent esperado (${folderId}). Parents reais: ${JSON.stringify(parents)}`)
  }

  return { id: fileId, url: fileUrl }
}

module.exports = { createProjectFolder, uploadFile }