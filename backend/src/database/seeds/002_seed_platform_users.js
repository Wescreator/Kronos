/**
 * Seed: Usuários de plataforma
 *
 * Cria dois usuários iniciais:
 *   1. Developer — escopo global, sem vínculo com empresa
 *   2. Admin     — administrador da Empresa Padrão
 *
 * Uso:
 *   node src/database/seeds/002_seed_platform_users.js
 *
 * Senhas temporárias — altere imediatamente após o primeiro login.
 */

require('dotenv').config()
const bcrypt = require('bcryptjs')
const pool   = require('../../config/database')

const EMPRESA_PADRAO_ID = '00000000-0000-0000-0000-000000000001'

const USERS = [
  {
    name:      'Developer Kronos',
    email:     'dev@kronos.app',
    password:  'Kronos@Dev2026',
    role:      'developer',
    position:  'Platform Developer',
    companyId: null,
  },
  {
    name:      'Administrador',
    email:     'admin@empresapadrao.com',
    password:  'Kronos@Admin2026',
    role:      'admin',
    position:  'Administrador do Sistema',
    companyId: EMPRESA_PADRAO_ID,
  },
]

async function run() {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    for (const u of USERS) {
      const { rows: existing } = await client.query(
        `SELECT id FROM users WHERE email = $1`,
        [u.email]
      )

      if (existing.length > 0) {
        console.log(`⚠  Já existe, pulando: ${u.email}`)
        continue
      }

      const passwordHash = await bcrypt.hash(u.password, 12)

      const { rows } = await client.query(
        `INSERT INTO users (name, email, password_hash, role, position, is_active)
         VALUES ($1,$2,$3,$4,$5,TRUE)
         RETURNING id, name, email, role`,
        [u.name, u.email, passwordHash, u.role, u.position]
      )

      const user = rows[0]
      console.log(`✓  Criado: ${user.email} | role: ${user.role} | id: ${user.id}`)

      if (u.companyId) {
        await client.query(
          `INSERT INTO company_users (company_id, user_id, role, is_active)
           VALUES ($1,$2,$3,TRUE)
           ON CONFLICT (company_id, user_id) DO NOTHING`,
          [u.companyId, user.id, u.role]
        )
        console.log(`   ↳ Vinculado à empresa: ${u.companyId}`)
      } else {
        console.log(`   ↳ Escopo global — sem empresa`)
      }
    }

    await client.query('COMMIT')

    console.log('\n✓ Seed concluído com sucesso.')
    console.log('\nCredenciais temporárias:')
    USERS.forEach(u => console.log(`  ${u.email}  →  ${u.password}`))
    console.log('\nAltere as senhas imediatamente após o primeiro acesso.\n')

  } catch (err) {
    await client.query('ROLLBACK')
    console.error('✗ Erro:', err.message)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

run()