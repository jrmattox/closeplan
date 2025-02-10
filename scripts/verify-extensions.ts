import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function verifyExtensions() {
  try {
    const result = await prisma.$queryRaw`
      SELECT extname, installed_version
      FROM pg_extension
      WHERE extname IN ('uuid-ossp', 'pgcrypto', 'pg_stat_statements')
    `
    console.log('Installed extensions:', result)
  } catch (error) {
    console.error('Failed to verify extensions:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

verifyExtensions()
