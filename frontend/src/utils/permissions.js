// ─────────────────────────────────────────────────────────────────
// KRONOS — Sistema de permissões centralizado
//
// Roles do sistema:
//   ESCOPO GLOBAL:
//     developer → acesso total à plataforma, sem vínculo de empresa
//     support   → leitura global (preparado, não ativo)
//
//   ESCOPO EMPRESA:
//     owner    → proprietário da empresa
//     admin    → administrador (ex-admin)
//     manager  → gestor (ex-manager / Arquiteto)
//     employee → colaborador (ex-member / Estagiário)
//
// Compatibilidade: 'member' continua funcionando como 'employee'
// ─────────────────────────────────────────────────────────────────

export const ROLE_LABELS = {
  developer: 'Developer',
  support:   'Suporte',
  owner:     'Owner',
  admin:     'Administrador',
  manager:   'Arquiteto',
  employee:  'Estagiário',
  member:    'Estagiário',     // backward compat
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
  member: {
    background: 'rgba(52,211,153,0.10)',
    color:      '#34D399',
    border:     '1px solid rgba(52,211,153,0.20)',
  },
  support: {
    background: 'rgba(251,146,60,0.10)',
    color:      '#FB923C',
    border:     '1px solid rgba(251,146,60,0.20)',
  },
}

// ─────────────────────────────────────────────────────────────────
// MÓDULOS VISÍVEIS POR PERFIL
// ─────────────────────────────────────────────────────────────────

export const VISIBLE_MODULES = {
  developer: ['dashboard', 'projects', 'tasks', 'financial', 'chat', 'team', 'agenda', 'proposals'],
  owner:     ['dashboard', 'projects', 'tasks', 'financial', 'chat', 'team', 'agenda', 'proposals'],
  admin:     ['dashboard', 'projects', 'tasks', 'financial', 'chat', 'team', 'agenda', 'proposals'],
  manager:   ['projects',  'tasks',    'chat',  'team',      'agenda', 'proposals'],
  employee:  ['projects',  'tasks',    'chat',  'team',      'agenda', 'proposals'],
  member:    ['projects',  'tasks',    'chat',  'team',      'agenda', 'proposals'],  // backward compat
}

// ─────────────────────────────────────────────────────────────────
// PERMISSÕES GRANULARES POR MÓDULO E AÇÃO
// developer e owner herdam tudo de admin
// employee herda tudo de member
// ─────────────────────────────────────────────────────────────────

const ADMIN_ROLES = ['developer', 'owner', 'admin']
const ALL_ROLES   = ['developer', 'owner', 'admin', 'manager', 'employee', 'member']

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