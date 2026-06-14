const projectRepo = require('../repositories/project.repository')
const pool        = require('../config/database')
const driveService = require('./drive.service')   // novo
const { paginate, paginatedResponse } = require('../utils/pagination')

const DEFAULT_STAGES = [
  { stage_name: 'Estudo Preliminar', stage_order: 1 },
  { stage_name: 'Projeto Básico',    stage_order: 2 },
  { stage_name: 'Ante Projeto',      stage_order: 3 },
  { stage_name: 'Executivo',         stage_order: 4 },
  { stage_name: 'Entrega Final',     stage_order: 5 },
]

async function createDefaultStages(projectId) {
  for (const s of DEFAULT_STAGES) {
    await pool.query(
      'INSERT INTO project_stages (project_id, stage_name, stage_order) VALUES ($1,$2,$3)',
      [projectId, s.stage_name, s.stage_order]
    )
  }
}

const getAll = async (query) => {
  const { page, limit, offset } = paginate(query)
  const { rows, total } = await projectRepo.findAll({
    limit, offset,
    status: query.status,
    search: query.search
  })
  return paginatedResponse(rows, total, page, limit)
}

const getById = async (id) => {
  const project = await projectRepo.findById(id)
  if (!project) throw { status: 404, message: 'Projeto não encontrado' }
  const members = await projectRepo.findMembers(id)
  return { ...project, members }
}

const create = async (data, userId) => {
  // Cria o projeto no banco
  const project = await projectRepo.create({
    title:        data.title,
    client:       data.client,
    description:  data.description,
    budget:       data.budget || 0,
    startDate:    data.start_date,
    expectedDate: data.expected_date,
    ownerId:      data.owner_id || userId,
    createdBy:    userId
  })

  await projectRepo.addMember(project.id, userId, 'manager')
  await projectRepo.addStatusHistory(project.id, null, 'in_progress', userId, 'Projeto criado')
  await createDefaultStages(project.id)

  // Cria pasta no Google Drive (aguarda conclusão antes de salvar o ID)
  try {
    console.log(`[Project] Criando pasta no Google Drive para: "${project.title}"`)
    const driveFolder = await driveService.createProjectFolder(project.title)

    // Salva drive_folder_id e drive_folder_url no projeto
    const updated = await projectRepo.update(project.id, {
      drive_folder_id:  driveFolder.id,
      drive_folder_url: driveFolder.url,
    })

    console.log(`[Project] drive_folder_id salvo: ${driveFolder.id}`)
    return updated
  } catch (err) {
    // Falha no Drive não bloqueia criação do projeto
    // Upload posterior irá retornar erro orientado ao usuário
    console.error(`[Project] Falha ao criar pasta no Drive: ${err.message}`)
    return project
  }
}

const update = async (id, data, userId) => {
  const project = await projectRepo.findById(id)
  if (!project) throw { status: 404, message: 'Projeto não encontrado' }

  if (data.status && data.status !== project.status) {
    await projectRepo.addStatusHistory(id, project.status, data.status, userId, data.status_note)
  }

  const fields = {}
  const allowed = ['title','client','description','budget','status',
                   'start_date','expected_date','completed_date','owner_id']
  for (const key of allowed) {
    if (data[key] !== undefined) fields[key] = data[key]
  }

  return await projectRepo.update(id, fields)
}

const updateCover = async (id, fileUrl) => {
  return await projectRepo.updateCover(id, fileUrl)
}

const getStatusHistory = async (id) => {
  return await projectRepo.findStatusHistory(id)
}

const addMember = async (projectId, userId) => {
  const project = await projectRepo.findById(projectId)
  if (!project) throw { status: 404, message: 'Projeto não encontrado' }
  await projectRepo.addMember(projectId, userId)
}

const removeMember = async (projectId, userId) => {
  await projectRepo.removeMember(projectId, userId)
}

module.exports = {
  getAll, getById, create, update, updateCover,
  getStatusHistory, addMember, removeMember
}