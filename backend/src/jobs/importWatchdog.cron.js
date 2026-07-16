const cron = require('node-cron')
const importRepo = require('../repositories/import.repository')

/**
 * Watchdog da importação de planilhas (spec 6.4): não existe fila — a
 * gravação roda in-process e o processo do Render é efêmero, então um
 * deploy/crash no meio deixa o job preso em 'processing' para sempre.
 * Este cron marca como 'failed' o que passar do limite; a transação de
 * gravação já garantiu o rollback dos dados (tudo ou nada).
 *
 * Roda fora de request (sem contexto de tenant): usa o pool pg via
 * repository — nunca Prisma tenant models.
 */
const STALE_MINUTES = parseInt(process.env.IMPORT_WATCHDOG_STALE_MINUTES) || 10

const start = () => {
  cron.schedule('*/5 * * * *', async () => {
    try {
      const count = await importRepo.failStaleProcessingJobs(STALE_MINUTES)
      if (count > 0) console.log(`[import-watchdog] ${count} job(s) preso(s) em processing marcados como failed`)
    } catch (err) {
      console.error('[import-watchdog] erro:', err.message)
    }
  })
}

module.exports = { start }
