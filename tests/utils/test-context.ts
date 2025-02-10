import { prisma } from '@/lib/prisma'
import { v4 as uuidv4 } from 'uuid'

interface TestContext {
  tenantId: string
  userId: string
  permissions: string[]
}

export async function createTestContext(
  permissions: string[] = []
): Promise<TestContext> {
  // Create test tenant
  const tenant = await prisma.tenant.create({
    data: {
      id: uuidv4(),
      name: `Test Tenant ${Date.now()}`,
      settings: {
        mfaRequired: true,
        auditRetention: 90
      }
    }
  })

  // Create test user
  const user = await prisma.user.create({
    data: {
      email: `test-${Date.now()}@example.com`,
      tenantId: tenant.id,
      permissions,
      role: 'TEST_USER'
    }
  })

  // Set tenant context
  await prisma.$executeRaw`SELECT set_tenant_context(${tenant.id}::uuid)`

  return {
    tenantId: tenant.id,
    userId: user.id,
    permissions
  }
}

export async function withTestContext<T>(
  permissions: string[],
  callback: (context: TestContext) => Promise<T>
): Promise<T> {
  const context = await createTestContext(permissions)

  try {
    return await callback(context)
  } finally {
    await prisma.$executeRaw`SELECT set_tenant_context(NULL)`
  }
}
