/**
 * Testes da extensão de isolamento multi-tenant do Prisma
 * (src/config/prisma.js). A extensão decide ANTES de tocar o banco:
 *   - modelo tenant sem contexto de empresa → erro (nunca vaza);
 *   - operações unique (findUnique/update/delete/upsert) em modelo
 *     tenant → erro (não são escopáveis por company_id);
 *   - modelos de plataforma (User/Company) passam sem contexto.
 *
 * Nenhum teste executa query real — todos os caminhos falham (ou são
 * interceptados) na extensão, antes do engine.
 */
const { test } = require('node:test')
const assert = require('node:assert/strict')

const prisma = require('../src/config/prisma')
const { runWithTenant } = require('../src/config/tenantContext')

const COMPANY = '00000000-0000-0000-0000-00000000c1a0'

test('modelo tenant sem contexto de empresa é bloqueado', async () => {
  await assert.rejects(
    () => prisma.task.findMany(),
    /sem contexto de empresa/,
  )
})

test('findUnique em modelo tenant é bloqueado mesmo COM contexto', async () => {
  await runWithTenant({ companyId: COMPANY, scope: 'company' }, async () => {
    await assert.rejects(
      () => prisma.task.findUnique({ where: { id: COMPANY } }),
      /nao e escopada por company_id/,
    )
  })
})

test('update/delete/upsert por chave única em modelo tenant são bloqueados', async () => {
  await runWithTenant({ companyId: COMPANY, scope: 'company' }, async () => {
    await assert.rejects(
      () => prisma.clientLead.update({ where: { id: COMPANY }, data: {} }),
      /nao e escopada/,
    )
    await assert.rejects(
      () => prisma.proposal.delete({ where: { id: COMPANY } }),
      /nao e escopada/,
    )
    await assert.rejects(
      () => prisma.project.upsert({ where: { id: COMPANY }, create: {}, update: {} }),
      /nao e escopada/,
    )
  })
})

test('modelo de plataforma (User) NÃO exige contexto de empresa', async () => {
  // findUnique em User passa direto pela extensão (modelo exempto).
  // Sem banco acessível o erro seria de conexão — o que interessa é que
  // NÃO seja o erro de contexto/escopo da extensão.
  try {
    await prisma.user.findUnique({ where: { id: COMPANY } })
  } catch (err) {
    assert.ok(
      !/sem contexto de empresa|nao e escopada/.test(err.message),
      `extensão não deveria interceptar modelo de plataforma: ${err.message}`
    )
  }
})
