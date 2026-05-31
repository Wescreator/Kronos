const projectRepo = require('../repositories/project.repository')
const { paginate, paginatedResponse } = require('../utils/pagination')

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
  await projectRepo.addStatusHistory(project.id, null, 'planning', userId, 'Projeto criado')

  return project
}

const update = async (id, data, userId) => {
  const project = await projectRepo.findById(id)
  if (!project) throw { status: 404, message: 'Projeto não encontrado' }

  if (data.status && data.status !== project.status) {
    await projectRepo.addStatusHistory(id, project.status, data.status, userId, data.status_note)
  }

  const fields = {}
  const allowed = ['title','client','description','budget','status','progress',
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

module.exports = { getAll, getById, create, update, updateCover, getStatusHistory, addMember, removeMember }