// Migra o conteúdo antigo de project_phases.comment (campo único) para a
// nova tabela phase_comments (histórico com autor/data). Idempotente:
// pode ser rodado mais de uma vez sem duplicar registros. O campo
// "comment" original NÃO é apagado — fica como legado morto na tabela.
const pool = require('../src/config/database')

async function migratePhaseComments() {
  console.log('Iniciando migração de comentários de fases...')

  // NOTA: Se o erro de SSL persistir mesmo com a correção abaixo, 
  // verifique se o seu arquivo '../src/config/database' permite 
  // a passagem de opções de SSL.
  
  const { rows: phases } = await pool.query(`
    SELECT id, comment, created_by, company_id, created_at
    FROM project_phases
    WHERE comment IS NOT NULL AND TRIM(comment) <> ''
  `)

  console.log(`Encontradas ${phases.length} fase(s) com comentário legado.`)

  let migrated = 0
  let skipped = 0

  for (const phase of phases) {
    const { rows: existing } = await pool.query(
      `SELECT id FROM phase_comments WHERE phase_id = $1 LIMIT 1`,
      [phase.id]
    )
    if (existing.length > 0) {
      skipped++
      continue
    }

    let authorId = phase.created_by

    if (!authorId) {
      // Fase legada sem criador registrado — usa o dono (owner) do projeto
      const { rows: ownerRows } = await pool.query(
        `SELECT p.owner_id
           FROM project_phases pph
           JOIN project_stages ps ON ps.id = pph.project_stage_id
           JOIN projects p       ON p.id = ps.project_id
          WHERE pph.id = $1`,
        [phase.id]
      )
      authorId = ownerRows[0]?.owner_id
    }

    if (!authorId) {
      console.warn(`Fase ${phase.id} sem autor identificável — pulando.`)
      skipped++
      continue
    }

    await pool.query(
      `INSERT INTO phase_comments (phase_id, company_id, user_id, content, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $5)`,
      [phase.id, phase.company_id, authorId, phase.comment, phase.created_at]
    )
    migrated++
  }

  console.log(`Migração concluída: ${migrated} comentário(s) migrado(s), ${skipped} pulado(s).`)
  console.log('O campo "comment" original NÃO foi apagado (mantido como legado).')
  process.exit(0)
}

// Se o erro persistir, verifique a configuração no arquivo ../src/config/database
// O Supabase requer SSL. Certifique-se que a variável de ambiente DATABASE_URL
// no seu .env contenha ?sslmode=require ao final.
migratePhaseComments().catch(err => {
  console.error('Erro na migração:', err)
  process.exit(1)
})