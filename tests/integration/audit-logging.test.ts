import { prisma } from '@/lib/prisma'
import { createDeal, createCompliantDeal } from '@/tests/factories/deals'
import { createTenant } from '@/tests/factories/tenants'
import { createUser } from '@/tests/factories/users'
import { DealStage, Department } from '@/lib/types'

describe('Audit Logging', () => {
  let tenantId: string
  let testUser: any
  let testDeal: any

  beforeAll(async () => {
    const tenant = await createTenant()
    tenantId = tenant.id
    await prisma.$executeRaw`SELECT set_tenant_context(${tenantId}::uuid)`

    testUser = await createUser({
      role: 'CLINICIAN',
      permissions: ['PHI_ACCESS']
    })

    // Set user context for audit logging
    await prisma.$executeRaw`
      SELECT set_config('app.current_user_id', ${testUser.id}, false);
      SELECT set_config('app.current_ip_address', '192.168.1.1', false);
      SELECT set_config('app.current_user_agent', 'Test Browser 1.0', false);
    `
  })

  afterAll(async () => {
    await prisma.$executeRaw`SELECT set_tenant_context(NULL)`
    await prisma.deal.deleteMany()
    await prisma.auditLog.deleteMany()
    await prisma.tenant.deleteMany()
  })

  beforeEach(async () => {
    testDeal = await createCompliantDeal({
      stage: DealStage.CLINICAL_VALIDATION,
      department: Department.CARDIOLOGY,
      clinicalData: {
        patientCount: 100,
        status: 'active'
      }
    })
  })

  it('captures accurate JSON diffs', async () => {
    const originalData = {
      patientCount: 100,
      status: 'active'
    }

    const updatedData = {
      patientCount: 150,
      status: 'completed',
      newField: 'added'
    }

    // Update deal
    await prisma.deal.update({
      where: { id: testDeal.id },
      data: {
        clinicalData: updatedData
      }
    })

    // Verify audit log
    const auditLog = await prisma.auditLog.findFirst({
      where: { 
        dealId: testDeal.id,
        action: 'UPDATE'
      },
      orderBy: { timestamp: 'desc' }
    })

    expect(auditLog.changes).toMatchObject({
      clinicalData: {
        patientCount: {
          old: 100,
          new: 150
        },
        status: {
          old: 'active',
          new: 'completed'
        },
        newField: {
          old: null,
          new: 'added'
        }
      }
    })
  })

  it('captures complete user context', async () => {
    const sessionId = 'test-session-123'
    await prisma.$executeRaw`
      SELECT set_config('app.current_session_id', ${sessionId}, false)
    `

    // Perform action
    await prisma.deal.update({
      where: { id: testDeal.id },
      data: { stage: DealStage.CONTRACT_REVIEW }
    })

    // Verify audit context
    const auditLog = await prisma.auditLog.findFirst({
      where: { dealId: testDeal.id },
      orderBy: { timestamp: 'desc' }
    })

    expect(auditLog.details).toMatchObject({
      context: {
        userId: testUser.id,
        sessionId,
        ipAddress: '192.168.1.1',
        userAgent: 'Test Browser 1.0',
        tenantId
      }
    })
  })

  it('handles sensitive field changes appropriately', async () => {
    const sensitiveData = {
      phi: {
        patientId: 'P12345',
        ssn: '123-45-6789',
        diagnosis: 'Confidential'
      }
    }

    // Update with sensitive data
    await prisma.deal.update({
      where: { id: testDeal.id },
      data: sensitiveData
    })

    // Verify audit log masks sensitive data
    const auditLog = await prisma.auditLog.findFirst({
      where: { dealId: testDeal.id },
      orderBy: { timestamp: 'desc' }
    })

    expect(auditLog.changes).toMatchObject({
      phi: 'SENSITIVE_DATA_MODIFIED'
    })
    expect(auditLog.changes).not.toContain('123-45-6789')
  })

  it('maintains timestamp accuracy and ordering', async () => {
    const timestamps: Date[] = []
    
    // Perform multiple updates in quick succession
    for (let i = 0; i < 5; i++) {
      timestamps.push(new Date())
      await prisma.deal.update({
        where: { id: testDeal.id },
        data: { 
          stage: Object.values(DealStage)[i],
          lastActivity: timestamps[i]
        }
      })
      // Small delay to ensure distinct timestamps
      await new Promise(resolve => setTimeout(resolve, 10))
    }

    // Verify audit logs
    const auditLogs = await prisma.auditLog.findMany({
      where: { dealId: testDeal.id },
      orderBy: { timestamp: 'asc' }
    })

    expect(auditLogs).toHaveLength(5)
    
    // Verify timestamp ordering
    let previousTimestamp = new Date(0)
    auditLogs.forEach((log, index) => {
      expect(log.timestamp).toBeInstanceOf(Date)
      expect(log.timestamp.getTime()).toBeGreaterThan(previousTimestamp.getTime())
      expect(log.timestamp.getTime()).toBeGreaterThanOrEqual(timestamps[index].getTime())
      previousTimestamp = log.timestamp
    })
  })

  it('tracks nested object changes accurately', async () => {
    const originalData = {
      clinicalData: {
        assessment: {
          score: 85,
          details: {
            category: 'A',
            subcategories: ['x', 'y']
          }
        }
      }
    }

    const updatedData = {
      clinicalData: {
        assessment: {
          score: 90,
          details: {
            category: 'B',
            subcategories: ['x', 'z']
          }
        }
      }
    }

    // Create and update deal
    await prisma.deal.update({
      where: { id: testDeal.id },
      data: originalData
    })

    await prisma.deal.update({
      where: { id: testDeal.id },
      data: updatedData
    })

    // Verify audit log captures nested changes
    const auditLog = await prisma.auditLog.findFirst({
      where: { dealId: testDeal.id },
      orderBy: { timestamp: 'desc' }
    })

    expect(auditLog.changes).toMatchObject({
      clinicalData: {
        assessment: {
          score: {
            old: 85,
            new: 90
          },
          details: {
            category: {
              old: 'A',
              new: 'B'
            },
            subcategories: {
              old: ['x', 'y'],
              new: ['x', 'z']
            }
          }
        }
      }
    })
  })

  it('maintains data integrity across transactions', async () => {
    // Perform multiple changes in a transaction
    await prisma.$transaction(async (tx) => {
      // Update 1
      await tx.deal.update({
        where: { id: testDeal.id },
        data: { stage: DealStage.CLINICAL_VALIDATION }
      })

      // Update 2
      await tx.deal.update({
        where: { id: testDeal.id },
        data: { 
          clinicalData: {
            status: 'reviewed'
          }
        }
      })

      // Simulate error
      if (Math.random() < 0.5) {
        throw new Error('Random transaction failure')
      }
    }).catch(() => {
      // Transaction failed - changes should be rolled back
    })

    // Verify audit logs maintain integrity
    const auditLogs = await prisma.auditLog.findMany({
      where: { dealId: testDeal.id },
      orderBy: { timestamp: 'asc' }
    })

    // Either all changes are logged or none are
    const changeCount = auditLogs.length
    expect(changeCount === 0 || changeCount === 2).toBeTruthy()

    if (changeCount === 2) {
      expect(auditLogs[0].changes).toHaveProperty('stage')
      expect(auditLogs[1].changes).toHaveProperty('clinicalData')
    }
  })
}) 