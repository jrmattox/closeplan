import { prisma } from '@/lib/prisma'

async function verifySetup() {
  try {
    // Check extensions
    const extensions = await prisma.$queryRaw`
      SELECT extname FROM pg_extension
    `
    console.log('Installed extensions:', extensions)

    // Check RLS
    const rlsEnabled = await prisma.$queryRaw`
      SELECT tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public'
    `
    console.log('RLS status:', rlsEnabled)

    // Check encryption keys
    const keys = await prisma.encryptionKeys.count()
    console.log('Encryption keys:', keys)

    // Test tenant isolation
    await prisma.$executeRaw`SELECT set_tenant_context('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid)`
    const auditLogs = await prisma.auditLog.findMany()
    console.log('Audit logs accessible:', auditLogs.length)

  } catch (error) {
    console.error('Setup verification failed:', error)
    process.exit(1)
  }
}

verifySetup() 