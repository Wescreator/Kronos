// ─────────────────────────────────────────────────────────────────
// KRONOS — Sistema de permissões centralizado
// Mapeamento de roles:
//   admin   → Administrador
//   manager → Arquiteto
//   member  → Estagiário
// ─────────────────────────────────────────────────────────────────

export const ROLE_LABELS = {
  admin:   'Administrador',
  manager: 'Arquiteto',
  member:  'Estagiário',
}

export const ROLE_STYLES = {
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
  member: {
    background: 'rgba(52,211,153,0.10)',
    color:      '#34D399',
    border:     '1px solid rgba(52,211,153,0.20)',
  },
}

// ─────────────────────────────────────────────────────────────────
// MÓDULOS VISÍVEIS POR PERFIL
// ─────────────────────────────────────────────────────────────────

export const VISIBLE_MODULES = {
  admin:   ['dashboard', 'projects', 'tasks', 'financial', 'chat', 'team' , 'agenda' , 'proposals'],
  manager: ['projects',  'tasks',    'chat',  'team' , 'agenda' , 'proposals'],
  member:  ['projects',  'tasks',    'chat',  'team' , 'agenda' , 'proposals'],
}

// ─────────────────────────────────────────────────────────────────
// PERMISSÕES GRANULARES POR MÓDULO E AÇÃO
// ─────────────────────────────────────────────────────────────────

export const PERMISSIONS = {
  dashboard: {
    view:   ['admin'],
  },

  projects: {
    view:   ['admin', 'manager', 'member'],
    create: ['admin', 'manager'],
    edit:   ['admin', 'manager'],
    delete: ['admin'],
  },

  tasks: {
    view:         ['admin', 'manager', 'member'],
    create:       ['admin', 'manager', 'member'],
    edit:         ['admin', 'manager', 'member'],
    updateStatus: ['admin', 'manager', 'member'],
    comment:      ['admin', 'manager', 'member'],
    delete:       ['admin'],
  },

  financial: {
    view:   ['admin'],
    create: ['admin'],
    edit:   ['admin'],
    delete: ['admin'],
  },

  chat: {
    view:       ['admin', 'manager', 'member'],
    send:       ['admin', 'manager', 'member'],
    createRoom: ['admin', 'manager', 'member'],
  },

  team: {
    view:         ['admin', 'manager', 'member'],
    createMember: ['admin'],
    editMember:   ['admin'],
    toggleStatus: ['admin'],
  },
  
  agenda: {
    view:   ['admin', 'manager', 'member'],
    create: ['admin', 'manager'],
    edit:   ['admin', 'manager'],
    delete: ['admin'],
  },
proposals: {
  view:      ['admin', 'manager', 'member'],
  create:    ['admin', 'manager'],
  edit:      ['admin', 'manager'],
  duplicate: ['admin', 'manager'],
  delete:    ['admin'],
},}

// ─────────────────────────────────────────────────────────────────
// FUNÇÕES DE VERIFICAÇÃO
// ─────────────────────────────────────────────────────────────────

/**
 * Verifica se um perfil tem permissão para uma ação em um módulo
 * @param {string} role   - 'admin' | 'manager' | 'member'
 * @param {string} module - 'projects' | 'tasks' | 'financial' | etc
 * @param {string} action - 'view' | 'create' | 'edit' | 'delete' | etc
 * @returns {boolean}
 */
export const can = (role, module, action) => {
  if (!role || !module || !action) return false
  const allowed = PERMISSIONS[module]?.[action]
  if (!allowed) return false
  return allowed.includes(role)
}

/**
 * Verifica se um módulo é visível para o perfil
 * @param {string} role
 * @param {string} module
 * @returns {boolean}
 */
export const canSeeModule = (role, module) => {
  if (!role || !module) return false
  return VISIBLE_MODULES[role]?.includes(module) ?? false
}