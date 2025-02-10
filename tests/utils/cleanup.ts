import { prisma } from '@/lib/prisma'

export async function clearTestData(): Promise<void> {
  // Use transaction to ensure atomic cleanup
  await prisma.$transaction([
    // Clear test PHI records
    prisma.phiRecord.deleteMany({
      where: {
        metadata: {
          path: ['environment'],
          equals: 'test'
        }
      }
    }),

    // Clear test users
    prisma.user.deleteMany({
      where: {
        email: { contains: 'test-' }
      }
    }),

    // Clear test tenants
    prisma.tenant.deleteMany({
      where: {
        name: { startsWith: 'Test Tenant' }
      }
    }),

    // Clear test audit logs
    prisma.auditLog.deleteMany({
      where: {
        context: {
          path: ['environment'],
          equals: 'test'
        }
      }
    })
  ])
}

export async function clearTestKeys(): Promise<void> {
  await prisma.encryptionKeys.deleteMany({
    where: {
      metadata: {
        path: ['environment'],
        equals: 'test'
      }
    }
  })
}
