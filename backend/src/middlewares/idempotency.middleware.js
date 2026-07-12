const crypto = require('crypto')
const pool = require('../config/database')
const R = require('../utils/response')

/**
 * Idempotência de requisições de criação (anti duplo envio / replay).
 *
 * O cliente envia `Idempotency-Key: <uuid>` — uma chave por INTENÇÃO do
 * usuário (gerada ao abrir o formulário, não no clique). A partir daí:
 *
 *   1ª requisição      → INSERT vence o UNIQUE(user_id, idem_key), segue para o
 *                        controller e, ao responder 2xx, a resposta é gravada.
 *   repetição concluída→ devolve a MESMA resposta gravada, sem reprocessar.
 *                        (é o caso do retry em que a 1ª resposta se perdeu)
 *   repetição em voo   → 409. A primeira ainda está processando; reprocessar
 *                        agora é exatamente o que duplicaria o registro.
 *   mesma chave, outro
 *   payload/endpoint   → 422. Erro de uso do cliente, não uma repetição.
 *
 * NÃO impede o usuário de criar registros semelhantes de propósito: reabrir o
 * formulário gera chave nova = intenção nova. A dedupe é da REQUISIÇÃO, nunca
 * do conteúdo.
 *
 * Sem o header, a requisição passa direto (sem proteção). Isso mantém a API
 * compatível com qualquer cliente que ainda não envie a chave — a proteção é
 * opt-in por tela, o que permite migrar o frontend gradualmente.
 *
 * Erros (4xx/5xx) NÃO são gravados: a chave é liberada para que o usuário possa
 * realmente tentar de novo depois de corrigir o problema.
 */

const KEY_REGEX = /^[A-Za-z0-9._:-]{16,120}$/

// Hash do corpo para detectar reuso da mesma chave com payload diferente.
// Em multipart (upload), req.body ainda não foi parseado pelo multer neste
// ponto — usamos um marcador fixo e abrimos mão da checagem de payload; a
// dedupe pela chave continua valendo, que é o que importa.
const hashRequest = (req) => {
  const isMultipart = (req.headers['content-type'] || '').includes('multipart/form-data')
  if (isMultipart) return 'multipart'

  const body = req.body && typeof req.body === 'object' ? req.body : {}
  return crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex')
}

const idempotency = () => async (req, res, next) => {
  const key = req.headers['idempotency-key']

  // Sem chave → sem proteção, segue o fluxo normal.
  if (!key) return next()

  if (!KEY_REGEX.test(key)) {
    return R.error(res, 'Idempotency-Key inválida.', 400)
  }

  const userId    = req.user?.user_id
  const companyId = req.tenant?.id || null

  // Sem usuário autenticado não há como escopar a chave — deixa passar; as
  // rotas protegidas já barram antes disso.
  if (!userId) return next()

  const endpoint = `${req.method} ${req.baseUrl}${req.route?.path || req.path}`
  const requestHash = hashRequest(req)

  let claimed = false
  try {
    // O UNIQUE(user_id, idem_key) é quem serializa a corrida: em duas
    // requisições concorrentes, exatamente uma insere.
    const { rows } = await pool.query(
      `INSERT INTO idempotency_keys (user_id, company_id, idem_key, endpoint, request_hash, status)
       VALUES ($1, $2, $3, $4, $5, 'processing')
       ON CONFLICT (user_id, idem_key) DO NOTHING
       RETURNING id`,
      [userId, companyId, key, endpoint, requestHash]
    )
    claimed = rows.length > 0
  } catch (err) {
    // Falha na infraestrutura de idempotência não pode derrubar a operação do
    // usuário: segue sem proteção (degradação suave) e registra o problema.
    console.error('[idempotency] falha ao registrar chave:', err.message)
    return next()
  }

  // ── Requisição repetida ────────────────────────────────────────────────
  if (!claimed) {
    const { rows: existing } = await pool.query(
      `SELECT endpoint, request_hash, status, response_status, response_body
         FROM idempotency_keys
        WHERE user_id = $1 AND idem_key = $2`,
      [userId, key]
    )
    const prev = existing[0]
    if (!prev) return next() // corrida com a limpeza; raro — segue normal.

    if (prev.endpoint !== endpoint || prev.request_hash !== requestHash) {
      return R.error(
        res,
        'Esta chave de idempotência já foi usada com outra requisição.',
        422
      )
    }

    if (prev.status === 'processing') {
      return R.error(
        res,
        'Esta operação já está sendo processada. Aguarde a conclusão.',
        409
      )
    }

    // Concluída: devolve a resposta original. O cliente não distingue esta
    // resposta da primeira — é exatamente o objetivo.
    return res
      .status(prev.response_status || 200)
      .set('Idempotent-Replay', 'true')
      .json(prev.response_body)
  }

  // ── Primeira requisição: intercepta a resposta para gravá-la ───────────
  const originalJson = res.json.bind(res)

  res.json = (body) => {
    const statusCode = res.statusCode

    // Só respostas de sucesso são memorizadas. Em erro, a chave é liberada
    // para permitir uma nova tentativa real.
    const persist = statusCode >= 200 && statusCode < 300
      ? pool.query(
          `UPDATE idempotency_keys
              SET status = 'completed',
                  response_status = $1,
                  response_body = $2,
                  completed_at = NOW()
            WHERE user_id = $3 AND idem_key = $4`,
          [statusCode, JSON.stringify(body), userId, key]
        )
      : pool.query(
          `DELETE FROM idempotency_keys WHERE user_id = $1 AND idem_key = $2`,
          [userId, key]
        )

    persist.catch(err =>
      console.error('[idempotency] falha ao gravar resultado:', err.message)
    )

    return originalJson(body)
  }

  // Se a requisição morrer sem passar por res.json (exceção não tratada,
  // conexão abortada), a chave ficaria presa em 'processing' e bloquearia
  // novas tentativas com 409 para sempre. Liberamos na finalização.
  res.on('finish', () => {
    if (res.statusCode >= 400) {
      pool.query(
        `DELETE FROM idempotency_keys
          WHERE user_id = $1 AND idem_key = $2 AND status = 'processing'`,
        [userId, key]
      ).catch(() => {})
    }
  })

  res.on('close', () => {
    if (!res.writableEnded) {
      pool.query(
        `DELETE FROM idempotency_keys
          WHERE user_id = $1 AND idem_key = $2 AND status = 'processing'`,
        [userId, key]
      ).catch(() => {})
    }
  })

  next()
}

// Limpeza por idade — chamada pelo cron. 24h é folga suficiente para cobrir
// qualquer retry legítimo e evita crescimento indefinido da tabela.
const cleanupExpiredKeys = async () => {
  const { rowCount } = await pool.query(
    `DELETE FROM idempotency_keys WHERE created_at < NOW() - INTERVAL '24 hours'`
  )
  return rowCount
}

module.exports = idempotency
module.exports.cleanupExpiredKeys = cleanupExpiredKeys
