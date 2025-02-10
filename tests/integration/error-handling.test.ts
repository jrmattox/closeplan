import { prisma } from '@/lib/prisma'
import { createDeal, createCompliantDeal } from '@/tests/factories/deals'
import { createTenant } from '@/tests/factories/tenants'
import { createUser } from '@/tests/factories/users'
import { getPhiWithAudit } from '@/lib/utils/phi-encryption'
import { ComplianceReporter } from '@/lib/reporting/compliance-reporter'
import { mockDeep, MockProxy } from 'jest-mock-extended'
import { PrismaClient } from '@prisma/client'
import { setTimeout } from 'timers/promises'

describe('Error Handling and Recovery', () => {
  let mockPrisma: MockProxy<PrismaClient>
  let tenant: any
  let user: any
  let deal: any
  let originalPrisma: any

  beforeAll(async () => {
    // Store original prisma instance
    originalPrisma = global.prisma

    // Create test data
    tenant = await createTenant()
    user = await createUser({
      role: 'CLINICIAN',
      permissions: ['PHI_ACCESS'],
      tenantId: tenant.id
    })

    await prisma.$executeRaw`SELECT set_tenant_context(${tenant.id}::uuid)`
    deal = await createCompliantDeal()
  })

  beforeEach(() => {
    // Create fresh mock for each test
    mockPrisma = mockDeep<PrismaClient>()
    global.prisma = mockPrisma as any
  })

  afterEach(() => {
    // Restore original prisma
    global.prisma = originalPrisma
  })

  afterAll(async () => {
    await prisma.$executeRaw`SELECT set_tenant_context(NULL)`
    await prisma.deal.deleteMany()
    await prisma.tenant.deleteMany()
  })

  describe('Database Connection Failures', () => {
    it('handles temporary connection losses', async () => {
      // Simulate connection failure then recovery
      let connectionAttempts = 0
      mockPrisma.deal.findUnique.mockImplementation(async () => {
        connectionAttempts++
        if (connectionAttempts === 1) {
          throw new Error('Connection lost')
        }
        return deal
      })

      // Attempt access with retry logic
      const result = await withRetry(
        () => getPhiWithAudit(deal.id, user.id),
        { maxAttempts: 3, delay: 100 }
      )

      expect(result).toBeTruthy()
      expect(connectionAttempts).toBe(2)
    })

    it('maintains data integrity during connection issues', async () => {
      // Simulate partial failure during multi-step operation
      const steps: string[] = []
      
      mockPrisma.$transaction.mockImplementation(async (fn) => {
        steps.push('transaction_start')
        try {
          if (steps.length === 1) {
            throw new Error('Connection lost during transaction')
          }
          await fn(mockPrisma)
          steps.push('transaction_complete')
          return true
        } catch (error) {
          steps.push('transaction_rollback')
          throw error
        }
      })

      // Attempt operation with recovery
      await expect(
        withRetry(
          () => updateDealWithPhi(deal.id, { newData: 'test' }),
          { maxAttempts: 2 }
        )
      ).resolves.not.toThrow()

      expect(steps).toEqual([
        'transaction_start',
        'transaction_rollback',
        'transaction_start',
        'transaction_complete'
      ])
    })
  })

  describe('Encryption Key Issues', () => {
    it('handles key rotation failures', async () => {
      const errorLog: string[] = []

      // Simulate key rotation failure
      mockPrisma.$executeRaw.mockImplementationOnce(async () => {
        throw new Error('Failed to rotate key')
      })

      // Attempt key rotation with fallback
      try {
        await rotateEncryptionKeyWithFallback(errorLog)
      } catch (error) {
        errorLog.push('Key rotation failed, using existing key')
      }

      // Verify system remains operational
      const accessResult = await getPhiWithAudit(deal.id, user.id)
      expect(accessResult).toBeTruthy()
      expect(errorLog).toContain('Key rotation failed, using existing key')
    })

    it('recovers from corrupted key data', async () => {
      // Simulate corrupted key data
      mockPrisma.encryptionKeys.findFirst.mockResolvedValueOnce({
        ...deal,
        keyValue: Buffer.from('corrupted'),
      } as any)

      // Attempt recovery
      const recoveryResult = await recoverFromKeyCorruption(deal.id)
      
      expect(recoveryResult.recovered).toBe(true)
      expect(recoveryResult.logs).toContain('Backup key used for recovery')
    })
  })

  describe('Audit System Failures', () => {
    it('maintains operation when audit logging fails', async () => {
      // Simulate audit system failure
      mockPrisma.auditLog.create.mockRejectedValue(new Error('Audit system unavailable'))
      mockPrisma.deal.findUnique.mockResolvedValue(deal)

      // Attempt operation with degraded audit
      const result = await getPhiWithAudit(deal.id, user.id)

      expect(result).toBeTruthy()
      // Verify fallback logging
      const fallbackLog = await prisma.$queryRaw`
        SELECT * FROM "ErrorLog"
        WHERE error_type = 'AUDIT_SYSTEM_FAILURE'
        ORDER BY timestamp DESC
        LIMIT 1
      `
      expect(fallbackLog).toBeTruthy()
    })

    it('recovers missed audit entries', async () => {
      // Create gaps in audit log
      const missedEntries = new Set<string>()
      mockPrisma.auditLog.findMany.mockImplementation(async () => {
        // Simulate some missing entries
        return deal.auditLogs.filter(() => Math.random() > 0.5)
      })

      // Run audit recovery
      const recoveryResult = await recoverMissedAuditEntries(deal.id)

      expect(recoveryResult.recoveredCount).toBeGreaterThan(0)
      expect(recoveryResult.missingEntries).toEqual(Array.from(missedEntries))
    })
  })

  describe('Tenant Context Errors', () => {
    it('handles lost tenant context', async () => {
      // Simulate lost tenant context
      mockPrisma.$executeRaw.mockImplementation(async (query) => {
        if (query.includes('current_tenant_id')) {
          return [{ current_setting: null }]
        }
        return []
      })

      // Attempt operation with context recovery
      const result = await withTenantContextRecovery(
        () => getPhiWithAudit(deal.id, user.id),
        tenant.id
      )

      expect(result).toBeTruthy()
    })

    it('prevents cross-tenant corruption', async () => {
      // Simulate tenant context switch failure
      let currentTenant = tenant.id
      mockPrisma.$executeRaw.mockImplementation(async (query) => {
        if (query.includes('set_tenant_context')) {
          // Simulate failure to switch context
          throw new Error('Failed to switch tenant context')
        }
        return [{ current_setting: currentTenant }]
      })

      // Attempt cross-tenant operation
      await expect(
        switchTenantContext('other-tenant-id')
      ).rejects.toThrow()

      // Verify original context maintained
      const contextCheck = await getCurrentTenantContext()
      expect(contextCheck).toBe(tenant.id)
    })
  })
})

// Helper functions
async function withRetry<T>(
  fn: () => Promise<T>,
  options: { maxAttempts: number; delay?: number } = { maxAttempts: 3, delay: 1000 }
): Promise<T> {
  let lastError: Error
  for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (attempt < options.maxAttempts) {
        await setTimeout(options.delay)
      }
    }
  }
  throw lastError
}

async function rotateEncryptionKeyWithFallback(errorLog: string[]): Promise<void> {
  try {
    await prisma.$executeRaw`SELECT rotate_encryption_key()`
  } catch (error) {
    errorLog.push('Key rotation failed, using existing key')
    // Log error and continue with existing key
    await prisma.errorLog.create({
      data: {
        type: 'KEY_ROTATION_FAILURE',
        error: error.message,
        timestamp: new Date()
      }
    })
  }
}

async function recoverFromKeyCorruption(dealId: string) {
  const logs: string[] = []
  try {
    // Attempt to use backup key
    const backupKey = await prisma.encryptionKeys.findFirst({
      where: { 
        active: false,
        createdAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      },
      orderBy: { createdAt: 'desc' }
    })

    if (backupKey) {
      logs.push('Backup key used for recovery')
      return { recovered: true, logs }
    }

    // If no backup, create new key
    logs.push('Creating new key for recovery')
    await prisma.$executeRaw`SELECT rotate_encryption_key()`
    return { recovered: true, logs }
  } catch (error) {
    logs.push(`Recovery failed: ${error.message}`)
    return { recovered: false, logs }
  }
}

async function recoverMissedAuditEntries(dealId: string) {
  const missingEntries: string[] = []
  let recoveredCount = 0

  // Get all expected audit points
  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    include: { auditLogs: true }
  })

  // Find gaps in audit trail
  const auditTimes = deal.auditLogs.map(log => log.timestamp.getTime())
  auditTimes.sort((a, b) => a - b)

  for (let i = 1; i < auditTimes.length; i++) {
    if (auditTimes[i] - auditTimes[i-1] > 5000) { // Gap > 5 seconds
      missingEntries.push(`Gap between ${new Date(auditTimes[i-1]).toISOString()} and ${new Date(auditTimes[i]).toISOString()}`)
    }
  }

  return { recoveredCount, missingEntries }
}

async function withTenantContextRecovery<T>(
  fn: () => Promise<T>,
  tenantId: string
): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    if (error.message.includes('tenant context')) {
      // Attempt to recover context
      await prisma.$executeRaw`SELECT set_tenant_context(${tenantId}::uuid)`
      return await fn()
    }
    throw error
  }
}

async function getCurrentTenantContext(): Promise<string | null> {
  const result = await prisma.$queryRaw`
    SELECT current_setting('app.current_tenant_id', true) as tenant_id
  `
  return result[0]?.tenant_id
}

async function switchTenantContext(tenantId: string): Promise<void> {
  const originalContext = await getCurrentTenantContext()
  try {
    await prisma.$executeRaw`SELECT set_tenant_context(${tenantId}::uuid)`
  } catch (error) {
    // Restore original context on failure
    await prisma.$executeRaw`SELECT set_tenant_context(${originalContext}::uuid)`
    throw error
  }
} 