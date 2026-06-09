const fs   = require('fs')
const path = require('path')
const pool = require('../config/database')

const migrationsDir = path.join(__dirname, 'migrations')

async function runMigrations() {
  const client = await pool.connect()

  try {
    // Cria tabela de controle de migrations se não existir
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id         SERIAL PRIMARY KEY,
        filename   VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `)

    // Busca migrations já aplicadas
    const applied = await client.query('SELECT filename FROM _migrations')
    const appliedSet = new Set(applied.rows.map(r => r.filename))

    // Lê arquivos .sql em ordem
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort()

    for (const file of files) {
      if (appliedSet.has(file)) {
        console.log(`  [já aplicada] ${file}`)
        continue
      }

      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8')

      await client.query('BEGIN')
      await client.query(sql)
      await client.query(
        'INSERT INTO _migrations (filename) VALUES ($1)',
        [file]
      )
      await client.query('COMMIT')

      console.log(`  [aplicada]    ${file}`)
    }

    console.log('\nMigrations concluídas com sucesso.')
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('Erro ao aplicar migration:', err.message)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

runMigrations()