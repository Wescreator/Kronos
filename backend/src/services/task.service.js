const taskRepo    = require('../repositories/task.repository')
const { paginate, paginatedResponse } = require('../utils/pagination')

const getAll = async (query) => {
  const { page, limit, offset } = paginate(query)
  const { rows, total } = await taskRepo.findAll({
    limit, offset,
    status:    query.status,
    priority:  query.priority,
    projectId: query.project_id,
    userId:    query.user_id
  })
  return paginatedResponse(rows, total, page, limit)
}

const getById = async (id) => {
  const task = await taskRepo.findById(id)
  if (!task) throw { status: 404, message: 'Tarefa não encontrada' }
  const comments = await taskRepo.findComments(id)
  return { ...task, comments }
}

const create = async (data, userId) => {
  const task = await taskRepo.create({
    title:       data.title,
    description: data.description,
    projectId:   data.project_id || null,
    priority:    data.priority   || 'medium',
    dueDate:     data.due_date   || null,
    createdBy:   userId
  })

  if (data.assignees?.length) {
    await taskRepo.setAssignees(task.id, data.assignees)
  }

  return await taskRepo.findById(task.id)
}

const update = async (id, data, userId) => {
  const task = await taskRepo.findById(id)
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
    await taskRepo.update(id, fields)
  }

  if (data.assignees !== undefined) {
    await taskRepo.setAssignees(id, data.assignees)
  }

  return await taskRepo.findById(id)
}

const addComment = async (taskId, userId, content, fileUrl) => {
  const task = await taskRepo.findById(taskId)
  if (!task) throw { status: 404, message: 'Tarefa não encontrada' }
  return await taskRepo.addComment(taskId, userId, content, fileUrl)
}

const getDashboardStats = async () => {
  return await taskRepo.getDashboardStats()
}

module.exports = { getAll, getById, create, update, addComment, getDashboardStats }