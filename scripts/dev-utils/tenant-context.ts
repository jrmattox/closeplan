import { prisma } from '@/lib/prisma'
import chalk from 'chalk'

interface TenantOperation {
  action: 'SET' | 'CLEAR' | 'LIST' | 'VERIFY'
  tenantId?: string
}

export async function manageTenantContext(
  operation: TenantOperation
): Promise<void> {
  try {
    switch (operation.action) {
      case 'SET':
        if (!operation.tenantId) throw new Error('Tenant ID required')
        await setTenantContext(operation.tenantId)
        break
      case 'CLEAR':
        await clearTenantContext()
        break
      case 'LIST':
        await listTenants()
        break
      case 'VERIFY':
        await verifyTenantIsolation()
        break
    }
  } catch (error) {
    console.error(chalk.red('Tenant context error:'), error)
    process.exit(1)
  }
}

async function setTenantContext(tenantId: string): Promise<void> {
  // Verify tenant exists
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId }
  })

  if (!tenant) {
    throw new Error(`Tenant ${tenantId} not found`)
  }

  await prisma.$executeRaw`SELECT set_tenant_context(${tenantId}::uuid)`
  console.log(chalk.green(`✓ Tenant context set to ${tenant.name}`))
}

async function verifyTenantIsolation(): Promise<void> {
  const tenants = await prisma.tenant.findMany({
    take: 2
  })

  if (tenants.length < 2) {
    console.log(chalk.yellow('Need at least 2 tenants to verify isolation'))
    return
  }

  // Test isolation
  for (const tenant of tenants) {
    await prisma.$executeRaw`SELECT set_tenant_context(${tenant.id}::uuid)`
    const records = await prisma.phiRecord.findMany()
    console.log(chalk.blue(`Tenant ${tenant.name}: ${records.length} records`))
  }

  await clearTenantContext()
}
