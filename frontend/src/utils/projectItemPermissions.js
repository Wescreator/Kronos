const ADMIN_ROLES = ['developer', 'owner', 'admin']

// Owner/Admin têm acesso total dentro da empresa; Developer tem acesso
// total e irrestrito em todo o sistema.
export const hasFullAccess = (role) => ADMIN_ROLES.includes(role)

// Editar/excluir um item específico (etapa, fase, comentário, anexo):
// só quem criou aquele item, ou quem tem acesso total. Espelha
// exatamente canManageResource() no backend (utils/authz.js) — mantenha
// as duas em sincronia se a regra mudar.
export const canManageItem = (creatorId, user) => {
  if (!user) return false
  if (hasFullAccess(user.role)) return true
  return !!creatorId && creatorId === user.user_id
}