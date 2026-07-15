const taskRepo    = require('../repositories/task.repository')
const AppError = require('../utils/AppError')
const notificationService = require('./notification.service')
const fileService = require('./file.service')
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
  if (!task) throw new AppError(404, 'Tarefa não encontrada')
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

    for (const uid of data.assignees) {
      await notificationService.notify({
        companyId,
        userId: uid,
        type:   'task_assigned',
        title:  `Nova tarefa: ${task.title}`,
        body:   task.description || null,
        link:   `/app/tasks/${task.id}`,
      })
    }
  }

  return await taskRepo.findById(task.id, companyId)
}

const update = async (id, data, userId, companyId) => {
  const task = await taskRepo.findById(id, companyId)
  if (!task) throw new AppError(404, 'Tarefa não encontrada')

  const fields = {}
  const allowed = ['title','description','project_id','priority','status','due_date']
  for (const key of allowed) {
    if (data[key] !== undefined) fields[key] = data[key]
  }

  // due_date vazio (usuário limpou o prazo) → null; sem isso o UPDATE gravaria
  // '' numa coluna DATE e o Postgres rejeitaria. due_date válido é uma string
  // 'YYYY-MM-DD' (ver task.validator) — gravada sem conversão de fuso.
  if (fields.due_date === '') fields.due_date = null

  if (data.status === 'completed' && task.status !== 'completed') {
    fields.completed_at = new Date()
  }

  if (Object.keys(fields).length) {
    await taskRepo.update(id, companyId, fields)
  }

  if (data.assignees !== undefined) {
    // Notifica apenas quem foi adicionado agora — quem já era assignee
    // antes da alteração não recebe notificação de novo.
    const oldAssigneeIds = (task.assignees || []).map(a => a.id)
    const newAssigneeIds = data.assignees
    const addedIds = newAssigneeIds.filter(uid => !oldAssigneeIds.includes(uid))

    await taskRepo.setAssignees(id, newAssigneeIds, companyId)

    for (const uid of addedIds) {
      await notificationService.notify({
        companyId,
        userId: uid,
        type:   'task_assigned',
        title:  `Você foi atribuído à tarefa: ${task.title}`,
        body:   task.description || null,
        link:   `/app/tasks/${id}`,
      })
    }
  }

  return await taskRepo.findById(id, companyId)
}

const remove = async (id, companyId) => {
  const task = await taskRepo.findById(id, companyId)
  if (!task) throw new AppError(404, 'Tarefa não encontrada')
  await taskRepo.remove(id, companyId)
}

// `file` é o objeto do multer em memória (buffer) ou null. O upload vai
// para o R2 — o disco do Render é efêmero e perdia os anexos a cada
// deploy. (Antes deste ajuste o objeto do multer era gravado cru na
// coluna file_url, quebrando o anexo de comentário.)
const addComment = async (taskId, userId, content, file, companyId) => {
  const task = await taskRepo.findById(taskId, companyId)
  if (!task) throw new AppError(404, 'Tarefa não encontrada')

  let fileUrl = null
  if (file) {
    const { url } = await fileService.upload({
      buffer:           file.buffer,
      originalFilename: file.originalname,
      mimeType:         file.mimetype,
      folder:           'task-comments',
    })
    fileUrl = url
  }

  return await taskRepo.addComment(taskId, userId, content, fileUrl)
}

const getDashboardStats = async (companyId) => {
  return await taskRepo.getDashboardStats(companyId)
}

module.exports = { getAll, getById, create, update, remove, addComment, getDashboardStats }