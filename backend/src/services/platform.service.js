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

  const finalSlug = (slug && slug.trim()) ? slugify(slug) : slugify(name)

  const existing = await prisma.company.findUnique({ where: { slug: finalSlug } })
  if (existing) throw { status: 409, message: 'Ja existe uma empresa com este slug.' }

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

module.exports = {
  listCompanies,
  createCompany,
  listCompanyUsers,
  createCompanyUser,
  setCompanyActive,
}
