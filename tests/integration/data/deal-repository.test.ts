import { test, expect } from '@jest/globals'
import { DealRepository } from '@/lib/repositories/deal-repository'
import { createDeal, createCompliantDeal } from '@/tests/factories/deals'
import { prisma } from '@/lib/prisma'
import { Department, DealStage } from '@/lib/types'

describe('Deal Repository Integration', () => {
  let dealRepository: DealRepository

  beforeAll(async () => {
    dealRepository = new DealRepository(prisma)
  })

  beforeEach(async () => {
    await prisma.deal.deleteMany()
    await prisma.auditLog.deleteMany()
  })

  it('handles concurrent deal updates', async () => {
    // Create initial deal
    const deal = await dealRepository.create(createDeal({
      stage: DealStage.CLINICAL_VALIDATION,
      department: Department.CARDIOLOGY
    }))

    // Simulate concurrent updates
    const updates = [
      dealRepository.update(deal.id, { 
        clinicalValidation: { completed: true }
      }),
      dealRepository.update(deal.id, {
        complianceChecks: { hipaaCompliant: true }
      }),
      dealRepository.update(deal.id, {
        documents: ['updated-doc.pdf']
      })
    ]

    // Should handle concurrency without errors
    const results = await Promise.all(updates)
    
    // Verify final state
    const updatedDeal = await dealRepository.findById(deal.id)
    expect(updatedDeal.version).toBe(deal.version + updates.length)
    expect(updatedDeal.clinicalValidation.completed).toBe(true)
    expect(updatedDeal.complianceChecks.hipaaCompliant).toBe(true)
  })

  it('maintains audit trail', async () => {
    // Create deal with compliance requirements
    const deal = await dealRepository.create(createCompliantDeal({
      department: Department.CARDIOLOGY
    }))

    // Perform various updates
    await dealRepository.update(deal.id, {
      stage: DealStage.CLINICAL_VALIDATION,
      clinicalValidation: {
        completed: true,
        validatedBy: 'Dr. Smith'
      }
    })

    await dealRepository.update(deal.id, {
      complianceChecks: {
        hipaaCompliant: true,
        deviceCertification: true
      }
    })

    // Verify audit trail
    const auditLogs = await prisma.auditLog.findMany({
      where: { dealId: deal.id },
      orderBy: { timestamp: 'asc' }
    })

    expect(auditLogs).toHaveLength(3) // Create + 2 updates
    expect(auditLogs[0]).toMatchObject({
      action: 'CREATE',
      dealId: deal.id,
      department: Department.CARDIOLOGY
    })
    expect(auditLogs[1]).toMatchObject({
      action: 'UPDATE',
      field: 'clinicalValidation',
      oldValue: expect.any(String),
      newValue: expect.any(String)
    })
  })

  it('enforces data access controls', async () => {
    const deal = await dealRepository.create(createDeal({
      department: Department.CARDIOLOGY
    }))

    // Attempt unauthorized access
    await expect(
      dealRepository.findById(deal.id, { department: Department.ONCOLOGY })
    ).rejects.toThrow('Unauthorized')

    // Verify access logging
    const accessLogs = await prisma.accessLog.findMany({
      where: { dealId: deal.id }
    })
    expect(accessLogs).toHaveLength(2) // Create + failed access
    expect(accessLogs[1].success).toBe(false)
  })

  it('handles healthcare data encryption', async () => {
    const sensitiveData = {
      patientCount: 1000,
      clinicalDetails: 'Sensitive trial data',
      phi: 'Protected health information'
    }

    const deal = await dealRepository.create(createDeal({
      department: Department.ONCOLOGY,
      clinicalData: sensitiveData
    }))

    // Verify data is encrypted in database
    const rawDeal = await prisma.deal.findUnique({
      where: { id: deal.id }
    })
    expect(rawDeal.clinicalData).not.toEqual(sensitiveData)

    // Verify data is decrypted when retrieved
    const retrievedDeal = await dealRepository.findById(deal.id)
    expect(retrievedDeal.clinicalData).toEqual(sensitiveData)
  })

  it('maintains data versioning', async () => {
    const deal = await dealRepository.create(createDeal())
    const versions: any[] = []

    // Create multiple versions
    for (let i = 0; i < 3; i++) {
      const update = await dealRepository.update(deal.id, {
        stage: Object.values(DealStage)[i],
        lastActivity: new Date()
      })
      versions.push(update)
    }

    // Verify version history
    const history = await dealRepository.getVersionHistory(deal.id)
    expect(history).toHaveLength(4) // Initial + 3 updates
    
    // Check version metadata
    expect(history[0].version).toBe(1)
    expect(history[0].changes).toHaveLength(0)
    expect(history[1].changes).toContainEqual({
      field: 'stage',
      oldValue: DealStage.DISCOVERY,
      newValue: DealStage.CLINICAL_VALIDATION
    })
  })

  it('handles batch operations with transactions', async () => {
    const deals = await Promise.all([
      createDeal({ department: Department.CARDIOLOGY }),
      createDeal({ department: Department.ONCOLOGY }),
      createDeal({ department: Department.NEUROLOGY })
    ].map(deal => dealRepository.create(deal)))

    // Attempt batch update
    try {
      await dealRepository.batchUpdate(deals.map(deal => ({
        id: deal.id,
        stage: DealStage.CLINICAL_VALIDATION,
        clinicalValidation: { completed: true }
      })))
    } catch (error) {
      // Should rollback all changes on error
      const updatedDeals = await Promise.all(
        deals.map(deal => dealRepository.findById(deal.id))
      )
      expect(updatedDeals.every(d => d.stage === DealStage.DISCOVERY)).toBe(true)
    }
  })
}) 