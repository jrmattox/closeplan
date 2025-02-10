import { prisma } from '@/lib/prisma'
import { createDeal, createCompliantDeal } from '@/tests/factories/deals'
import { createTenant } from '@/tests/factories/tenants'
import { createUser } from '@/tests/factories/users'
import { DealStage, Department } from '@/lib/types'
import { performance } from 'perf_hooks'

describe('Audit Logging Performance', () => {
  // Test configuration
  const BATCH_SIZE = 100
  const CONCURRENT_OPERATIONS = 50
  const ITERATIONS = 5

  let tenantId: string
  let testUser: any
  let testDeals: any[] = []

  beforeAll(async () => {
    // Setup test environment
    const tenant = await createTenant()
    tenantId = tenant.id
    await prisma.$executeRaw`SELECT set_tenant_context(${tenantId}::uuid)`

    testUser = await createUser({
      role: 'CLINICIAN',
      permissions: ['PHI_ACCESS']
    })

    // Set user context
    await prisma.$executeRaw`
      SELECT set_config('app.current_user_id', ${testUser.id}, false);
      SELECT set_config('app.current_ip_address', '192.168.1.1', false);
    `

    // Create test deals
    console.log('Creating test deals...')
    for (let i = 0; i < BATCH_SIZE; i++) {
      const deal = await createCompliantDeal({
        stage: DealStage.CLINICAL_VALIDATION,
        department: Department.CARDIOLOGY,
        clinicalData: {
          patientCount: Math.floor(Math.random() * 1000),
          status: 'active',
          details: Array(10).fill(0).map(() => ({
            id: Math.random().toString(),
            value: Math.random().toString(36).substring(7)
          }))
        }
      })
      testDeals.push(deal)
    }
  }, 30000) // Increased timeout for setup

  afterAll(async () => {
    await prisma.$executeRaw`SELECT set_tenant_context(NULL)`
    await prisma.deal.deleteMany()
    await prisma.auditLog.deleteMany()
    await prisma.tenant.deleteMany()
  })

  it('measures write operation overhead with audit logging', async () => {
    const results = {
      withAudit: [] as number[],
      withoutAudit: [] as number[]
    }

    for (let i = 0; i < ITERATIONS; i++) {
      // Test with audit logging
      const startWithAudit = performance.now()
      await prisma.deal.update({
        where: { id: testDeals[0].id },
        data: {
          clinicalData: {
            patientCount: Math.floor(Math.random() * 1000),
            status: 'updated',
            timestamp: new Date()
          }
        }
      })
      results.withAudit.push(performance.now() - startWithAudit)

      // Test without audit logging (direct query)
      const startWithoutAudit = performance.now()
      await prisma.$executeRaw`
        UPDATE "Deal"
        SET clinical_data = jsonb_set(
          clinical_data,
          '{patientCount}',
          ${Math.floor(Math.random() * 1000)}::text::jsonb
        )
        WHERE id = ${testDeals[0].id}::uuid
      `
      results.withoutAudit.push(performance.now() - startWithoutAudit)
    }

    const avgWithAudit = results.withAudit.reduce((a, b) => a + b) / ITERATIONS
    const avgWithoutAudit = results.withoutAudit.reduce((a, b) => a + b) / ITERATIONS

    console.log(`
      Write Performance:
      With Audit: ${avgWithAudit.toFixed(2)}ms
      Without Audit: ${avgWithoutAudit.toFixed(2)}ms
      Overhead: ${((avgWithAudit - avgWithoutAudit) / avgWithoutAudit * 100).toFixed(2)}%
    `)

    expect(avgWithAudit).toBeLessThan(avgWithoutAudit * 2) // Max 100% overhead
  })

  it('handles concurrent audit writes efficiently', async () => {
    const startTime = performance.now()
    const operations = []

    // Generate concurrent operations
    for (let i = 0; i < CONCURRENT_OPERATIONS; i++) {
      const deal = testDeals[i % testDeals.length]
      operations.push(
        prisma.deal.update({
          where: { id: deal.id },
          data: {
            stage: Object.values(DealStage)[i % Object.values(DealStage).length],
            clinicalData: {
              updateCount: i,
              timestamp: new Date()
            }
          }
        })
      )
    }

    // Execute concurrent operations
    await Promise.all(operations)
    const totalTime = performance.now() - startTime

    // Verify audit logs
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        timestamp: {
          gte: new Date(startTime)
        }
      }
    })

    console.log(`
      Concurrent Performance:
      Operations: ${CONCURRENT_OPERATIONS}
      Total Time: ${totalTime.toFixed(2)}ms
      Avg Time Per Op: ${(totalTime / CONCURRENT_OPERATIONS).toFixed(2)}ms
      Audit Logs: ${auditLogs.length}
    `)

    expect(auditLogs.length).toBe(CONCURRENT_OPERATIONS)
    expect(totalTime / CONCURRENT_OPERATIONS).toBeLessThan(100) // Max 100ms per operation
  })

  it('verifies audit log index effectiveness', async () => {
    // Create test data
    const testDeal = testDeals[0]
    const updates = 1000

    // Perform multiple updates
    for (let i = 0; i < updates; i++) {
      await prisma.deal.update({
        where: { id: testDeal.id },
        data: {
          clinicalData: {
            updateCount: i,
            timestamp: new Date()
          }
        }
      })
    }

    // Test different query patterns
    const queryTests = [
      {
        name: 'Recent Changes Query',
        query: async () => {
          const start = performance.now()
          await prisma.auditLog.findMany({
            where: {
              dealId: testDeal.id,
              timestamp: {
                gte: new Date(Date.now() - 3600000) // Last hour
              }
            },
            orderBy: { timestamp: 'desc' },
            take: 100
          })
          return performance.now() - start
        }
      },
      {
        name: 'User Activity Query',
        query: async () => {
          const start = performance.now()
          await prisma.auditLog.findMany({
            where: {
              actorId: testUser.id,
              action: 'UPDATE'
            },
            orderBy: { timestamp: 'desc' },
            take: 100
          })
          return performance.now() - start
        }
      }
    ]

    // Execute and measure queries
    for (const test of queryTests) {
      const times = []
      for (let i = 0; i < 5; i++) {
        times.push(await test.query())
      }
      const avgTime = times.reduce((a, b) => a + b) / times.length

      console.log(`
        ${test.name}:
        Avg Time: ${avgTime.toFixed(2)}ms
      `)

      expect(avgTime).toBeLessThan(100) // Max 100ms per query
    }
  })

  it('monitors audit log storage growth', async () => {
    // Measure initial size
    const initialSize = await prisma.$queryRaw`
      SELECT pg_total_relation_size('public."AuditLog"') as size
    `
    const startSize = initialSize[0].size

    // Generate audit logs
    const batchSize = 1000
    const changes = Array(batchSize).fill(0).map((_, i) => ({
      clinicalData: {
        updateCount: i,
        details: Array(5).fill(0).map(() => ({
          id: Math.random().toString(),
          value: Math.random().toString(36).substring(7)
        }))
      }
    }))

    // Perform updates
    await Promise.all(
      changes.map((change, i) =>
        prisma.deal.update({
          where: { id: testDeals[i % testDeals.length].id },
          data: change
        })
      )
    )

    // Measure final size
    const finalSize = await prisma.$queryRaw`
      SELECT pg_total_relation_size('public."AuditLog"') as size
    `
    const endSize = finalSize[0].size
    const growthBytes = endSize - startSize
    const bytesPerLog = growthBytes / batchSize

    console.log(`
      Storage Growth:
      Initial Size: ${(startSize / 1024 / 1024).toFixed(2)}MB
      Final Size: ${(endSize / 1024 / 1024).toFixed(2)}MB
      Growth: ${(growthBytes / 1024 / 1024).toFixed(2)}MB
      Bytes per Log: ${bytesPerLog.toFixed(2)}
    `)

    expect(bytesPerLog).toBeLessThan(5000) // Max 5KB per audit log
  })
}) 