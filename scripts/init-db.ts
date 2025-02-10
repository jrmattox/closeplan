import { execSync } from 'child_process'
import { PrismaClient } from '@prisma/client'

async function initDatabase() {
  try {
    // Drop database if exists
    try {
      execSync('dropdb closeplan', { stdio: 'pipe' })
      console.log('✓ Dropped existing database')
    } catch (error) {
      // Ignore if database doesn't exist
    }

    // Create fresh database
    execSync('createdb closeplan', { stdio: 'pipe' })
    console.log('✓ Database created')

    // Run migrations (which will include extension creation)
    execSync('npx prisma migrate reset --force', { stdio: 'inherit' })
    console.log('✓ Migrations applied')

  } catch (error) {
    console.error('Failed to initialize database:', error)
    process.exit(1)
  }
}

initDatabase()
