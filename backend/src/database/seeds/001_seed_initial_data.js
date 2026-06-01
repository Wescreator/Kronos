const bcrypt = require('bcryptjs')
const pool   = require('../config/database')
require('dotenv').config()

async function seed() {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    console.log('→ Inserindo usuários...')

    const passwordHash = await bcrypt.hash('Kronos@2024', 12)

    const result = await client.query(`
      INSERT INTO users (name, email, password_hash, role, position, admitted_at)
      VALUES
        ('Admin Kronos',   'admin@kronos.com',   $1, 'admin',   'Administrador',         '2024-01-01'),
        ('Ana Silva',      'ana@kronos.com',      $1, 'manager', 'Gerente de Projetos',   '2024-01-15'),
        ('Bruno Costa',    'bruno@kronos.com',    $1, 'member',  'Desenvolvedor Senior',  '2024-02-01'),
        ('Carla Mendes',   'carla@kronos.com',    $1, 'member',  'Designer UX/UI',        '2024-03-01'),
        ('Diego Ferreira', 'diego@kronos.com',    $1, 'member',  'Analista Financeiro',   '2024-03-15')
      ON CONFLICT (email) DO UPDATE SET
        name          = EXCLUDED.name,
        password_hash = EXCLUDED.password_hash,
        role          = EXCLUDED.role,
        updated_at    = NOW()
      RETURNING id, email, role
    `, [passwordHash])

    console.log(`  ✓ ${result.rows.length} usuários inseridos/atualizados`)

    const adminId = result.rows.find(u => u.role === 'admin')?.id

    // Categorias de despesa
    if (adminId) {
      await client.query(`
        INSERT INTO expense_categories (name, color, created_by) VALUES
          ('Infraestrutura',      '#7C5CFC', $1),
          ('Marketing',           '#FBBF24', $1),
          ('Recursos Humanos',    '#34D399', $1),
          ('Software e Licenças', '#38BDF8', $1),
          ('Operacional',         '#FB7185', $1),
          ('Viagens',             '#A78BFA', $1),
          ('Consultoria',         '#F472B6', $1)
        ON CONFLICT (name) DO NOTHING
      `, [adminId])
      console.log('  ✓ Categorias de despesa inseridas')

      // Projeto de exemplo
      const proj = await client.query(`
        INSERT INTO projects (title, client, description, status, progress, budget, start_date, expected_date, owner_id, created_by)
        VALUES ('Sistema E-commerce', 'Loja Virtual LTDA', 'Desenvolvimento completo da plataforma.', 'in_progress', 35, 120000, '2024-01-15', '2024-07-30', $1, $1)
        ON CONFLICT DO NOTHING
        RETURNING id
      `, [adminId])

      if (proj.rows[0]) {
        const projectId = proj.rows[0].id
        for (const user of result.rows) {
          await client.query(`
            INSERT INTO project_members (project_id, user_id, role)
            VALUES ($1, $2, $3) ON CONFLICT DO NOTHING
          `, [projectId, user.id, user.role === 'admin' ? 'manager' : 'member'])
        }
        await client.query(`
          INSERT INTO project_status_history (project_id, from_status, to_status, changed_by, note)
          VALUES ($1, NULL, 'planning', $2, 'Projeto criado'),
                 ($1, 'planning', 'in_progress', $2, 'Desenvolvimento iniciado')
        `, [projectId, adminId])
        console.log('  ✓ Projeto de exemplo inserido')
      }
    }

    await client.query('COMMIT')

    console.log('\n✓ Seed concluído com sucesso!')
    console.log('\n─── Credenciais de acesso ───')
    console.log('  admin@kronos.com   | Kronos@2024  (Admin)')
    console.log('  ana@kronos.com     | Kronos@2024  (Manager)')
    console.log('  bruno@kronos.com   | Kronos@2024  (Member)')
    console.log('  carla@kronos.com   | Kronos@2024  (Member)')
    console.log('  diego@kronos.com   | Kronos@2024  (Member)')

  } catch (err) {
    await client.query('ROLLBACK')
    console.error('✗ Erro no seed:', err.message)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

seed()