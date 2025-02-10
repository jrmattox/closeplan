import { prisma } from '@/lib/prisma'
import { createDeal, createCompliantDeal } from '@/tests/factories/deals'
import { createTenant } from '@/tests/factories/tenants'
import { setTenantContext } from '@/lib/middleware/tenant-context'
import { DealStage, Department } from '@/lib/types'

describe('Tenant Isolation', () => {
  // Test tenants
  let tenant1Id: string
  let tenant2Id: string
  let tenant1Deal: any
  let tenant2Deal: any

  beforeAll(async () => {
    // Create test tenants
    const tenant1 = await createTenant()
    const tenant2 = await createTenant()
    tenant1Id = tenant1.id
    tenant2Id = tenant2.id

    // Create test deals for each tenant
    await prisma.$executeRaw`SELECT set_tenant_context(${tenant1Id}::uuid)`
    tenant1Deal = await createDeal({
      stage: DealStage.CLINICAL_VALIDATION,
      department: Department.CARDIOLOGY
    })

    await prisma.$executeRaw`SELECT set_tenant_context(${tenant2Id}::uuid)`
    tenant2Deal = await createDeal({
      stage: DealStage.CLINICAL_VALIDATION,
      department: Department.ONCOLOGY
    })
  })

  afterAll(async () => {
    await prisma.$executeRaw`SELECT set_tenant_context(NULL)`
    await prisma.deal.deleteMany()
    await prisma.tenant.deleteMany()
  })

  beforeEach(async () => {
    await prisma.$executeRaw`SELECT set_tenant_context(NULL)`
  })

  it('prevents cross-tenant access', async () => {
    // Set context to tenant1
    await prisma.$executeRaw`SELECT set_tenant_context(${tenant1Id}::uuid)`

    // Should be able to access own deal
    const ownDeal = await prisma.deal.findUnique({
      where: { id: tenant1Deal.id }
    })
    expect(ownDeal).toBeTruthy()

    // Should not be able to access tenant2's deal
    const otherDeal = await prisma.deal.findUnique({
      where: { id: tenant2Deal.id }
    })
    expect(otherDeal).toBeNull()

    // Direct query should also fail
    await expect(
      prisma.$executeRaw`
        SELECT * FROM "Deal" 
        WHERE tenant_id = ${tenant2Id}::uuid
      `
    ).rejects.toThrow()
  })

  it('handles tenant context switching correctly', async () => {
    // Start with tenant1
    await prisma.$executeRaw`SELECT set_tenant_context(${tenant1Id}::uuid)`
    const tenant1Deals = await prisma.deal.findMany()
    expect(tenant1Deals).toHaveLength(1)
    expect(tenant1Deals[0].id).toBe(tenant1Deal.id)

    // Switch to tenant2
    await prisma.$executeRaw`SELECT set_tenant_context(${tenant2Id}::uuid)`
    const tenant2Deals = await prisma.deal.findMany()
    expect(tenant2Deals).toHaveLength(1)
    expect(tenant2Deals[0].id).toBe(tenant2Deal.id)
  })

  it('enforces null tenant context restrictions', async () => {
    // Clear tenant context
    await prisma.$executeRaw`SELECT set_tenant_context(NULL)`

    // All queries should fail without tenant context
    await expect(
      prisma.deal.findMany()
    ).rejects.toThrow(/tenant context/i)

    await expect(
      prisma.deal.create({
        data: {
          name: 'Test Deal',
          stage: DealStage.DISCOVERY,
          department: Department.CARDIOLOGY
        }
      })
    ).rejects.toThrow(/tenant context/i)
  })

  it('validates inherited tenant access', async () => {
    await prisma.$executeRaw`SELECT set_tenant_context(${tenant1Id}::uuid)`

    // Create related records
    const department = await prisma.department.create({
      data: {
        name: 'Test Department',
        type: 'CLINICAL',
        organizationId: tenant1Deal.organizationId
      }
    })

    // Related records should inherit tenant_id
    const fetchedDept = await prisma.department.findUnique({
      where: { id: department.id }
    })
    expect(fetchedDept.tenantId).toBe(tenant1Id)

    // Switch tenant context
    await prisma.$executeRaw`SELECT set_tenant_context(${tenant2Id}::uuid)`
    
    // Should not be able to access inherited records
    const inaccessibleDept = await prisma.department.findUnique({
      where: { id: department.id }
    })
    expect(inaccessibleDept).toBeNull()
  })

  it('maintains tenant isolation for bulk operations', async () => {
    await prisma.$executeRaw`SELECT set_tenant_context(${tenant1Id}::uuid)`

    // Create multiple deals
    const deals = await Promise.all([
      createDeal({ department: Department.CARDIOLOGY }),
      createDeal({ department: Department.ONCOLOGY }),
      createDeal({ department: Department.NEUROLOGY })
    ])

    // Verify all deals have correct tenant
    const fetchedDeals = await prisma.deal.findMany({
      where: {
        id: { in: deals.map(d => d.id) }
      }
    })
    expect(fetchedDeals).toHaveLength(3)
    fetchedDeals.forEach(deal => {
      expect(deal.tenantId).toBe(tenant1Id)
    })

    // Switch tenant context
    await prisma.$executeRaw`SELECT set_tenant_context(${tenant2Id}::uuid)`

    // Should not be able to access any deals
    const inaccessibleDeals = await prisma.deal.findMany({
      where: {
        id: { in: deals.map(d => d.id) }
      }
    })
    expect(inaccessibleDeals).toHaveLength(0)
  })

  it('enforces tenant isolation for PHI data', async () => {
    await prisma.$executeRaw`SELECT set_tenant_context(${tenant1Id}::uuid)`

    // Create deal with PHI
    const dealWithPhi = await createCompliantDeal({
      phi: {
        patientCount: 100,
        clinicalDetails: 'Test PHI data'
      }
    })

    // Switch tenant context
    await prisma.$executeRaw`SELECT set_tenant_context(${tenant2Id}::uuid)`

    // Should not be able to access PHI
    const inaccessiblePhi = await prisma.deal.findUnique({
      where: { id: dealWithPhi.id },
      select: { phi: true }
    })
    expect(inaccessiblePhi).toBeNull()
  })
}) 