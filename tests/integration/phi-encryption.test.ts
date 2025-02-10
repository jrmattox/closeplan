import { prisma } from '@/lib/prisma'
import { createDeal } from '@/tests/factories/deals'
import { createTenant } from '@/tests/factories/tenants'
import { DealStage, Department } from '@/lib/types'

describe('PHI Encryption', () => {
  let tenantId: string
  let dealId: string

  beforeAll(async () => {
    // Create test tenant
    const tenant = await createTenant()
    tenantId = tenant.id
    await prisma.$executeRaw`SELECT set_tenant_context(${tenantId}::uuid)`
  })

  afterAll(async () => {
    await prisma.$executeRaw`SELECT set_tenant_context(NULL)`
    await prisma.deal.deleteMany()
    await prisma.tenant.deleteMany()
  })

  it('verifies encryption/decryption roundtrip', async () => {
    const originalPhi = {
      patientId: 'P12345',
      mrn: 'MRN789',
      condition: 'Cardiac Arrhythmia',
      demographics: {
        age: 45,
        gender: 'F',
        zipCode: '12345'
      },
      clinicalData: {
        bloodPressure: '120/80',
        heartRate: 72
      }
    }

    // Create deal with PHI
    const deal = await createDeal({
      stage: DealStage.CLINICAL_VALIDATION,
      department: Department.CARDIOLOGY,
      phi: originalPhi
    })

    // Verify raw storage is encrypted
    const rawDeal = await prisma.$queryRaw`
      SELECT phi FROM "Deal" WHERE id = ${deal.id}::uuid
    `
    const encryptedPhi = rawDeal[0].phi
    expect(encryptedPhi).not.toEqual(originalPhi)
    expect(encryptedPhi).toHaveProperty('data')
    expect(encryptedPhi).toHaveProperty('iv')
    expect(encryptedPhi).toHaveProperty('key_version')

    // Verify decryption
    const fetchedDeal = await prisma.deal.findUnique({
      where: { id: deal.id },
      select: { phi: true }
    })
    expect(fetchedDeal.phi).toEqual(originalPhi)
  })

  it('handles key rotation correctly', async () => {
    // Create initial deal with PHI
    const phi = {
      patientId: 'P67890',
      condition: 'Hypertension'
    }
    const deal = await createDeal({
      phi
    })

    // Get initial key version
    const initialDeal = await prisma.$queryRaw`
      SELECT phi->>'key_version' as key_version 
      FROM "Deal" 
      WHERE id = ${deal.id}::uuid
    `
    const initialKeyVersion = initialDeal[0].key_version

    // Rotate encryption key
    await prisma.$executeRaw`SELECT rotate_encryption_key()`

    // Re-encrypt all PHI data
    await prisma.$executeRaw`SELECT reencrypt_phi_data()`

    // Verify key version changed
    const updatedDeal = await prisma.$queryRaw`
      SELECT phi->>'key_version' as key_version 
      FROM "Deal" 
      WHERE id = ${deal.id}::uuid
    `
    const newKeyVersion = updatedDeal[0].key_version
    expect(newKeyVersion).not.toEqual(initialKeyVersion)

    // Verify data still decrypts correctly
    const decryptedDeal = await prisma.deal.findUnique({
      where: { id: deal.id },
      select: { phi: true }
    })
    expect(decryptedDeal.phi).toEqual(phi)
  })

  it('handles null and edge cases', async () => {
    // Test null PHI
    const dealWithNullPhi = await createDeal({
      phi: null
    })
    expect(dealWithNullPhi.phi).toBeNull()

    // Test empty object
    const dealWithEmptyPhi = await createDeal({
      phi: {}
    })
    expect(dealWithEmptyPhi.phi).toEqual({})

    // Test nested nulls
    const dealWithNestedNulls = await createDeal({
      phi: {
        patientId: null,
        demographics: null,
        records: [null, { id: 1 }, null]
      }
    })
    expect(dealWithNestedNulls.phi.patientId).toBeNull()
    expect(dealWithNestedNulls.phi.demographics).toBeNull()
    expect(dealWithNestedNulls.phi.records).toEqual([null, { id: 1 }, null])
  })

  it('verifies searchable encryption', async () => {
    // Create deals with searchable PHI
    const deals = await Promise.all([
      createDeal({
        phi: {
          patientId: 'P12345',
          mrn: 'MRN123',
          condition: 'Cardiac Arrhythmia'
        }
      }),
      createDeal({
        phi: {
          patientId: 'P12346',
          mrn: 'MRN124',
          condition: 'Hypertension'
        }
      }),
      createDeal({
        phi: {
          patientId: 'P99999',
          mrn: 'MRN999',
          condition: 'Normal Checkup'
        }
      })
    ])

    // Test exact match search
    const exactResults = await prisma.$queryRaw`
      SELECT * FROM search_phi('P12345')
    `
    expect(exactResults).toHaveLength(1)
    expect(exactResults[0].deal_id).toBe(deals[0].id)

    // Test partial match search
    const partialResults = await prisma.$queryRaw`
      SELECT * FROM search_phi('Cardiac')
    `
    expect(partialResults).toHaveLength(1)
    expect(partialResults[0].deal_id).toBe(deals[0].id)

    // Test multiple results
    const multiResults = await prisma.$queryRaw`
      SELECT * FROM search_phi('MRN')
    `
    expect(multiResults.length).toBeGreaterThan(1)
  })

  it('handles encryption errors gracefully', async () => {
    // Test invalid PHI format
    await expect(
      createDeal({
        phi: 'invalid' as any
      })
    ).rejects.toThrow()

    // Test oversized PHI
    const largePhi = {
      data: Array(1000000).fill('x').join('')
    }
    await expect(
      createDeal({
        phi: largePhi
      })
    ).rejects.toThrow()

    // Test invalid key version
    await expect(
      prisma.$executeRaw`
        UPDATE "Deal"
        SET phi = jsonb_set(phi, '{key_version}', '999')
        WHERE id = ${dealId}::uuid
      `
    ).rejects.toThrow()
  })

  it('maintains search index after updates', async () => {
    // Create initial deal
    const deal = await createDeal({
      phi: {
        patientId: 'P12345',
        condition: 'Initial Condition'
      }
    })

    // Update PHI
    await prisma.deal.update({
      where: { id: deal.id },
      data: {
        phi: {
          patientId: 'P12345',
          condition: 'Updated Condition'
        }
      }
    })

    // Verify search still works
    const searchResults = await prisma.$queryRaw`
      SELECT * FROM search_phi('Updated Condition')
    `
    expect(searchResults).toHaveLength(1)
    expect(searchResults[0].deal_id).toBe(deal.id)

    // Original term should not return results
    const oldResults = await prisma.$queryRaw`
      SELECT * FROM search_phi('Initial Condition')
    `
    expect(oldResults).toHaveLength(0)
  })
}) 