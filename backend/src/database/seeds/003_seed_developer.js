/**
 * Seed: usuario Developer (super admin / escopo global)
 *
 * Cria um usuario com role 'developer' e SEM vinculo de empresa.
 * O login trata role 'developer' como escopo global (buildAuthPayload),
 * direcionando para /admin.
 *
 * Pre-requisito: users.company_id deve ser NULLABLE. Caso ainda esteja
 * NOT NULL, rode antes:
 *   ALTER TABLE public.users ALTER COLUMN company_id DROP NOT NULL;
 *   npm run prisma:pull && npm run prisma:generate
 *
 * Uso:
 *   DEV_EMAIL=dev@kronos.app DEV_PASSWORD='SuaSenhaForte' npm run seed:dev
 */
require('dotenv').config()
const bcrypt = require('bcryptjs')
const prisma = require('../../config/prisma')

async function run() {
  const email    = (process.env.DEV_EMAIL || 'dev@kronos.app').toLowerCase().trim()
  const password = process.env.DEV_PASSWORD || 'Kronos@Dev2026'
  const name     = process.env.DEV_NAME || 'Developer Kronos'

  const passwordHash = await bcrypt.hash(password, 12)
  const existing = await prisma.user.findUnique({ where: { email } })

  if (existing) {
    // Reset: garante senha conhecida, role developer e usuario ativo.
    const user = await prisma.user.update({
      where: { email },
      data: { passwordHash, role: 'developer', isActive: true },
    })
    console.log(`Developer ATUALIZADO: ${user.email} | id: ${user.id}`)
    console.log(`  role=${user.role} is_active=${user.isActive}`)
    console.log(`Senha redefinida: ${password}  (altere apos o primeiro login)`)
    return
  }

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: 'developer',
      isActive: true,
      // companyId omitido (NULL) — usuario global
    },
  })

  console.log(`Developer criado: ${user.email} | id: ${user.id}`)
  console.log(`Senha: ${password}  (altere apos o primeiro login)`)
}

run()
  .catch((err) => { console.error('Erro no seed:', err.message); process.exitCode = 1 })
  .finally(async () => { await prisma.$disconnect?.() })
