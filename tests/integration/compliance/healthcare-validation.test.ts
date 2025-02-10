import { test, expect } from '@jest/globals'
import { ComplianceService } from '@/lib/services/compliance'
import { DealRepository } from '@/lib/repositories/deal-repository'
import { createDeal, createCompliantDeal } from '@/tests/factories/deals'
import { prisma } from '@/lib/prisma'
import { Department, DealStage } from '@/lib/types'

describe('Healthcare Compliance Integration', () => {
  let complianceService: ComplianceService
  let dealRepository: DealRepository

  beforeAll(async () => {
    complianceService = new ComplianceService(prisma)
    dealRepository = new DealRepository(prisma)
  })

  beforeEach(async () => {
    await prisma.deal.deleteMany()
    await prisma.complianceLog.deleteMany()
    await prisma.phiAccess.deleteMany()
  })

  it('validates complete PHI handling workflow', async () => {
    const deal = await dealRepository.create(createDeal({
      department: Department.CARDIOLOGY,
      stage: DealStage.CLINICAL_VALIDATION
    }))

    // Add PHI data
    const phiData = {
      patientCount: 500,
      clinicalData: 'Patient treatment outcomes',
      demographics: 'Age and condition distribution'
    }

    // Test PHI access controls
    const accessRequest = await complianceService.requestPhiAccess({
      dealId: deal.id,
      userId: 'test-user',
      purpose: 'Clinical validation',
      dataFields: ['patientCount', 'clinicalData']
    })

    expect(accessRequest.status).toBe('approved')
    expect(accessRequest.expiresAt).toBeDefined()

    // Verify PHI encryption
    const updatedDeal = await dealRepository.update(deal.id, {
      phi: phiData
    })

    const rawDeal = await prisma.deal.findUnique({
      where: { id: deal.id }
    })
    expect(rawDeal.phi).not.toEqual(phiData)

    // Test PHI access logging
    const accessLogs = await prisma.phiAccess.findMany({
      where: { dealId: deal.id }
    })
    expect(accessLogs).toHaveLength(2) // Request + Update
    expect(accessLogs[0]).toMatchObject({
      action: 'REQUEST_ACCESS',
      status: 'approved'
    })
  })

  it('maintains compliance audit trail', async () => {
    const deal = await dealRepository.create(createCompliantDeal({
      department: Department.ONCOLOGY
    }))

    // Perform compliance checks
    const validations = [
      complianceService.validateHipaaCompliance(deal.id),
      complianceService.validateClinicalTrials(deal.id),
      complianceService.validateDataProtection(deal.id)
    ]

    await Promise.all(validations)

    // Verify compliance logs
    const complianceLogs = await prisma.complianceLog.findMany({
      where: { dealId: deal.id },
      orderBy: { timestamp: 'asc' }
    })

    expect(complianceLogs).toHaveLength(validations.length)
    expect(complianceLogs[0]).toMatchObject({
      type: 'HIPAA_VALIDATION',
      result: 'PASS'
    })

    // Check audit metadata
    const auditMeta = complianceLogs.map(log => log.metadata)
    expect(auditMeta).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          validator: expect.any(String),
          timestamp: expect.any(String),
          requirements: expect.any(Array)
        })
      ])
    )
  })

  it('enforces department-specific compliance rules', async () => {
    const departmentRules = {
      [Department.CARDIOLOGY]: ['FDA_APPROVAL', 'DEVICE_SAFETY'],
      [Department.ONCOLOGY]: ['CLINICAL_TRIALS', 'IRB_APPROVAL'],
      [Department.NEUROLOGY]: ['PATIENT_SAFETY', 'CLINICAL_VALIDATION']
    }

    for (const [department, rules] of Object.entries(departmentRules)) {
      const deal = await dealRepository.create(createDeal({
        department: department as Department
      }))

      // Validate department rules
      const validation = await complianceService.validateDepartmentCompliance(deal.id)
      
      expect(validation.requiredRules).toEqual(
        expect.arrayContaining(rules)
      )

      // Attempt to bypass rules
      await expect(
        dealRepository.update(deal.id, {
          stage: DealStage.CONTRACT_REVIEW,
          complianceChecks: { hipaaCompliant: true }
        })
      ).rejects.toThrow(/compliance requirements/i)

      // Complete department requirements
      await complianceService.completeDepartmentRequirements(deal.id, rules)
      
      // Should now allow progression
      const updatedDeal = await dealRepository.update(deal.id, {
        stage: DealStage.CONTRACT_REVIEW
      })
      expect(updatedDeal.stage).toBe(DealStage.CONTRACT_REVIEW)
    }
  })

  it('handles compliance validation failures', async () => {
    const deal = await dealRepository.create(createDeal({
      department: Department.CARDIOLOGY
    }))

    // Simulate validation failure
    jest.spyOn(complianceService, 'validateHipaaCompliance')
      .mockRejectedValueOnce(new Error('HIPAA validation failed'))

    // Attempt compliance check
    const validation = await complianceService.validateCompliance(deal.id)
      .catch(error => error)

    expect(validation).toBeInstanceOf(Error)

    // Verify failure logging
    const failureLogs = await prisma.complianceLog.findMany({
      where: { 
        dealId: deal.id,
        result: 'FAIL'
      }
    })
    expect(failureLogs).toHaveLength(1)
    expect(failureLogs[0].metadata).toMatchObject({
      error: 'HIPAA validation failed',
      attemptCount: 1
    })
  })

  it('tracks compliance status changes', async () => {
    const deal = await dealRepository.create(createCompliantDeal())

    // Track status changes
    const statusChanges = []
    for (const status of ['pending', 'in_review', 'approved']) {
      const update = await complianceService.updateComplianceStatus(deal.id, status)
      statusChanges.push(update)
    }

    // Verify status history
    const history = await complianceService.getComplianceHistory(deal.id)
    expect(history).toHaveLength(statusChanges.length)
    
    // Check transition timestamps
    const timestamps = history.map(h => h.timestamp)
    expect(timestamps).toEqual(
      expect.arrayContaining([expect.any(Date)])
    )

    // Verify status order
    expect(history.map(h => h.status)).toEqual([
      'pending',
      'in_review',
      'approved'
    ])
  })
}) 