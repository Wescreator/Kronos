const bcrypt = require('bcryptjs')
const prisma = require('../config/prisma')

/**
 * Servico de plataforma (escopo global / super admin).
 *
 * Opera sobre os modelos de plataforma (Company, User, CompanyUser),
 * que NAO sao multi-tenant - portanto nao passam pela extensao de
 * isolamento. Usa metodos de modelo do Prisma (idiomatico).
 */

const slugify = (s) =>
  s.toLowerCase().trim()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

// ── Empresas ────────────────────────────────────────────────────

// Normaliza para snake_case (convencao usada pelo frontend).
const toCompanyDTO = (c) => ({
  id:         c.id,
  name:       c.name,
  slug:       c.slug,
  plan:       c.plan,
  is_active:  c.isActive,
  created_at: c.createdAt,
})

const listCompanies = async () => {
  const companies = await prisma.company.findMany({ orderBy: { name: 'asc' } })
  // Conta usuarios por empresa para exibir no painel
  const counts = await prisma.companyUser.groupBy({
    by: ['companyId'],
    _count: { _all: true },
  })
  const countMap = Object.fromEntries(counts.map(c => [c.companyId, c._count._all]))
  return companies.map(c => ({ ...toCompanyDTO(c), users_count: countMap[c.id] || 0 }))
}

const createCompany = async ({ name, slug, plan }) => {
  if (!name || !name.trim()) throw { status: 400, message: 'Nome da empresa e obrigatorio.' }

  // O slug e interno (coluna NOT NULL UNIQUE), gerado a partir do nome.
  // Garante unicidade automaticamente, sem expor isso ao usuario.
  const base = (slug && slug.trim() ? slugify(slug) : slugify(name)) || 'empresa'
  let finalSlug = base
  let n = 1
  while (await prisma.company.findUnique({ where: { slug: finalSlug } })) {
    n += 1
    finalSlug = `${base}-${n}`
  }

  const company = await prisma.company.create({
    data: { name: name.trim(), slug: finalSlug, plan: plan || 'free', isActive: true },
  })
  return { ...toCompanyDTO(company), users_count: 0 }
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
        name:         name.trim(),
        email:        normalizedEmail,
        passwordHash,
        role:         companyRole,
        position:     position || null,
        companyId,
        isActive:     true,
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
    // O vinculo em company_users sai por cascata ao remover o usuario.
    await prisma.user.delete({ where: { id: userId } })
    return { deleted: true }
  } catch (err) {
    // 23503 / P2003 = FK RESTRICT (usuario tem registros associados)
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
  listCompanyUsers,
  createCompanyUser,
  setCompanyActive,
  updateCompanyUser,
  deleteCompanyUser,
}
