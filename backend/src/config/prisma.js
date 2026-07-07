const { PrismaClient, Prisma } = require('@prisma/client')
const { getTenant } = require('./tenantContext')

/**
 * Cliente Prisma com isolamento multi-tenant automatico.
 *
 * Para todos os modelos listados em TENANT_MODELS, a extensao:
 *   - injeta `companyId` no `where` de toda leitura/escrita em lote
 *     (findMany/findFirst/count/aggregate/groupBy/updateMany/deleteMany);
 *   - injeta `companyId` no `data` de create/createMany;
 *   - bloqueia a operacao se nao houver contexto de empresa.
 *
 * Resultado: e impossivel ler ou gravar dados de outra empresa por
 * esquecimento - o filtro nao depende do desenvolvedor lembrar.
 *
 * IMPORTANTE: a extensao atua apenas em metodos de modelo do Prisma
 * (prisma.task.findMany, etc). Consultas via $queryRaw NAO passam pela
 * extensao e devem continuar incluindo `company_id` explicitamente. O
 * mesmo vale para o pool `pg` cru usado nos repositories de Posts e
 * Clientes (post.repository.js, client.repository.js) - eles nunca
 * passam pelo Prisma, entao nao ha necessidade (nem efeito) de listar
 * post_attachments/post_comments/comment_attachments/posts/clients_leads
 * aqui só por causa desses fluxos; ClientLead/ClientProjectAccess estão
 * listados abaixo especificamente porque platform.service.js os acessa
 * via Prisma Client (nao via pool cru).
 *
 * Observacao sobre findUnique/update/delete (por id unico): o Prisma
 * nao permite adicionar company_id ao `where` de operacoes "unique".
 * Por isso, em modelos tenant, use sempre findFirst / updateMany /
 * deleteMany (que aceitam filtros arbitrarios e sao escopados aqui).
 */

// Modelos que possuem a coluna company_id (escopo de empresa).
//
// Nomes conforme o schema reconciliado (prisma db pull): os modelos que
// eu havia definido ficaram em PascalCase; os que o introspect criou
// ficaram com o nome da tabela (snake_case).
//
// IMPORTANTE: User, Company e CompanyUser NAO entram aqui - sao modelos
// de plataforma, gerenciados pelo super admin (escopo global, sem
// company_id de contexto). Inclui-los faria o /admin lancar erro.
const TENANT_MODELS = new Set([
  // PascalCase (definidos no schema original)
  'Project',
  'ProjectStatusHistory',
  'Task',
  'ExpenseCategory',
  'Expense',
  'Revenue',
  'RevenueInstallment',
  'ChatRoom',
  'CalendarEvent',
  'Proposal',
  'Notification',
  // snake_case (gerados pelo db pull) que possuem company_id
  'activity_logs',
  'chat_messages',
  'project_phases',
  'project_stages',
  'task_assignments',
  'task_comments',
  'proposal_services',
  'proposal_scope_items',
  'proposal_payment_terms',
  'proposal_sequences',
  // NOVO — módulo de Clientes/Portal, acessado via Prisma em
  // platform.service.js (createClientPortalAccess, listCompanyClients etc).
  'ClientLead',
  'ClientProjectAccess',
])

const WHERE_OPS = new Set([
  'findFirst', 'findFirstOrThrow', 'findMany',
  'count', 'aggregate', 'groupBy',
  'updateMany', 'deleteMany',
])

const base = new PrismaClient()

const prisma = base.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        if (!TENANT_MODELS.has(model)) {
          return query(args)
        }

        const { companyId, scope } = getTenant()

        // Sem contexto de empresa em modelo tenant: bloqueia para
        // evitar vazamento cross-tenant acidental. O escopo global
        // (developer) deve impersonar uma empresa (ou, nas rotas do
        // Admin, ter o contexto ativado via router.param) para acessar.
        if (!companyId) {
          throw new Prisma.PrismaClientKnownRequestError(
            `Operacao em "${model}" sem contexto de empresa (company_id ausente).`,
            { code: 'P2025', clientVersion: Prisma.prismaVersion?.client || 'unknown' }
          )
        }

        // Injeta company_id no filtro das operacoes baseadas em where.
        if (WHERE_OPS.has(operation)) {
          args = { ...args, where: { AND: [args?.where || {}, { companyId }] } }
          return query(args)
        }

        // Injeta company_id no data de create.
        if (operation === 'create') {
          args = { ...args, data: { companyId, ...args.data } }
          return query(args)
        }

        if (operation === 'createMany') {
          const data = Array.isArray(args.data) ? args.data : [args.data]
          args = { ...args, data: data.map(d => ({ companyId, ...d })) }
          return query(args)
        }

        // upsert: escopa o where e garante company_id no create/update.
        if (operation === 'upsert') {
          args = {
            ...args,
            where: { ...(args.where || {}), companyId },
            create: { companyId, ...args.create },
          }
          return query(args)
        }

        // findUnique/update/delete por id unico nao sao escopaveis com
        // seguranca aqui - veja a observacao no topo do arquivo.
        return query(args)
      },
    },
  },
})

module.exports = prisma
module.exports.Prisma = Prisma