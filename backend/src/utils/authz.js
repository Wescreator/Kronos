const projectRepo = require('../repositories/project.repository')

const COMPANY_ADMIN_ROLES = ['owner', 'admin']

// Owner/Admin têm acesso total dentro da própria empresa; Developer tem
// acesso total e irrestrito em todas as empresas (mesmo bypass global já
// existente em BYPASS_ROLES no auth.middleware.js).
const hasFullAccess = (role) => role === 'developer' || COMPANY_ADMIN_ROLES.includes(role)

// Editar ou excluir um item específico (etapa, fase, comentário, anexo):
// só quem criou aquele item, ou quem tem acesso total.
const canManageResource = (resourceCreatorId, req) => {
  if (hasFullAccess(req.user.role)) return true
  return !!resourceCreatorId && resourceCreatorId === req.user.user_id
}

// Criar/editar/anexar/comentar/reordenar dentro de um projeto: precisa
// ter acesso total, OU estar vinculado ao projeto (project_members).
const assertProjectAccess = async (projectId, req) => {
  if (hasFullAccess(req.user.role)) return true
  const isMember = await projectRepo.isMember(projectId, req.user.user_id)
  if (!isMember) {
    throw { status: 403, message: 'Você precisa estar vinculado a este projeto para realizar esta ação' }
  }
  return true
}

module.exports = { hasFullAccess, canManageResource, assertProjectAccess, COMPANY_ADMIN_ROLES }