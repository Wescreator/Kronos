const bcrypt = require('bcryptjs')
const AppError = require('../utils/AppError')
const prisma = require('../config/prisma')
const pool = require('../config/database')
const { logActivity } = require('../utils/activityLog')

// Rótulos legíveis dos campos de empresa — usados no histórico de auditoria.
const FIELD_LABELS = {
  name:             'Nome',
  trade_name:       'Nome fantasia',
  document:         'Documento',
  email:            'E-mail',
  phone:            'Telefone',
  plan:             'Plano',
  status:           'Status',
  responsible_name: 'Responsável técnico',
  responsible_role: 'Cargo do responsável',
  financial_status: 'Situação financeira',
  financial_due_date: 'Vencimento',
  contracted_at:    'Data de contratação',
}

// Entity types que compõem o "histórico de alterações" da empresa no Admin
// (filtra o ruído do logger genérico de requisições).
const HISTORY_ENTITY_TYPES = ['company', 'company_user', 'client_access']

/**
 * Servico de plataforma (escopo global / super admin).
 */

const slugify = (s) =>
  s.toLowerCase().trim()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

// ── Empresas ────────────────────────────────────────────────────

const toCompanyDTO = (c) => ({
  id:               c.id,
  name:             c.name,
  trade_name:       c.trade_name,
  document:         c.document,
  email:            c.email,
  phone:            c.phone,
  plan:             c.plan,
  status:           c.status,
  slug:             c.slug,
  is_active:        c.isActive,
  created_at:       c.createdAt,
  logo_url:         c.logo_url,
  responsible_name: c.responsible_name,
  responsible_role: c.responsible_role,
  financial_status:   c.financial_status ?? null,
  financial_due_date: c.financial_due_date ?? null,
  contracted_at:      c.contracted_at ?? null,
})

/**
 * CORREÇÃO APLICADA AQUI:
 * removido groupBy (causa provável do 500 em runtime Prisma)
 * substituído por agregação segura via findMany + reduce
 */
const listCompanies = async () => {
  const companies = await prisma.company.findMany({
    orderBy: { name: 'asc' },
  })

  const links = await prisma.companyUser.findMany({
    select: { companyId: true },
  })

  const countMap = links.reduce((acc, l) => {
    acc[l.companyId] = (acc[l.companyId] || 0) + 1
    return acc
  }, {})

  return companies.map(c => ({
    ...toCompanyDTO(c),
    users_count: countMap[c.id] || 0,
  }))
}

const createCompany = async ({ name, slug, plan, trade_name, document, email, phone }) => {
  if (!name || !name.trim()) throw new AppError(400, 'Nome da empresa e obrigatorio.')

  const base = (slug && slug.trim() ? slugify(slug) : slugify(name)) || 'empresa'
  let finalSlug = base
  let n = 1
  while (await prisma.company.findUnique({ where: { slug: finalSlug } })) {
    n += 1
    finalSlug = `${base}-${n}`
  }

  try {
    const company = await prisma.company.create({
      data: {
        name:       name.trim(),
        slug:       finalSlug,
        plan:       plan || 'free',
        trade_name: trade_name || null,
        document:   document || null,
        email:      email || null,
        phone:      phone || null,
        isActive:   true,
      },
    })
    return { ...toCompanyDTO(company), users_count: 0 }
  } catch (err) {
    if (err.code === 'P2002') {
      throw new AppError(409, 'Ja existe uma empresa com este documento.')
    }
    throw err
  }
}

// ── Histórico de Auditoria ─────────────────────────────────────

const getCompanyHistory = async (companyId) => {
  const company = await prisma.company.findUnique({ where: { id: companyId } })
  if (!company) throw new AppError(404, 'Empresa nao encontrada.')

  // Leitura via pool cru: activity_logs usa company_id (snake_case), o que
  // a extensão multi-tenant do Prisma (que injeta companyId) não suporta.
  // Filtra pelos entity_types de admin para não misturar o ruído do logger
  // genérico de requisições.
  const { rows } = await pool.query(
    `SELECT l.id, l.action, l.entity_type, l.entity_id, l.payload, l.created_at,
            u.name AS actor_name
       FROM activity_logs l
       LEFT JOIN users u ON u.id = l.user_id
      WHERE l.company_id = $1
        AND l.entity_type = ANY($2::text[])
      ORDER BY l.created_at DESC
      LIMIT 100`,
    [companyId, HISTORY_ENTITY_TYPES]
  )

  return rows.map(r => {
    const p = r.payload || {}
    return {
      id:        r.id,
      label:     p.label || r.action || 'Alteração realizada',
      actor:     r.actor_name || 'Sistema',
      createdAt: r.created_at ? new Date(r.created_at).toLocaleString('pt-BR') : null,
      field:     p.field ?? null,
      oldValue:  p.oldValue ?? null,
      newValue:  p.newValue ?? null,
    }
  })
}

// ── Estatísticas / KPIs de uma empresa ─────────────────────────
//
// Agregações por company_id: projetos, clientes (status='cliente'),
// arquivos de projeto, último acesso (maior last_login_at entre os
// usuários) e a situação financeira (colunas da própria empresa).
const getCompanyStats = async (companyId) => {
  const company = await prisma.company.findUnique({ where: { id: companyId } })
  if (!company) throw new AppError(404, 'Empresa nao encontrada.')

  const [projects, clients, files, lastAccessAgg] = await Promise.all([
    prisma.project.count(),                                   // context injeta companyId
    prisma.clientLead.count({ where: { status: 'cliente' } }), // idem
    prisma.project_files.count({ where: { projects: { companyId } } }), // via relação (não é tenant model)
    prisma.user.aggregate({ where: { companyId }, _max: { lastLoginAt: true } }),
  ])

  const last = lastAccessAgg?._max?.lastLoginAt
  const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('pt-BR') : null)

  return {
    projects,
    clients,
    files,
    lastAccess: last ? new Date(last).toLocaleString('pt-BR') : null,
    financial: {
      situacao:     company.financial_status ?? null,
      vencimento:   fmtDate(company.financial_due_date),
      contratadoEm: fmtDate(company.contracted_at) || fmtDate(company.createdAt),
    },
  }
}

// ── Usuarios de uma empresa ─────────────────────────────────────

const listCompanyUsers = async (companyId) => {
  const links = await prisma.companyUser.findMany({ where: { companyId } })
  if (links.length === 0) return []

  const users = await prisma.user.findMany({
    where: { id: { in: links.map(l => l.userId) } },
  })
  const roleMap = Object.fromEntries(links.map(l => [l.userId, l]))

  return users.map(u => ({
    id:         u.id,
    name:       u.name,
    email:      u.email,
    position:   u.position,
    avatar_url: u.avatarUrl,
    is_active:  roleMap[u.id]?.isActive ?? u.isActive,
    role:       roleMap[u.id]?.role || u.role,
    joined_at:  roleMap[u.id]?.joinedAt,
  }))
}

const createCompanyUser = async ({ companyId, name, email, password, role, position }) => {
  if (!companyId) throw new AppError(400, 'companyId e obrigatorio.')
  if (!name || !email || !password) {
    throw new AppError(400, 'Nome, e-mail e senha sao obrigatorios.')
  }
  if (password.length < 8) {
    throw new AppError(400, 'A senha deve ter no minimo 8 caracteres.')
  }

  const company = await prisma.company.findUnique({ where: { id: companyId } })
  if (!company) throw new AppError(404, 'Empresa nao encontrada.')

  const normalizedEmail = email.toLowerCase().trim()
  const exists = await prisma.user.findUnique({ where: { email: normalizedEmail } })
  if (exists) throw new AppError(409, 'E-mail ja cadastrado.')

  const companyRole = role || 'admin'
  const passwordHash = await bcrypt.hash(password, 12)

  const created = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name:        name.trim(),
        email:       normalizedEmail,
        passwordHash,
        role:        companyRole,
        position:    position || null,
        companyId,
        isActive:    true,
      },
    })

    await tx.companyUser.create({
      data: { companyId, userId: user.id, role: companyRole, isActive: true },
    })

    return {
      id:       user.id,
      name:     user.name,
      email:    user.email,
      role:     companyRole,
      position: user.position,
    }
  })

  await logActivity({
    entityType: 'company_user',
    entityId:   created.id,
    action:     'user_created',
    payload:    { label: 'Usuário adicionado', field: 'Usuário', newValue: created.name },
  })

  return created
}

const setCompanyActive = async (companyId, isActive) => {
  await prisma.company.update({ where: { id: companyId }, data: { isActive: !!isActive } })
  await logActivity({
    entityType: 'company',
    entityId:   companyId,
    action:     isActive ? 'company_activated' : 'company_blocked',
    payload:    { label: isActive ? 'Empresa ativada' : 'Empresa bloqueada' },
  })
  return { id: companyId, is_active: !!isActive }
}

const updateCompany = async (companyId, fields) => {
  const company = await prisma.company.findUnique({ where: { id: companyId } })
  if (!company) throw new AppError(404, 'Empresa nao encontrada.')

  const data = {}
  if (fields.name !== undefined) {
    if (!String(fields.name).trim()) throw new AppError(400, 'Nome da empresa e obrigatorio.')
    data.name = String(fields.name).trim()
  }
  if (fields.trade_name !== undefined) data.trade_name = fields.trade_name || null
  if (fields.document !== undefined) data.document = fields.document || null
  if (fields.email !== undefined) data.email = fields.email || null
  if (fields.phone !== undefined) data.phone = fields.phone || null
  if (fields.plan !== undefined) data.plan = fields.plan || null
  if (fields.status !== undefined) data.status = fields.status || null
  if (fields.is_active !== undefined) data.isActive = !!fields.is_active
  if (fields.responsible_name !== undefined) data.responsible_name = fields.responsible_name || null
  if (fields.responsible_role !== undefined) data.responsible_role = fields.responsible_role || null
  // Situação financeira (editável no painel Admin → aba Financeiro)
  if (fields.financial_status !== undefined) data.financial_status = fields.financial_status || null
  if (fields.financial_due_date !== undefined) {
    data.financial_due_date = fields.financial_due_date ? new Date(fields.financial_due_date) : null
  }
  if (fields.contracted_at !== undefined) {
    data.contracted_at = fields.contracted_at ? new Date(fields.contracted_at) : null
  }
  data.updated_at = new Date()

  try {
    const updated = await prisma.company.update({ where: { id: companyId }, data })
    const count = await prisma.companyUser.count({ where: { companyId } })

    // Auditoria: um evento por campo efetivamente alterado.
    const fmt = (v) => {
      if (v === null || v === undefined || v === '') return '—'
      if (v instanceof Date) return v.toLocaleDateString('pt-BR')
      return String(v)
    }
    for (const key of Object.keys(data)) {
      if (key === 'updated_at') continue
      const before = fmt(company[key])
      const after  = fmt(data[key])
      if (before !== after) {
        await logActivity({
          entityType: 'company',
          entityId:   companyId,
          action:     'company_updated',
          payload:    { label: 'Empresa atualizada', field: FIELD_LABELS[key] || key, oldValue: before, newValue: after },
        })
      }
    }

    return { ...toCompanyDTO(updated), users_count: count }
  } catch (err) {
    if (err.code === 'P2002') {
      throw new AppError(409, 'Ja existe uma empresa com este documento.')
    }
    throw err
  }
}

// ── Logo da empresa ───────────────────────────────────────────

const uploadCompanyLogo = async (companyId, logoUrl) => {
  const company = await prisma.company.findUnique({ where: { id: companyId } })
  if (!company) throw new AppError(404, 'Empresa nao encontrada.')

  const updated = await prisma.company.update({
    where: { id: companyId },
    data:  { logo_url: logoUrl, updated_at: new Date() },
  })
  const count = await prisma.companyUser.count({ where: { companyId } })
  await logActivity({
    entityType: 'company',
    entityId:   companyId,
    action:     'company_logo_updated',
    payload:    { label: 'Logomarca atualizada' },
  })
  return { ...toCompanyDTO(updated), users_count: count }
}

const updateCompanyUser = async (companyId, userId, { name, position, role, isActive, password }) => {
  const link = await prisma.companyUser.findFirst({ where: { companyId, userId } })
  if (!link) throw new AppError(404, 'Usuario nao encontrado nesta empresa.')

  const userData = {}
  if (name     !== undefined) userData.name     = name.trim()
  if (position !== undefined) userData.position = position || null
  if (role     !== undefined) userData.role     = role
  if (isActive !== undefined) userData.isActive = !!isActive
  if (password) {
    if (password.length < 8) throw new AppError(400, 'A senha deve ter no minimo 8 caracteres.')
    userData.passwordHash = await bcrypt.hash(password, 12)
  }

  const linkData = {}
  if (role     !== undefined) linkData.role     = role
  if (isActive !== undefined) linkData.isActive = !!isActive

  await prisma.$transaction(async (tx) => {
    if (Object.keys(userData).length) await tx.user.update({ where: { id: userId }, data: userData })
    if (Object.keys(linkData).length) await tx.companyUser.update({ where: { id: link.id }, data: linkData })
  })

  const users = await listCompanyUsers(companyId)
  const updated = users.find(u => u.id === userId)

  await logActivity({
    entityType: 'company_user',
    entityId:   userId,
    action:     'user_updated',
    payload:    { label: 'Usuário atualizado', field: 'Usuário', newValue: updated?.name },
  })

  return updated
}

const deleteCompanyUser = async (companyId, userId) => {
  const link = await prisma.companyUser.findFirst({ where: { companyId, userId } })
  if (!link) throw new AppError(404, 'Usuario nao encontrado nesta empresa.')

  const target = await prisma.user.findUnique({ where: { id: userId } })

  try {
    await prisma.user.delete({ where: { id: userId } })
    await logActivity({
      entityType: 'company_user',
      entityId:   userId,
      action:     'user_deleted',
      payload:    { label: 'Usuário removido', field: 'Usuário', oldValue: target?.name },
    })
    return { deleted: true }
  } catch (err) {
    if (err.code === 'P2003' || err.code === '23503') {
      throw new AppError(409, 'Este usuario possui registros associados (projetos, tarefas, etc.). Desative-o em vez de excluir.')
    }
    throw err
  }
}

// ═══════════════════════════════════════════════════════════════════════
// NOVO — Clientes com acesso ao portal de postagens
// ═══════════════════════════════════════════════════════════════════════

// Lista projetos da empresa — usado para popular o seletor de projetos no
// modal de acesso do cliente (multi-select em ClientAccessModal.jsx).
const listCompanyProjects = async (companyId) => {
  const projects = await prisma.project.findMany({
    where: { companyId },
    orderBy: { title: 'asc' },
    select: { id: true, title: true, status: true },
  })
  return projects
}

const toClientAccessDTO = (client, accessRows = []) => ({
  id:                    client.id,
  name:                  client.name,
  email:                 client.email,
  status:                client.status,
  portal_email:          client.portalEmail,
  portal_is_active:      client.portalIsActive,
  portal_last_login_at:  client.portalLastLoginAt,
  has_access:            !!client.portalEmail,
  projects:              accessRows.map(a => ({ id: a.projectId, title: a.projects?.title || null })),
})

// Lista clientes elegíveis (status='cliente') de uma empresa, já com o
// estado do acesso ao portal e os projetos vinculados.
const listCompanyClients = async (companyId) => {
  const clients = await prisma.clientLead.findMany({
    where: { companyId, status: 'cliente' },
    orderBy: { name: 'asc' },
  })

  const accessRows = await prisma.clientProjectAccess.findMany({
    where: { companyId },
    include: { projects: { select: { id: true, title: true } } },
  })

  const accessByClient = accessRows.reduce((acc, row) => {
    acc[row.clientLeadId] = acc[row.clientLeadId] || []
    acc[row.clientLeadId].push(row)
    return acc
  }, {})

  return clients.map(c => toClientAccessDTO(c, accessByClient[c.id] || []))
}

const createClientPortalAccess = async (companyId, clientId, { portalEmail, password, projectIds, grantedBy }) => {
  const client = await prisma.clientLead.findFirst({ where: { id: clientId, companyId } })
  if (!client) throw new AppError(404, 'Cliente nao encontrado nesta empresa.')

  if (client.status !== 'cliente') {
    throw new AppError(400, 'Somente registros com status "cliente" podem receber acesso ao portal. Atualize o status na página de Clientes antes de continuar.')
  }
  if (!portalEmail || !portalEmail.trim()) {
    throw new AppError(400, 'Informe o e-mail de acesso ao portal.')
  }
  if (!password || password.length < 8) {
    throw new AppError(400, 'A senha deve ter no minimo 8 caracteres.')
  }
  if (!Array.isArray(projectIds) || projectIds.length === 0) {
    throw new AppError(400, 'Selecione ao menos um projeto para vincular o acesso.')
  }

  const normalizedEmail = portalEmail.toLowerCase().trim()
  const passwordHash = await bcrypt.hash(password, 12)

  try {
    await prisma.$transaction(async (tx) => {
      // updateMany (nao update): a extensao do Prisma bloqueia operacoes
      // unique em modelos tenant; updateMany e escopado por company_id.
      await tx.clientLead.updateMany({
        where: { id: clientId },
        data: {
          portalEmail:        normalizedEmail,
          portalPasswordHash: passwordHash,
          portalIsActive:     true,
        },
      })

      // Substitui o vínculo de projetos pelo conjunto enviado no modal.
      await tx.clientProjectAccess.deleteMany({ where: { clientLeadId: clientId, companyId } })
      await tx.clientProjectAccess.createMany({
        data: projectIds.map(pid => ({
          clientLeadId: clientId,
          projectId:    pid,
          companyId,
          grantedBy:    grantedBy || null,
        })),
        skipDuplicates: true,
      })
    })
  } catch (err) {
    if (err.code === 'P2002') {
      throw new AppError(409, 'Este e-mail de acesso já está em uso por outro cliente.')
    }
    throw err
  }

  await logActivity({
    entityType: 'client_access',
    entityId:   clientId,
    action:     'access_granted',
    payload:    { label: 'Acesso ao portal criado', field: 'Cliente', newValue: client.name },
  })

  const list = await listCompanyClients(companyId)
  return list.find(c => c.id === clientId)
}

const updateClientPortalAccess = async (companyId, clientId, { password, isActive, projectIds }) => {
  const client = await prisma.clientLead.findFirst({ where: { id: clientId, companyId } })
  if (!client) throw new AppError(404, 'Cliente nao encontrado nesta empresa.')
  if (!client.portalEmail) {
    throw new AppError(400, 'Este cliente ainda não possui acesso ao portal. Crie o acesso primeiro.')
  }

  const data = {}
  if (password) {
    if (password.length < 8) throw new AppError(400, 'A senha deve ter no minimo 8 caracteres.')
    data.portalPasswordHash = await bcrypt.hash(password, 12)
  }
  if (isActive !== undefined) data.portalIsActive = !!isActive

  await prisma.$transaction(async (tx) => {
    if (Object.keys(data).length) {
      await tx.clientLead.updateMany({ where: { id: clientId }, data })
    }
    if (Array.isArray(projectIds)) {
      await tx.clientProjectAccess.deleteMany({ where: { clientLeadId: clientId, companyId } })
      if (projectIds.length) {
        await tx.clientProjectAccess.createMany({
          data: projectIds.map(pid => ({ clientLeadId: clientId, projectId: pid, companyId })),
          skipDuplicates: true,
        })
      }
    }
  })

  await logActivity({
    entityType: 'client_access',
    entityId:   clientId,
    action:     'access_updated',
    payload:    { label: 'Acesso ao portal atualizado', field: 'Cliente', newValue: client.name },
  })

  const list = await listCompanyClients(companyId)
  return list.find(c => c.id === clientId)
}

// Revoga o acesso sem apagar o histórico de posts/comentários já feitos
// pelo cliente (post_comments.client_lead_id continua íntegro). Zera o
// portal_email para liberar reuso futuro do endereço por outro cliente.
const revokeClientPortalAccess = async (companyId, clientId) => {
  const client = await prisma.clientLead.findFirst({ where: { id: clientId, companyId } })
  if (!client) throw new AppError(404, 'Cliente nao encontrado nesta empresa.')

  await prisma.clientLead.updateMany({
    where: { id: clientId },
    data: {
      portalEmail:        null,
      portalPasswordHash: null,
      portalIsActive:     false,
    },
  })

  await logActivity({
    entityType: 'client_access',
    entityId:   clientId,
    action:     'access_revoked',
    payload:    { label: 'Acesso ao portal revogado', field: 'Cliente', oldValue: client.name },
  })

  return { revoked: true }
}

module.exports = {
  listCompanies,
  createCompany,
  updateCompany,
  uploadCompanyLogo,
  listCompanyUsers,
  createCompanyUser,
  setCompanyActive,
  updateCompanyUser,
  deleteCompanyUser,
  getCompanyHistory,
  getCompanyStats,
  listCompanyProjects,
  listCompanyClients,
  createClientPortalAccess,
  updateClientPortalAccess,
  revokeClientPortalAccess,
}