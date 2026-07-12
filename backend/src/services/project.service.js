const projectRepo = require('../repositories/project.repository')
const AppError = require('../utils/AppError')
const companyRepo = require('../repositories/company.repository')
const notificationService = require('./notification.service')
const { paginate, paginatedResponse } = require('../utils/pagination')

function buildProjectPayload(data, userId, companyId) {
  return {
    companyId,
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
  if (!project) throw new AppError(404, 'Projeto não encontrado')
  const members = await projectRepo.findMembers(id)
  return { ...project, members }
}

const create = async (data, userId, companyId) => {
  const project = await projectRepo.create(buildProjectPayload(data, userId, companyId))

  await projectRepo.addMember(project.id, userId, 'manager')
  await projectRepo.addStatusHistory(project.id, companyId, null, 'in_progress', userId, 'Projeto criado')
  // Etapas não são mais criadas automaticamente — o usuário cria
  // manualmente na Project DetailPage (aba Etapas).

  return project
}

const update = async (id, data, userId, companyId) => {
  const fields = {}
  const allowedFields = [
    'title', 'client', 'description', 'budget', 'status',
    'start_date', 'expected_date', 'completed_date', 'owner_id',
  ]
  for (const field of allowedFields) {
    if (data[field] !== undefined) fields[field] = data[field]
  }

  // A comparação do status e o registro do histórico acontecem sob lock dentro
  // do repositório — ler o status aqui fora abriria a janela de corrida que
  // duplicava o histórico quando duas requisições chegavam juntas.
  const updated = await projectRepo.updateWithStatusHistory(
    id, companyId, fields, userId, data.status_note
  )
  if (!updated) throw new AppError(404, 'Projeto não encontrado')

  return updated
}

const updateCover = async (id, fileUrl, companyId) => {
  const project = await projectRepo.updateCover(id, companyId, fileUrl)
  if (!project) throw new AppError(404, 'Projeto não encontrado')
  return project
}

const getStatusHistory = async (id, companyId) => {
  const project = await projectRepo.findById(id, companyId)
  if (!project) throw new AppError(404, 'Projeto não encontrado')
  return projectRepo.findStatusHistory(id)
}

const addMember = async (projectId, userId, companyId) => {
  const project = await projectRepo.findById(projectId, companyId)
  if (!project) throw new AppError(404, 'Projeto não encontrado')

  const link = await companyRepo.findCompanyUser(companyId, userId)
  if (!link) throw new AppError(400, 'Usuário não pertence a esta empresa')

  const { created } = await projectRepo.addMember(projectId, userId)

  // Só notifica quando o vínculo é NOVO. Repetir a requisição (duplo clique,
  // retry, outra aba) agora é inócuo em vez de gerar 500 ou notificação
  // duplicada — o resultado é o mesmo do primeiro envio.
  if (!created) return

  await notificationService.notify({
    companyId,
    userId,
    type:  'project_update',
    title: `Você foi adicionado ao projeto: ${project.title}`,
    link:  `/app/projects/${projectId}`,
  })
}

const removeMember = async (projectId, userId, companyId) => {
  const project = await projectRepo.findById(projectId, companyId);
  if (!project) throw new AppError(404, 'Projeto não encontrado');
  const wasDeleted = await projectRepo.removeMember(projectId, userId);
  if (!wasDeleted) {
    throw new AppError(404, 'Membro não encontrado');}
  return await projectRepo.findMembers(projectId);
};

const remove = async (id, companyId) => {
  const project = await projectRepo.findById(id, companyId)
  if (!project) throw new AppError(404, 'Projeto não encontrado')

  const dep = await projectRepo.countDependents(id)
  const blocks = []
  if (dep.tasks    > 0) blocks.push(`${dep.tasks} tarefa(s)`)
  if (dep.expenses > 0) blocks.push(`${dep.expenses} despesa(s)`)
  if (dep.revenues > 0) blocks.push(`${dep.revenues} receita(s)`)
  if (dep.leads    > 0) blocks.push(`${dep.leads} cliente(s)/lead(s)`)

  if (blocks.length > 0) {
    throw new AppError(400, `Não é possível excluir: existem ${blocks.join(', ')} vinculado(s) a este projeto.`)
  }

  const deleted = await projectRepo.remove(id, companyId)
  if (!deleted) throw new AppError(404, 'Projeto não encontrado')
}

module.exports = {getAll, getById, create, update, updateCover, getStatusHistory, addMember, removeMember, remove}