// ─────────────────────────────────────────────────────────────────
// KRONOS — Sistema de permissões centralizado
//
// Roles do sistema:
//   ESCOPO GLOBAL:
//     developer → acesso total à plataforma, sem vínculo de empresa
//
//   ESCOPO EMPRESA:
//     owner    → proprietário da empresa
//     admin    → administrador (ex-admin)
//     manager  → gestor (ex-manager / Arquiteto)
//     employee → colaborador (Estagiário)
//
// ─────────────────────────────────────────────────────────────────

export const ROLE_LABELS = {
  developer: 'Developer',
  owner:     'Owner',
  admin:     'Administrador',
  manager:   'Arquiteto',
  employee:  'Estagiário',   
}

export const ROLE_STYLES = {
  developer: {
    background: 'rgba(251,191,36,0.12)',
    color:      '#FBB024',
    border:     '1px solid rgba(251,191,36,0.25)',
  },
  owner: {
    background: 'rgba(239,68,68,0.10)',
    color:      '#F87171',
    border:     '1px solid rgba(239,68,68,0.20)',
  },
  admin: {
    background: 'rgba(167,139,250,0.12)',
    color:      '#A78BFA',
    border:     '1px solid rgba(167,139,250,0.25)',
  },
  manager: {
    background: 'rgba(56,189,248,0.10)',
    color:      '#38BDF8',
    border:     '1px solid rgba(56,189,248,0.20)',
  },
  employee: {
    background: 'rgba(52,211,153,0.10)',
    color:      '#34D399',
    border:     '1px solid rgba(52,211,153,0.20)',
  },
}

// ─────────────────────────────────────────────────────────────────
// MÓDULOS VISÍVEIS POR PERFIL
// ─────────────────────────────────────────────────────────────────

const ALL_MODULES = ['dashboard', 'projects', 'clients', 'tasks', 'financial', 'chat', 'team', 'agenda', 'proposals', 'posts', 'budgets']
export const VISIBLE_MODULES = {
  developer: ALL_MODULES,
  owner:     ALL_MODULES,
  admin:     ALL_MODULES,
  manager:   ['projects', 'clients', 'tasks', 'chat', 'team', 'agenda', 'proposals', 'posts', 'budgets'],
  employee:  ['projects', 'clients', 'tasks', 'chat', 'team', 'agenda', 'proposals', 'posts', 'budgets'],
}
// ─────────────────────────────────────────────────────────────────

const ADMIN_ROLES = ['developer', 'owner', 'admin']
const ALL_ROLES   = ['developer', 'owner', 'admin', 'manager', 'employee']

export const PERMISSIONS = {
  dashboard: {
    view: ADMIN_ROLES,
  },

  projects: {
    view:   ALL_ROLES,
    create: [...ADMIN_ROLES, 'manager'],
    edit:   [...ADMIN_ROLES, 'manager'],
    delete: ADMIN_ROLES,
  },

  // NOVO — módulo de Clientes/Leads (CRM, ClientsPage.jsx). Antes deste
  // bloco, can(role, 'clients', 'delete') sempre retornava false pra
  // qualquer role (exceto developer, que tem bypass), pois PERMISSIONS
  // não tinha a chave "clients" — o botão Excluir nunca aparecia pra
  // admin/owner. view/create/edit ficam liberados a todos porque a tela
  // já não fazia nenhuma checagem de permissão pra essas ações.
  clients: {
    view:   ALL_ROLES,
    create: ALL_ROLES,
    edit:   ALL_ROLES,
    delete: ADMIN_ROLES,
  },

  tasks: {
    view:         ALL_ROLES,
    create:       ALL_ROLES,
    edit:         ALL_ROLES,
    updateStatus: ALL_ROLES,
    comment:      ALL_ROLES,
    delete:       ADMIN_ROLES,
  },

  financial: {
    view:   ADMIN_ROLES,
    create: ADMIN_ROLES,
    edit:   ADMIN_ROLES,
    delete: ADMIN_ROLES,
  },

  chat: {
    view:       ALL_ROLES,
    send:       ALL_ROLES,
    createRoom: ALL_ROLES,
  },

  team: {
    view:         ALL_ROLES,
    createMember: ADMIN_ROLES,
    editMember:   ADMIN_ROLES,
    toggleStatus: ADMIN_ROLES,
  },

  agenda: {
    view:   ALL_ROLES,
    create: [...ADMIN_ROLES, 'manager'],
    edit:   [...ADMIN_ROLES, 'manager'],
    delete: ADMIN_ROLES,
  },

  proposals: {
    view:      ALL_ROLES,
    create:    [...ADMIN_ROLES, 'manager'],
    edit:      [...ADMIN_ROLES, 'manager'],
    duplicate: [...ADMIN_ROLES, 'manager'],
    delete:    ADMIN_ROLES,
  },

  // NOVO — módulo de Postagens (feed).
  // "edit"/"delete"/"attach" aqui refletem a visão de ADMIN (vale para
  // qualquer postagem da empresa). A regra "ou quem criou a postagem" não
  // dá para expressar numa lista estática de roles — é checada no
  // componente comparando post.created_by com o id do usuário logado,
  // igual ao backend faz em post.service.js (canManagePost).
  posts: {
    view:    ALL_ROLES,
    create:  ALL_ROLES,
    comment: ALL_ROLES,
    edit:    ADMIN_ROLES,
    delete:  ADMIN_ROLES,
    attach:  ADMIN_ROLES,
  },
  budgets: {
  view:         ALL_ROLES,
  create:       [...ADMIN_ROLES, 'manager'],
  edit:         [...ADMIN_ROLES, 'manager'],
  finalize:     [...ADMIN_ROLES, 'manager'],
  recalculate:  [...ADMIN_ROLES, 'manager'],
  delete:       ADMIN_ROLES,
  // Configuração de Títulos/Níveis/Taxas — estrutural, só admin+ (espelha
  // authorize('admin') no backend em budgetConfig.routes.js)
  manageConfig: ADMIN_ROLES,
},
}

// ─────────────────────────────────────────────────────────────────
// FUNÇÕES DE VERIFICAÇÃO
// ─────────────────────────────────────────────────────────────────

/**
 * Verifica se um perfil tem permissão para uma ação em um módulo.
 * Developer sempre retorna true (acesso global).
 *
 * @param {string} role   - 'developer'|'owner'|'admin'|'manager'|'employee'|'member'
 * @param {string} module - 'projects' | 'tasks' | 'financial' | etc
 * @param {string} action - 'view' | 'create' | 'edit' | 'delete' | etc
 * @returns {boolean}
 */
export const can = (role, module, action) => {
  if (!role || !module || !action) return false
  if (role === 'developer') return true
  const allowed = PERMISSIONS[module]?.[action]
  if (!allowed) return false
  return allowed.includes(role)
}

/**
 * Verifica se um módulo é visível para o perfil.
 *
 * @param {string} role
 * @param {string} module
 * @returns {boolean}
 */
export const canSeeModule = (role, module) => {
  if (!role || !module) return false
  if (role === 'developer') return true
  return VISIBLE_MODULES[role]?.includes(module) ?? false
}

/**
 * Verifica se o usuário tem escopo global (developer / support).
 *
 * @param {string} scope - 'global' | 'company'
 * @returns {boolean}
 */
export const isGlobalScope = (scope) => scope === 'global'

/**
 * NOVO — verifica se um usuário pode gerenciar (editar/excluir/anexar em)
 * uma postagem específica: admin da empresa OU quem criou a postagem.
 * Espelha exatamente canManagePost() em post.service.js no backend —
 * mantenha as duas em sincronia se a regra mudar.
 *
 * @param {{ created_by: string }} post
 * @param {{ role: string, user_id: string }} user
 * @returns {boolean}
 */
export const canManagePost = (post, user) => {
  if (!post || !user) return false
  if (ADMIN_ROLES.includes(user.role)) return true
  return post.created_by === user.user_id
}