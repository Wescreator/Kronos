const bcrypt = require('bcryptjs')
const prisma = require('../config/prisma')

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
  if (!name || !name.trim()) throw { status: 400, message: 'Nome da empresa e obrigatorio.' }

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
      throw { status: 409, message: 'Ja existe uma empresa com este documento.' }
    }
    throw err
  }
}

// ── Histórico de Auditoria ─────────────────────────────────────

const getCompanyHistory = async (companyId) => {
  const company = await prisma.company.findUnique({ where: { id: companyId } })
  if (!company) throw { status: 404, message: 'Empresa nao encontrada.' }

  const history = await prisma.activity_logs.findMany({
    where: { company_id: companyId },
    orderBy: { created_at: 'desc' },
  })

  return history.map(h => ({
    id: h.id,
    label: h.action || 'Alteração realizada',
    actor: h.user_id || 'Sistema',
    createdAt: h.created_at ? h.created_at.toLocaleString('pt-BR') : null,
    field: h.entity_type || null,
    oldValue: null,
    newValue: null,
  }))
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
  if (!companyId) throw { status: 400, message: 'companyId e obrigatorio.' }
  if (!name || !email || !password) {
    throw { status: 400, message: 'Nome, e-mail e senha sao obrigatorios.' }
  }
  if (password.length < 8) {
    throw { status: 400, message: 'A senha deve ter no minimo 8 caracteres.' }
  }

  const company = await prisma.company.findUnique({ where: { id: companyId } })
  if (!company) throw { status: 404, message: 'Empresa nao encontrada.' }

  const normalizedEmail = email.toLowerCase().trim()
  const exists = await prisma.user.findUnique({ where: { email: normalizedEmail } })
  if (exists) throw { status: 409, message: 'E-mail ja cadastrado.' }

  const companyRole = role || 'admin'
  const passwordHash = await bcrypt.hash(password, 12)

  return prisma.$transaction(async (tx) => {
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
}

const setCompanyActive = async (companyId, isActive) => {
  await prisma.company.update({ where: { id: companyId }, data: { isActive: !!isActive } })
  return { id: companyId, is_active: !!isActive }
}

const updateCompany = async (companyId, fields) => {
  const company = await prisma.company.findUnique({ where: { id: companyId } })
  if (!company) throw { status: 404, message: 'Empresa nao encontrada.' }

  const data = {}
  if (fields.name !== undefined) {
    if (!String(fields.name).trim()) throw { status: 400, message: 'Nome da empresa e obrigatorio.' }
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
  data.updated_at = new Date()

  try {
    const updated = await prisma.company.update({ where: { id: companyId }, data })
    const count = await prisma.companyUser.count({ where: { companyId } })
    return { ...toCompanyDTO(updated), users_count: count }
  } catch (err) {
    if (err.code === 'P2002') {
      throw { status: 409, message: 'Ja existe uma empresa com este documento.' }
    }
    throw err
  }
}

// ── Logo da empresa ───────────────────────────────────────────

const uploadCompanyLogo = async (companyId, logoUrl) => {
  const company = await prisma.company.findUnique({ where: { id: companyId } })
  if (!company) throw { status: 404, message: 'Empresa nao encontrada.' }

  const updated = await prisma.company.update({
    where: { id: companyId },
    data:  { logo_url: logoUrl, updated_at: new Date() },
  })
  const count = await prisma.companyUser.count({ where: { companyId } })
  return { ...toCompanyDTO(updated), users_count: count }
}

const updateCompanyUser = async (companyId, userId, { name, position, role, isActive, password }) => {
  const link = await prisma.companyUser.findFirst({ where: { companyId, userId } })
  if (!link) throw { status: 404, message: 'Usuario nao encontrado nesta empresa.' }

  const userData = {}
  if (name     !== undefined) userData.name     = name.trim()
  if (position !== undefined) userData.position = position || null
  if (role     !== undefined) userData.role     = role
  if (isActive !== undefined) userData.isActive = !!isActive
  if (password) {
    if (password.length < 8) throw { status: 400, message: 'A senha deve ter no minimo 8 caracteres.' }
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
  return users.find(u => u.id === userId)
}

const deleteCompanyUser = async (companyId, userId) => {
  const link = await prisma.companyUser.findFirst({ where: { companyId, userId } })
  if (!link) throw { status: 404, message: 'Usuario nao encontrado nesta empresa.' }

  try {
    await prisma.user.delete({ where: { id: userId } })
    return { deleted: true }
  } catch (err) {
    if (err.code === 'P2003' || err.code === '23503') {
      throw {
        status: 409,
        message: 'Este usuario possui registros associados (projetos, tarefas, etc.). Desative-o em vez de excluir.',
      }
    }
    throw err
  }
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
}