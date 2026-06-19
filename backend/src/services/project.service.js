const projectRepo = require('../repositories/project.repository')
const stageRepo   = require('../repositories/stage.repository')
const { paginate, paginatedResponse } = require('../utils/pagination')

function buildProjectPayload(data, userId, companyId) {
  return {
    companyId,   // sempre vem de req.tenant.id — nunca do body
    title:        data.title?.trim(),
    client:       data.client?.trim(),
    description:  data.description,
    budget:       data.budget || 0,
    startDate:    data.start_date,
    expectedDate: data.expected_date,
    ownerId:      data.owner_id || userId,
    createdBy:    userId,
  }
}

const getAll = async (query, companyId) => {
  const { page, limit, offset } = paginate(query)
  const { rows, total } = await projectRepo.findAll({
    companyId, limit, offset,
    status: query.status,
    search: query.search,
  })
  return paginatedResponse(rows, total, page, limit)
}

const getById = async (id, companyId) => {
  const project = await projectRepo.findById(id, companyId)
  if (!project) throw { status: 404, message: 'Projeto não encontrado' }
  const members = await projectRepo.findMembers(id)
  return { ...project, members }
}

const create = async (data, userId, companyId) => {
  const project = await projectRepo.create(buildProjectPayload(data, userId, companyId))

  await projectRepo.addMember(project.id, userId, 'manager')
  await projectRepo.addStatusHistory(project.id, null, 'in_progress', userId, 'Projeto criado')
  await stageRepo.createDefaultStages(project.id)

  return project
}

const update = async (id, data, userId, companyId) => {
  const project = await projectRepo.findById(id, companyId)
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

  return projectRepo.update(id, companyId, fields)
}

const updateCover = async (id, fileUrl, companyId) => {
  const project = await projectRepo.updateCover(id, companyId, fileUrl)
  if (!project) throw { status: 404, message: 'Projeto não encontrado' }
  return project
}

const getStatusHistory = async (id, companyId) => {
  const project = await projectRepo.findById(id, companyId)
  if (!project) throw { status: 404, message: 'Projeto não encontrado' }
  return projectRepo.findStatusHistory(id)
}

const addMember = async (projectId, userId, companyId) => {
  const project = await projectRepo.findById(projectId, companyId)
  if (!project) throw { status: 404, message: 'Projeto não encontrado' }
  await projectRepo.addMember(projectId, userId)
}

const removeMember = async (projectId, userId, companyId) => {
  const project = await projectRepo.findById(projectId, companyId)
  if (!project) throw { status: 404, message: 'Projeto não encontrado' }
  await projectRepo.removeMember(projectId, userId)
}

module.exports = {getAll, getById, create, update, updateCover, getStatusHistory, addMember, removeMember,}