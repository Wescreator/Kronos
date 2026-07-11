const pool = require('../config/database')
const { getTenant } = require('../config/tenantContext')

/**
 * Registra um evento de auditoria em activity_logs.
 *
 * Usa o pool `pg` cru (não o Prisma): a extensão multi-tenant injeta
 * `companyId` (camelCase), mas activity_logs tem a coluna `company_id`
 * (snake_case) — qualquer operação Prisma nessa tabela quebraria.
 *
 * company_id (empresa-alvo) e user_id (autor) vêm do contexto de tenant
 * da requisição (AsyncLocalStorage), preenchido no router.param das rotas
 * de plataforma. Sem contexto de empresa, não há o que auditar.
 *
 * A auditoria NUNCA deve derrubar a operação principal — qualquer erro
 * aqui é apenas logado no console.
 *
 * @param {object}  evt
 * @param {string}  evt.entityType  ex.: 'company' | 'company_user' | 'client_access'
 * @param {string=} evt.entityId    id da entidade afetada (uuid)
 * @param {string}  evt.action      código curto da ação (ex.: 'company_updated')
 * @param {object=} evt.payload     dados livres: { label, field, oldValue, newValue, ... }
 */
async function logActivity({ entityType, entityId = null, action, payload = {} }) {
  try {
    const { companyId, userId } = getTenant()
    if (!companyId) return

    await pool.query(
      `INSERT INTO activity_logs (company_id, user_id, entity_type, entity_id, action, payload)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
      [companyId, userId || null, entityType, entityId, action, JSON.stringify(payload)]
    )
  } catch (err) {
    console.error('[activityLog] falha ao registrar evento:', err.message)
  }
}

/**
 * Registra um evento de autenticação (login, falha de login, reset de
 * senha). Diferente de logActivity, NÃO depende do contexto de tenant —
 * no login público ainda não há JWT/AsyncLocalStorage. Recebe os campos
 * explicitamente.
 *
 * NUNCA registrar senha, hash, token ou cookie — só metadados de auditoria
 * (email, ip, status).
 *
 * @param {object}  evt
 * @param {string}  evt.action     'login_success' | 'login_failed' | 'password_reset'
 * @param {string=} evt.userId     id do usuário (quando conhecido)
 * @param {string=} evt.companyId  empresa (quando conhecida)
 * @param {object=} evt.payload    metadados livres (ex.: { email, ip })
 */
async function logAuthEvent({ action, userId = null, companyId = null, payload = {} }) {
  try {
    await pool.query(
      `INSERT INTO activity_logs (company_id, user_id, entity_type, action, payload, ip_address)
       VALUES ($1, $2, 'auth', $3, $4::jsonb, $5)`,
      [companyId, userId, action, JSON.stringify(payload), payload.ip || null]
    )
  } catch (err) {
    console.error('[logAuthEvent] falha ao registrar evento:', err.message)
  }
}

module.exports = { logActivity, logAuthEvent }
