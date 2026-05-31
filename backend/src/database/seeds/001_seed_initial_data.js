const bcrypt = require('bcryptjs')
const pool = require('../../config/database')

async function seed() {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    console.log('Inserindo usuários...')

    const passwordHash = await bcrypt.hash('kronos123', 12)

    const adminResult = await client.query(`
      INSERT INTO users (name, email, password_hash, role, position, admitted_at)
      VALUES
        ('Admin Kronos',   'admin@kronos.com',   $1, 'admin',   'Administrador',        '2023-01-01'),
        ('Ana Silva',      'ana@kronos.com',      $1, 'manager', 'Gerente de Projetos',  '2023-03-15'),
        ('Bruno Costa',    'bruno@kronos.com',    $1, 'member',  'Desenvolvedor Senior', '2023-06-01'),
        ('Carla Mendes',   'carla@kronos.com',    $1, 'member',  'Designer UX',          '2023-08-10'),
        ('Diego Ferreira', 'diego@kronos.com',    $1, 'member',  'Analista Financeiro',  '2024-01-05')
      ON CONFLICT (email) DO NOTHING
      RETURNING id, email
    `, [passwordHash])

    const users = adminResult.rows
    console.log(`  ${users.length} usuários inseridos`)

    console.log('Inserindo categorias de despesa...')

    const adminId = users[0]?.id
    if (!adminId) {
      console.log('  Usuários já existiam, pulando seed de categorias.')
      await client.query('COMMIT')
      return
    }

    await client.query(`
      INSERT INTO expense_categories (name, color, created_by) VALUES
        ('Infraestrutura',     '#6366f1', $1),
        ('Marketing',          '#f59e0b', $1),
        ('Recursos Humanos',   '#10b981', $1),
        ('Software e Licenças','#3b82f6', $1),
        ('Operacional',        '#ef4444', $1),
        ('Viagens',            '#8b5cf6', $1),
        ('Consultoria',        '#ec4899', $1)
      ON CONFLICT (name) DO NOTHING
    `, [adminId])

    console.log('  Categorias inseridas')

    console.log('Inserindo projeto de exemplo...')

    const projectResult = await client.query(`
      INSERT INTO projects (
        title, client, description, status, progress,
        budget, start_date, expected_date, owner_id, created_by
      ) VALUES (
        'Sistema de E-commerce',
        'Loja Virtual LTDA',
        'Desenvolvimento completo da plataforma de e-commerce com integração de pagamentos.',
        'in_progress',
        35,
        120000.00,
        '2026-01-15',
        '2026-07-30',
        $1,
        $1
      )
      RETURNING id
    `, [adminId])

    const projectId = projectResult.rows[0].id

    // Adiciona membros ao projeto
    for (const user of users) {
      await client.query(`
        INSERT INTO project_members (project_id, user_id, role)
        VALUES ($1, $2, $3)
        ON CONFLICT DO NOTHING
      `, [projectId, user.id, user.email === 'admin@kronos.com' ? 'manager' : 'member'])
    }

    console.log('  Projeto e membros inseridos')

    await client.query('COMMIT')
    console.log('\nSeed concluído com sucesso.')
    console.log('\nCredenciais de acesso:')
    console.log('  admin@kronos.com  / kronos123  (admin)')
    console.log('  ana@kronos.com    / kronos123  (manager)')
    console.log('  bruno@kronos.com  / kronos123  (member)')

  } catch (err) {
    await client.query('ROLLBACK')
    console.error('Erro no seed:', err.message)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

seed()