const { Pool } = require('pg')

// Por padrão NAO valida a cadeia da CA: o pooler do Supabase
// (...pooler.supabase.com) apresenta um certificado self-signed, o que
// quebra a validacao. A conexao continua criptografada (TLS).
// Para exigir validacao, defina DB_SSL_REJECT_UNAUTHORIZED=true e
// forneca a CA em DB_SSL_CA (funciona na conexao direta db.xxx).
const rejectUnauthorized =
  String(process.env.DB_SSL_REJECT_UNAUTHORIZED).toLowerCase() === 'true'

// CA opcional (ex.: certificado do Supabase). Aceita o PEM em multilinha
// ou em uma linha com "\n" escapado.
const sslCa = process.env.DB_SSL_CA
  ? process.env.DB_SSL_CA.replace(/\\n/g, '\n')
  : undefined

// Em desenvolvimento local (Postgres do Docker, sem TLS configurado),
// SSL precisa vir totalmente desabilitado — passar um objeto `ssl` (mesmo
// com rejectUnauthorized: false) já faz o driver `pg` tentar negociar TLS,
// o que o Postgres puro do Docker rejeita ("server does not support SSL").
const useSsl = process.env.NODE_ENV !== 'development'

// As versoes novas do `pg` tratam `sslmode=require` como `verify-full`
// (valida a cadeia da CA) e isso sobrepoe o objeto `ssl` abaixo, quebrando
// no pooler self-signed do Supabase. Removemos o sslmode/uselibpqcompat da
// connection string usada pelo `pg` e controlamos o TLS apenas pelo objeto
// `ssl`. O Prisma continua usando a DATABASE_URL original (com sslmode).
function stripSslMode(url) {
  if (!url) return url
  try {
    const u = new URL(url)
    u.searchParams.delete('sslmode')
    u.searchParams.delete('uselibpqcompat')
    return u.toString()
  } catch {
    return url
  }
}

const pool = new Pool({
  connectionString: stripSslMode(process.env.DATABASE_URL),
  ssl: useSsl
    ? {
        rejectUnauthorized,
        ca: sslCa,
      }
    : false,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 30000,
  // Mata no servidor qualquer query que passe de 15s: com pool max=5, uma
  // consulta travada (lenta ou maliciosa) poderia reter conexões e degradar
  // toda a API. Configurável via DB_STATEMENT_TIMEOUT_MS.
  statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT_MS) || 15000,
})

pool.on('error', (err) => {
  console.error('PostgreSQL pool error:', err.message)
})

// Aviso de segurança (não altera comportamento): em produção, se o TLS
// estiver ativo mas sem validar a cadeia da CA e sem CA fornecida, a
// conexão é criptografada porém vulnerável a MITM. Para eliminar, defina
// DB_SSL_REJECT_UNAUTHORIZED=true e forneça DB_SSL_CA (conexão direta
// db.xxx.supabase.co, não o pooler self-signed).
if (process.env.NODE_ENV === 'production' && useSsl && !rejectUnauthorized && !sslCa) {
  console.warn(
    '[database] AVISO: conexão TLS com o banco SEM validação de CA ' +
    '(rejectUnauthorized=false). Susceptível a MITM. Configure ' +
    'DB_SSL_REJECT_UNAUTHORIZED=true + DB_SSL_CA para produção.'
  )
}

module.exports = pool