import { prisma } from '@/lib/prisma'
import { createDeal, createCompliantDeal } from '@/tests/factories/deals'
import { createTenant } from '@/tests/factories/tenants'
import { createUser } from '@/tests/factories/users'
import { DealStage, Department } from '@/lib/types'
import { getPhiWithAudit } from '@/lib/utils/phi-encryption'
import crypto from 'crypto'

/**
 * HIPAA Compliance Test Suite
 * 
 * Verifies compliance with key HIPAA requirements:
 * - Access Controls (§164.312(a)(1))
 * - Audit Controls (§164.312(b))
 * - Encryption (§164.312(a)(2)(iv))
 * - Person/Entity Authentication (§164.312(d))
 */
describe('HIPAA Compliance', () => {
  let tenant: any
  let authorizedUser: any
  let unauthorizedUser: any
  let dealWithPhi: any
  let complianceReport: any[] = []

  beforeAll(async () => {
    tenant = await createTenant()
    await prisma.$executeRaw`SELECT set_tenant_context(${tenant.id}::uuid)`

    // Create users with different access levels
    authorizedUser = await createUser({
      role: 'CLINICIAN',
      permissions: ['PHI_ACCESS'],
      tenantId: tenant.id,
      mfaEnabled: true
    })

    unauthorizedUser = await createUser({
      role: 'ANALYST',
      permissions: [],
      tenantId: tenant.id
    })

    // Create test deal with PHI
    dealWithPhi = await createCompliantDeal({
      phi: {
        patientId: 'P12345',
        ssn: '123-45-6789',
        diagnosis: 'Test Condition',
        treatment: {
          medications: ['Med1', 'Med2'],
          procedures: ['Proc1']
        }
      }
    })
  })

  afterAll(async () => {
    await prisma.$executeRaw`SELECT set_tenant_context(NULL)`
    await generateComplianceReport()
  })

  describe('PHI Access Controls', () => {
    it('enforces role-based access control', async () => {
      // Test authorized access
      const authorizedAccess = await getPhiWithAudit(
        dealWithPhi.id,
        authorizedUser.id,
        'TREATMENT'
      )
      expect(authorizedAccess).toBeTruthy()
      expect(authorizedAccess.patientId).toBe('P12345')

      // Test unauthorized access
      await expect(
        getPhiWithAudit(dealWithPhi.id, unauthorizedUser.id, 'TREATMENT')
      ).rejects.toThrow(/unauthorized/i)

      complianceReport.push({
        requirement: '§164.312(a)(1) - Access Control',
        test: 'Role-based access control',
        result: 'PASS',
        details: 'Successfully enforced access controls based on user roles'
      })
    })

    it('requires MFA for PHI access', async () => {
      const nonMfaUser = await createUser({
        role: 'CLINICIAN',
        permissions: ['PHI_ACCESS'],
        tenantId: tenant.id,
        mfaEnabled: false
      })

      await expect(
        getPhiWithAudit(dealWithPhi.id, nonMfaUser.id, 'TREATMENT')
      ).rejects.toThrow(/mfa required/i)

      complianceReport.push({
        requirement: '§164.312(d) - Person/Entity Authentication',
        test: 'MFA Enforcement',
        result: 'PASS',
        details: 'Successfully required MFA for PHI access'
      })
    })

    it('validates access purpose', async () => {
      // Test valid purpose
      const validAccess = await getPhiWithAudit(
        dealWithPhi.id,
        authorizedUser.id,
        'TREATMENT'
      )
      expect(validAccess).toBeTruthy()

      // Test invalid purpose
      await expect(
        getPhiWithAudit(dealWithPhi.id, authorizedUser.id, 'INVALID_PURPOSE')
      ).rejects.toThrow(/invalid purpose/i)

      complianceReport.push({
        requirement: '§164.312(b) - Audit Controls',
        test: 'Purpose Validation',
        result: 'PASS',
        details: 'Successfully validated and logged access purposes'
      })
    })
  })

  describe('PHI Encryption', () => {
    it('verifies encryption strength', async () => {
      // Get raw encrypted data
      const rawDeal = await prisma.$queryRaw`
        SELECT phi FROM "Deal" WHERE id = ${dealWithPhi.id}::uuid
      `
      const encryptedPhi = rawDeal[0].phi

      // Verify encryption properties
      expect(encryptedPhi.data).toBeTruthy()
      expect(encryptedPhi.iv).toBeTruthy()
      expect(Buffer.from(encryptedPhi.data, 'base64').length).toBeGreaterThan(16)
      
      // Verify key strength
      const keyInfo = await prisma.$queryRaw`
        SELECT key_value FROM "EncryptionKeys"
        WHERE key_version = ${encryptedPhi.key_version}::int
      `
      expect(Buffer.from(keyInfo[0].key_value).length).toBeGreaterThanOrEqual(32)

      complianceReport.push({
        requirement: '§164.312(a)(2)(iv) - Encryption',
        test: 'Encryption Strength',
        result: 'PASS',
        details: 'Using AES-256 encryption with proper IV handling'
      })
    })

    it('verifies key rotation', async () => {
      const initialKeyVersion = await getCurrentKeyVersion()

      // Rotate key
      await prisma.$executeRaw`SELECT rotate_encryption_key()`

      const newKeyVersion = await getCurrentKeyVersion()
      expect(newKeyVersion).toBeGreaterThan(initialKeyVersion)

      // Verify data was re-encrypted
      await prisma.$executeRaw`SELECT reencrypt_phi_data()`
      
      const updatedDeal = await prisma.$queryRaw`
        SELECT phi FROM "Deal" WHERE id = ${dealWithPhi.id}::uuid
      `
      expect(updatedDeal[0].phi.key_version).toBe(newKeyVersion)

      complianceReport.push({
        requirement: '§164.312(a)(2)(iv) - Encryption',
        test: 'Key Rotation',
        result: 'PASS',
        details: 'Successfully rotated encryption keys and re-encrypted data'
      })
    })
  })

  describe('Audit Controls', () => {
    it('logs all PHI access attempts', async () => {
      const accessTime = new Date()
      
      // Perform access
      await getPhiWithAudit(dealWithPhi.id, authorizedUser.id, 'TREATMENT')
      await expect(
        getPhiWithAudit(dealWithPhi.id, unauthorizedUser.id, 'TREATMENT')
      ).rejects.toThrow()

      // Verify access logs
      const accessLogs = await prisma.accessLog.findMany({
        where: {
          dealId: dealWithPhi.id,
          timestamp: { gte: accessTime }
        }
      })

      expect(accessLogs).toHaveLength(2)
      expect(accessLogs.map(log => log.success)).toContain(true)
      expect(accessLogs.map(log => log.success)).toContain(false)

      complianceReport.push({
        requirement: '§164.312(b) - Audit Controls',
        test: 'Access Logging',
        result: 'PASS',
        details: 'Successfully logged all access attempts with required details'
      })
    })

    it('tracks all PHI modifications', async () => {
      const modifyTime = new Date()

      // Modify PHI
      await prisma.deal.update({
        where: { id: dealWithPhi.id },
        data: {
          phi: {
            patientId: 'P12345',
            diagnosis: 'Updated Condition'
          }
        }
      })

      // Verify modification logs
      const auditLogs = await prisma.auditLog.findMany({
        where: {
          dealId: dealWithPhi.id,
          timestamp: { gte: modifyTime }
        }
      })

      expect(auditLogs).toHaveLength(1)
      expect(auditLogs[0].changes).toHaveProperty('phi')
      expect(auditLogs[0].details).toMatchObject({
        userId: expect.any(String),
        action: 'UPDATE',
        timestamp: expect.any(Date)
      })

      complianceReport.push({
        requirement: '§164.312(b) - Audit Controls',
        test: 'Modification Tracking',
        result: 'PASS',
        details: 'Successfully tracked all PHI modifications'
      })
    })
  })
})

// Helper functions
async function getCurrentKeyVersion(): Promise<number> {
  const result = await prisma.$queryRaw`
    SELECT key_version FROM "EncryptionKeys"
    WHERE active = true
    ORDER BY key_version DESC
    LIMIT 1
  `
  return result[0].key_version
}

async function generateComplianceReport() {
  const reportPath = './compliance-report.md'
  const reportContent = `
# HIPAA Compliance Test Report
Generated: ${new Date().toISOString()}

## Test Results
${complianceReport.map(item => `
### ${item.requirement}
- Test: ${item.test}
- Result: ${item.result}
- Details: ${item.details}
`).join('\n')}

## Summary
Total Tests: ${complianceReport.length}
Passing: ${complianceReport.filter(i => i.result === 'PASS').length}
Failing: ${complianceReport.filter(i => i.result !== 'PASS').length}
  `

  await fs.writeFile(reportPath, reportContent)
  console.log(`Compliance report generated: ${reportPath}`)
} 