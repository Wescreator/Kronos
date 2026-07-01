const taskRepo    = require('../repositories/task.repository')
const { paginate, paginatedResponse } = require('../utils/pagination')

const getAll = async (query, companyId) => {
  const { page, limit, offset } = paginate(query)
  const { rows, total } = await taskRepo.findAll({
    companyId,
    limit, offset,
    status:    query.status,
    priority:  query.priority,
    projectId: query.project_id,
    userId:    query.user_id,
    search:    query.search
  })
  return paginatedResponse(rows, total, page, limit)
}

const getById = async (id, companyId) => {
  const task = await taskRepo.findById(id, companyId)
  if (!task) throw { status: 404, message: 'Tarefa não encontrada' }
  const comments = await taskRepo.findComments(id)
  return { ...task, comments }
}

const create = async (data, userId, companyId) => {
  const task = await taskRepo.create({
    companyId,
    title:       data.title,
    description: data.description,
    projectId:   data.project_id || null,
    priority:    data.priority   || 'medium',
    dueDate:     data.due_date   || null,
    createdBy:   userId
  })

  if (data.assignees?.length) {
    await taskRepo.setAssignees(task.id, data.assignees, companyId)
  }

  return await taskRepo.findById(task.id, companyId)
}

const update = async (id, data, userId, companyId) => {
  const task = await taskRepo.findById(id, companyId)
  if (!task) throw { status: 404, message: 'Tarefa não encontrada' }

  const fields = {}
  const allowed = ['title','description','project_id','priority','status','due_date']
  for (const key of allowed) {
    if (data[key] !== undefined) fields[key] = data[key]
  }

  if (data.status === 'completed' && task.status !== 'completed') {
    fields.completed_at = new Date()
  }

  if (Object.keys(fields).length) {
    await taskRepo.update(id, companyId, fields)
  }

  if (data.assignees !== undefined) {
    await taskRepo.setAssignees(id, data.assignees, companyId)
  }

  return await taskRepo.findById(id, companyId)
}

const remove = async (id, companyId) => {
  const task = await taskRepo.findById(id, companyId)
  if (!task) throw { status: 404, message: 'Tarefa não encontrada' }
  await taskRepo.remove(id, companyId)
}

const addComment = async (taskId, userId, content, fileUrl, companyId) => {
  const task = await taskRepo.findById(taskId, companyId)
  if (!task) throw { status: 404, message: 'Tarefa não encontrada' }
  return await taskRepo.addComment(taskId, userId, content, fileUrl)
}

const getDashboardStats = async (companyId) => {
  return await taskRepo.getDashboardStats(companyId)
}

module.exports = { getAll, getById, create, update, remove, addComment, getDashboardStats }