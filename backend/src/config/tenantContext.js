const { AsyncLocalStorage } = require('async_hooks')

/**
 * Contexto de tenant por requisicao.
 *
 * Guarda { userId, companyId, scope, role } durante todo o ciclo de
 * vida de uma requisicao autenticada. A extensao do Prisma le este
 * contexto para injetar company_id automaticamente em todas as
 * operacoes sobre modelos multi-tenant.
 *
 * scope === 'global'  -> usuario de plataforma (developer); companyId
 *                        so e definido quando ha impersonacao ativa.
 * scope === 'company' -> usuario de empresa; companyId sempre definido.
 */
const tenantStore = new AsyncLocalStorage()

/**
 * Executa `fn` com o contexto fornecido. Tudo que rodar dentro de `fn`
 * (incluindo callbacks assincronos) enxerga o mesmo contexto.
 */
function runWithTenant(ctx, fn) {
  return tenantStore.run({ ...ctx }, fn)
}

/** Retorna o contexto atual (ou objeto vazio fora de uma requisicao). */
function getTenant() {
  return tenantStore.getStore() || {}
}

/** Atualiza o company_id do contexto atual (usado na impersonacao). */
function setCompanyId(companyId) {
  const store = tenantStore.getStore()
  if (store) store.companyId = companyId
}

module.exports = { tenantStore, runWithTenant, getTenant, setCompanyId }
