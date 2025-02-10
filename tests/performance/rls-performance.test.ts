import { prisma } from '@/lib/prisma'
import { createDeal, createCompliantDeal } from '@/tests/factories/deals'
import { createTenant } from '@/tests/factories/tenants'
import { performance } from 'perf_hooks'
import { DealStage, Department } from '@/lib/types'

describe('RLS Performance Tests', () => {
  // Test data size
  const TENANTS_COUNT = 10
  const DEALS_PER_TENANT = 1000
  const BATCH_SIZE = 100

  // Store test data references
  let tenants: any[] = []
  let dealsByTenant: Map<string, string[]> = new Map()

  beforeAll(async () => {
    // Generate test dataset
    console.log('Generating test dataset...')
    
    // Create tenants
    tenants = await Promise.all(
      Array(TENANTS_COUNT).fill(0).map(() => createTenant())
    )

    // Create deals for each tenant
    for (const tenant of tenants) {
      await prisma.$executeRaw`SELECT set_tenant_context(${tenant.id}::uuid)`
      
      const deals = []
      for (let i = 0; i < DEALS_PER_TENANT; i += BATCH_SIZE) {
        const batch = await Promise.all(
          Array(BATCH_SIZE).fill(0).map(() => 
            createDeal({
              stage: DealStage.CLINICAL_VALIDATION,
              department: Department.CARDIOLOGY,
              clinicalData: {
                patientCount: Math.floor(Math.random() * 1000),
                trials: Array(5).fill(0).map(() => ({
                  id: Math.random().toString(),
                  result: Math.random() > 0.5 ? 'success' : 'failure'
                }))
              }
            })
          )
        )
        deals.push(...batch.map(d => d.id))
      }
      dealsByTenant.set(tenant.id, deals)
    }

    await prisma.$executeRaw`SELECT set_tenant_context(NULL)`
  }, 30000) // Increase timeout for data generation

  afterAll(async () => {
    await prisma.$executeRaw`SELECT set_tenant_context(NULL)`
    await prisma.deal.deleteMany()
    await prisma.tenant.deleteMany()
  })

  it('measures query performance with and without RLS', async () => {
    const tenant = tenants[0]
    const dealIds = dealsByTenant.get(tenant.id)

    // Measure without RLS (direct query)
    const startWithoutRLS = performance.now()
    const dealsWithoutRLS = await prisma.$queryRaw`
      /* EXPLAIN ANALYZE */
      SELECT * FROM "Deal" 
      WHERE tenant_id = ${tenant.id}::uuid
      LIMIT 100
    `
    const timeWithoutRLS = performance.now() - startWithoutRLS

    // Measure with RLS
    await prisma.$executeRaw`SELECT set_tenant_context(${tenant.id}::uuid)`
    const startWithRLS = performance.now()
    const dealsWithRLS = await prisma.deal.findMany({
      take: 100
    })
    const timeWithRLS = performance.now() - startWithRLS

    console.log(`
      Query Performance:
      Without RLS: ${timeWithoutRLS.toFixed(2)}ms
      With RLS: ${timeWithRLS.toFixed(2)}ms
      Overhead: ${((timeWithRLS - timeWithoutRLS) / timeWithoutRLS * 100).toFixed(2)}%
    `)

    expect(timeWithRLS).toBeLessThan(timeWithoutRLS * 1.5) // Max 50% overhead
  })

  it('handles concurrent tenant access efficiently', async () => {
    const concurrentQueries = 50
    const startTime = performance.now()

    // Run concurrent queries for different tenants
    await Promise.all(
      tenants.slice(0, 5).flatMap(tenant => 
        Array(concurrentQueries / 5).fill(tenant).map(async t => {
          await prisma.$executeRaw`SELECT set_tenant_context(${t.id}::uuid)`
          return prisma.deal.findMany({
            where: {
              stage: DealStage.CLINICAL_VALIDATION
            },
            take: 10
          })
        })
      )
    )

    const totalTime = performance.now() - startTime
    const avgTimePerQuery = totalTime / concurrentQueries

    console.log(`
      Concurrent Access:
      Total Queries: ${concurrentQueries}
      Total Time: ${totalTime.toFixed(2)}ms
      Avg Time Per Query: ${avgTimePerQuery.toFixed(2)}ms
    `)

    expect(avgTimePerQuery).toBeLessThan(100) // Max 100ms per query
  })

  it('verifies index utilization', async () => {
    const tenant = tenants[0]
    await prisma.$executeRaw`SELECT set_tenant_context(${tenant.id}::uuid)`

    // Test different query patterns
    const queryPlans = await Promise.all([
      // Basic tenant-filtered query
      prisma.$queryRaw`
        EXPLAIN ANALYZE
        SELECT * FROM "Deal"
        WHERE stage = ${DealStage.CLINICAL_VALIDATION}
        LIMIT 10
      `,

      // Complex filtered query
      prisma.$queryRaw`
        EXPLAIN ANALYZE
        SELECT * FROM "Deal"
        WHERE stage = ${DealStage.CLINICAL_VALIDATION}
        AND department = ${Department.CARDIOLOGY}
        AND clinical_data->>'patientCount' > '100'
        LIMIT 10
      `,

      // Join query
      prisma.$queryRaw`
        EXPLAIN ANALYZE
        SELECT d.*, dp.name as department_name
        FROM "Deal" d
        JOIN "Department" dp ON d.department_id = dp.id
        WHERE d.stage = ${DealStage.CLINICAL_VALIDATION}
        LIMIT 10
      `
    ])

    // Verify index usage in query plans
    queryPlans.forEach((plan: any) => {
      const planText = plan[0]['QUERY PLAN']
      expect(planText).toMatch(/Index Scan/) // Should use indexes
      expect(planText).not.toMatch(/Seq Scan/) // Should not use sequential scans
    })
  })

  it('monitors memory usage during bulk operations', async () => {
    const tenant = tenants[0]
    await prisma.$executeRaw`SELECT set_tenant_context(${tenant.id}::uuid)`

    const initialMemory = process.memoryUsage()
    
    // Perform bulk operation
    const deals = await prisma.deal.findMany({
      where: {
        stage: DealStage.CLINICAL_VALIDATION
      },
      include: {
        department: true
      }
    })

    const finalMemory = process.memoryUsage()
    const memoryDiff = {
      heapUsed: finalMemory.heapUsed - initialMemory.heapUsed,
      heapTotal: finalMemory.heapTotal - initialMemory.heapTotal,
      external: finalMemory.external - initialMemory.external
    }

    console.log(`
      Memory Usage:
      Heap Used: ${(memoryDiff.heapUsed / 1024 / 1024).toFixed(2)}MB
      Heap Total: ${(memoryDiff.heapTotal / 1024 / 1024).toFixed(2)}MB
      External: ${(memoryDiff.external / 1024 / 1024).toFixed(2)}MB
    `)

    // Memory usage should be reasonable
    expect(memoryDiff.heapUsed).toBeLessThan(50 * 1024 * 1024) // Max 50MB heap growth
  })

  it('tests query performance with complex filters', async () => {
    const tenant = tenants[0]
    await prisma.$executeRaw`SELECT set_tenant_context(${tenant.id}::uuid)`

    const startTime = performance.now()

    // Complex query with multiple conditions
    const results = await prisma.deal.findMany({
      where: {
        stage: DealStage.CLINICAL_VALIDATION,
        department: Department.CARDIOLOGY,
        clinicalData: {
          path: ['patientCount'],
          gt: 500
        }
      },
      include: {
        department: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 50
    })

    const queryTime = performance.now() - startTime

    console.log(`
      Complex Query Performance:
      Time: ${queryTime.toFixed(2)}ms
      Results: ${results.length}
    `)

    expect(queryTime).toBeLessThan(200) // Max 200ms for complex query
  })
}) 