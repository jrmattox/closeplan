import { prisma } from '@/lib/prisma'
import { createDeal, createCompliantDeal } from '@/tests/factories/deals'
import { createTenant } from '@/tests/factories/tenants'
import { createUser } from '@/tests/factories/users'
import { getPhiWithAudit } from '@/lib/utils/phi-encryption'
import { DealStage, Department } from '@/lib/types'
import { withTestContext } from '@/tests/utils/test-context'
import { createTestPhiRecord, verifyPhiAccess } from '@/tests/utils/phi-test-data'
import { accessPhi } from '@/lib/phi-access'

describe('PHI Access Patterns', () => {
  let tenantId: string
  let authorizedUser: any
  let unauthorizedUser: any
  let dealWithPhi: any

  beforeAll(async () => {
    // Create test tenant and users
    const tenant = await createTenant()
    tenantId = tenant.id
    await prisma.$executeRaw`SELECT set_tenant_context(${tenantId}::uuid)`

    // Create users with different access levels
    authorizedUser = await createUser({
      role: 'CLINICIAN',
      permissions: ['PHI_ACCESS']
    })

    unauthorizedUser = await createUser({
      role: 'ANALYST',
      permissions: []
    })

    // Create test deal with PHI
    dealWithPhi = await createCompliantDeal({
      stage: DealStage.CLINICAL_VALIDATION,
      department: Department.CARDIOLOGY,
      phi: {
        patientId: 'P12345',
        condition: 'Test Condition',
        clinicalData: {
          sensitive: true,
          details: 'Protected Information'
        }
      }
    })
  })

  afterAll(async () => {
    await prisma.$executeRaw`SELECT set_tenant_context(NULL)`
    await prisma.deal.deleteMany()
    await prisma.phiAccess.deleteMany()
    await prisma.accessLog.deleteMany()
    await prisma.tenant.deleteMany()
  })

  it('enforces authorized vs unauthorized access', async () => {
    // Test authorized access
    const authorizedAccess = await getPhiWithAudit(
      dealWithPhi.id,
      authorizedUser.id
    )
    expect(authorizedAccess).toBeTruthy()
    expect(authorizedAccess.patientId).toBe('P12345')

    // Test unauthorized access
    await expect(
      getPhiWithAudit(dealWithPhi.id, unauthorizedUser.id)
    ).rejects.toThrow(/unauthorized/i)

    // Verify access logs
    const accessLogs = await prisma.accessLog.findMany({
      where: { dealId: dealWithPhi.id },
      orderBy: { timestamp: 'desc' }
    })

    expect(accessLogs).toHaveLength(2)
    expect(accessLogs[0]).toMatchObject({
      userId: unauthorizedUser.id,
      success: false
    })
    expect(accessLogs[1]).toMatchObject({
      userId: authorizedUser.id,
      success: true
    })
  })

  it('validates and logs access purpose', async () => {
    // Create PHI access grant
    const accessGrant = await prisma.phiAccess.create({
      data: {
        userId: authorizedUser.id,
        tenantId,
        purpose: 'Clinical Review',
        accessLevel: 'READ',
        expiresAt: new Date(Date.now() + 3600000), // 1 hour
        allowedFields: ['patientId', 'condition', 'clinicalData']
      }
    })

    // Access with valid purpose
    const validAccess = await prisma.$transaction(async (tx) => {
      await tx.accessLog.create({
        data: {
          dealId: dealWithPhi.id,
          userId: authorizedUser.id,
          action: 'PHI_ACCESS',
          accessType: 'READ',
          resourceType: 'PHI',
          success: true,
          metadata: {
            purpose: 'Clinical Review',
            grantId: accessGrant.id
          }
        }
      })

      return tx.deal.findUnique({
        where: { id: dealWithPhi.id },
        select: { phi: true }
      })
    })

    expect(validAccess.phi).toBeTruthy()

    // Access without purpose
    await expect(
      getPhiWithAudit(dealWithPhi.id, authorizedUser.id)
    ).rejects.toThrow(/purpose required/i)
  })

  it('handles access timeouts correctly', async () => {
    // Create expiring access grant
    const shortGrant = await prisma.phiAccess.create({
      data: {
        userId: authorizedUser.id,
        tenantId,
        purpose: 'Quick Review',
        accessLevel: 'READ',
        expiresAt: new Date(Date.now() + 1000), // 1 second
        allowedFields: ['patientId']
      }
    })

    // Access within timeout
    const immediateAccess = await getPhiWithAudit(
      dealWithPhi.id,
      authorizedUser.id,
      shortGrant.id
    )
    expect(immediateAccess).toBeTruthy()

    // Wait for expiration
    await new Promise(resolve => setTimeout(resolve, 1100))

    // Access after timeout
    await expect(
      getPhiWithAudit(dealWithPhi.id, authorizedUser.id, shortGrant.id)
    ).rejects.toThrow(/access expired/i)
  })

  it('manages bulk PHI operations securely', async () => {
    // Create multiple deals with PHI
    const deals = await Promise.all(
      Array(5).fill(0).map(() =>
        createCompliantDeal({
          phi: {
            patientId: `P${Math.random().toString(36).substr(2, 5)}`,
            condition: 'Test Condition'
          }
        })
      )
    )

    // Create bulk access grant
    const bulkGrant = await prisma.phiAccess.create({
      data: {
        userId: authorizedUser.id,
        tenantId,
        purpose: 'Bulk Analysis',
        accessLevel: 'READ',
        expiresAt: new Date(Date.now() + 3600000),
        allowedFields: ['patientId', 'condition']
      }
    })

    // Test bulk access
    const bulkResults = await prisma.$transaction(async (tx) => {
      // Log bulk access
      await tx.accessLog.create({
        data: {
          dealId: null, // Bulk operation
          userId: authorizedUser.id,
          action: 'BULK_PHI_ACCESS',
          accessType: 'READ',
          resourceType: 'PHI',
          success: true,
          metadata: {
            purpose: 'Bulk Analysis',
            grantId: bulkGrant.id,
            dealCount: deals.length
          }
        }
      })

      return tx.deal.findMany({
        where: {
          id: { in: deals.map(d => d.id) }
        },
        select: { phi: true }
      })
    })

    expect(bulkResults).toHaveLength(deals.length)
    bulkResults.forEach(result => {
      expect(result.phi).toHaveProperty('patientId')
      expect(result.phi).toHaveProperty('condition')
      expect(result.phi).not.toHaveProperty('clinicalData')
    })
  })

  it('enforces field-level access control', async () => {
    // Create restricted access grant
    const restrictedGrant = await prisma.phiAccess.create({
      data: {
        userId: authorizedUser.id,
        tenantId,
        purpose: 'Limited Review',
        accessLevel: 'READ',
        expiresAt: new Date(Date.now() + 3600000),
        allowedFields: ['patientId'], // Only allow patientId access
        restrictions: {
          excludedFields: ['clinicalData'],
          requiresAudit: true
        }
      }
    })

    // Access with field restrictions
    const restrictedAccess = await getPhiWithAudit(
      dealWithPhi.id,
      authorizedUser.id,
      restrictedGrant.id
    )

    // Should only contain allowed fields
    expect(restrictedAccess).toHaveProperty('patientId')
    expect(restrictedAccess).not.toHaveProperty('clinicalData')
    expect(restrictedAccess).not.toHaveProperty('condition')

    // Verify audit log
    const auditLog = await prisma.accessLog.findFirst({
      where: {
        dealId: dealWithPhi.id,
        userId: authorizedUser.id,
        metadata: {
          path: ['grantId'],
          equals: restrictedGrant.id
        }
      },
      orderBy: { timestamp: 'desc' }
    })

    expect(auditLog).toBeTruthy()
    expect(auditLog.metadata).toMatchObject({
      accessedFields: ['patientId'],
      restrictions: restrictedGrant.restrictions
    })
  })

  it('logs access attempts', async () => {
    await withTestContext(['PHI_ACCESS'], async (context) => {
      // Create test record
      const record = await createTestPhiRecord(context.tenantId)

      // Access PHI
      await accessPhi({
        recordId: record.id,
        purpose: 'TEST'
      })

      // Verify audit trail
      await verifyPhiAccess(record.id, ['ACCESS'])
    })
  })

  it('enforces permissions', async () => {
    await withTestContext([], async (context) => {
      const record = await createTestPhiRecord(context.tenantId)

      await expect(
        accessPhi({
          recordId: record.id,
          purpose: 'TEST'
        })
      ).rejects.toThrow('UNAUTHORIZED')

      await verifyPhiAccess(record.id, ['ACCESS_DENIED'])
    })
  })
})
