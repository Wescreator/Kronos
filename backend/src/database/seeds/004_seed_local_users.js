/**
 * Seed: empresa de teste + 3 usuarios com roles diferentes (ambiente local)
 *
 * Cria uma empresa "Kronos Dev" e 3 usuarios vinculados a ela via
 * company_users, cada um com um role diferente (owner, admin, manager),
 * para testar as permissoes definidas em utils/permissions.js.
 *
 * Uso:
 *   npm run seed:local
 */
require('dotenv').config({ path: '.env.development' })
const bcrypt = require('bcryptjs')
const prisma = require('../../config/prisma')

const COMPANY_SLUG = 'kronos-dev'
const COMPANY_NAME = 'Kronos Dev'

const USERS = [
  { name: 'Owner Dev',   email: 'owner@kronos.dev',   password: 'Kronos@123',     role: 'owner'   },
  { name: 'Admin Dev',   email: 'admin@kronos.dev',   password: 'Kronos@123',     role: 'admin'   },
  { name: 'Manager Dev', email: 'manager@kronos.dev', password: 'Kronos@123',     role: 'manager' },
  { name: 'Developer',  email: 'dev@kronos.app',      password: 'Kronos@Dev2026', role: 'developer'},
  { name: 'Client',     email: 'client@kronos.dev',   password: 'Kronos@123',     role: 'client'    },
]

async function ensureCompany() {
  let company = await prisma.company.findUnique({ where: { slug: COMPANY_SLUG } })
  if (company) {
    console.log(`Empresa já existe: ${company.name} | id: ${company.id}`)
    return company
  }

  company = await prisma.company.create({
    data: {
      name: COMPANY_NAME,
      slug: COMPANY_SLUG,
      status: 'active',
      isActive: true,
      plan: 'starter',
    },
  })
  console.log(`Empresa criada: ${company.name} | id: ${company.id}`)
  return company
}

async function ensureUser({ name, email, password, role }, companyId) {
  const normalizedEmail = email.toLowerCase().trim()
  const passwordHash = await bcrypt.hash(password, 12)

  let user = await prisma.user.findUnique({ where: { email: normalizedEmail } })

  if (!user) {
    user = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        passwordHash,
        role, // users.role mantido em sincronia; company_users.role é a fonte oficial
        isActive: true,
      },
    })
    console.log(`Usuário criado: ${user.email} | role: ${role}`)
  } else {
    user = await prisma.user.update({
      where: { email: normalizedEmail },
      data: { passwordHash, role, isActive: true },
    })
    console.log(`Usuário atualizado: ${user.email} | role: ${role}`)
  }

  const existingLink = await prisma.companyUser.findFirst({
    where: { companyId, userId: user.id },
  })

  if (!existingLink) {
    await prisma.companyUser.create({
      data: { companyId, userId: user.id, role, isActive: true },
    })
    console.log(`  Vínculo criado em company_users (role: ${role})`)
  } else {
    await prisma.companyUser.update({
      where: { id: existingLink.id },
      data: { role, isActive: true },
    })
    console.log(`  Vínculo atualizado em company_users (role: ${role})`)
  }

  return user
}

async function run() {
  const company = await ensureCompany()

  for (const u of USERS) {
    await ensureUser(u, company.id)
  }

  console.log('\n--- Credenciais de teste ---')
  USERS.forEach(u => console.log(`${u.role.padEnd(10)} | ${u.email} | ${u.password}`))
}

run()
  .catch((err) => { console.error('Erro no seed:', err.message); process.exitCode = 1 })
  .finally(async () => { await prisma.$disconnect?.() })