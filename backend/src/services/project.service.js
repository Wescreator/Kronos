const projectRepo = require('../repositories/project.repository')
const stageRepo   = require('../repositories/stage.repository')
const driveService = require('./drive.service')
const { paginate, paginatedResponse } = require('../utils/pagination')

function buildProjectPayload(data, userId) {
  return {
    title:        data.title?.trim(),
    client:       data.client?.trim(),
    description:  data.description,
    budget:       data.budget || 0,
    startDate:    data.start_date,
    expectedDate: data.expected_date,
    ownerId:      data.owner_id || userId,
    createdBy:    userId,
    company_id:   data.company_id ?? null,
  }
}

const getAll = async (query) => {
  const { page, limit, offset } = paginate(query)
  const { rows, total } = await projectRepo.findAll({
    limit, offset,
    status: query.status,
    search: query.search,
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
  const project = await projectRepo.create(buildProjectPayload(data, userId))

  await projectRepo.addMember(project.id, userId, 'manager')
  await projectRepo.addStatusHistory(project.id, null, 'in_progress', userId, 'Projeto criado')
  await stageRepo.createDefaultStages(project.id)

  try {
    console.log(`[Project] Criando pasta no Google Drive para: "${project.title}"`)
    const driveFolder = await driveService.createProjectFolder(project.title)
    const updated = await projectRepo.update(project.id, {
      drive_folder_id:  driveFolder.id,
      drive_folder_url: driveFolder.url,
    })
    console.log(`[Project] drive_folder_id salvo: ${driveFolder.id}`)
    return updated
  } catch (err) {
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
  const allowedFields = [
    'title', 'client', 'description', 'budget', 'status',
    'start_date', 'expected_date', 'completed_date', 'owner_id',
  ]
  for (const field of allowedFields) {
    if (data[field] !== undefined) fields[field] = data[field]
  }

  return projectRepo.update(id, fields)
}

const updateCover = async (id, fileUrl) => {
  return projectRepo.updateCover(id, fileUrl)
}

const getStatusHistory = async (id) => {
  return projectRepo.findStatusHistory(id)
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
  getStatusHistory, addMember, removeMember,
}