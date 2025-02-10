# Security Testing Procedures

This document outlines testing procedures for our HIPAA-compliant system, building upon existing security implementations documented in [Security Development Guide](../guides/SECURITY_DEVELOPMENT.md).

## Test Data Management

### PHI Test Data Generation

```typescript
// tests/factories/phi.ts
import { faker } from '@faker-js/faker'
import { encrypt } from '@/lib/encryption'
import { PhiData } from '@/lib/types'

export function createTestPhi(overrides?: Partial<PhiData>): PhiData {
  const phi: PhiData = {
    patientId: faker.string.uuid(),
    mrn: faker.string.alphanumeric(10).toUpperCase(),
    ssn: faker.string.numeric('###-##-####'),
    diagnosis: faker.helpers.arrayElement([
      'Hypertension',
      'Type 2 Diabetes',
      'Asthma'
    ]),
    treatment: {
      medications: [
        faker.helpers.arrayElement(['Lisinopril', 'Metformin', 'Albuterol'])
      ],
      procedures: []
    },
    ...overrides
  }

  return phi
}

export async function createEncryptedTestPhi(
  overrides?: Partial<PhiData>
): Promise<string> {
  const phi = createTestPhi(overrides)
  return await encrypt(phi)
}
```

### Test Data Cleanup

```typescript
// tests/utils/cleanup.ts
import { prisma } from '@/lib/prisma'

export async function cleanupTestData(): Promise<void> {
  // Use transaction to ensure atomic cleanup
  await prisma.$transaction([
    // Clear test data but preserve audit logs
    prisma.deal.deleteMany({
      where: {
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        testData: true
      }
    }),
    prisma.encryptionKeys.deleteMany({
      where: {
        purpose: 'TEST',
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }
    })
  ])
}
```

## Security Test Coverage

### Access Control Testing

```typescript
// tests/security/access-control.test.ts
import { createTestTenant, createTestUser } from '@/tests/factories'
import { accessPhi, checkAccess } from '@/lib/security'

describe('Access Control', () => {
  let tenant: any
  let authorizedUser: any
  let unauthorizedUser: any
  let phi: any

  beforeEach(async () => {
    tenant = await createTestTenant()
    authorizedUser = await createTestUser({
      tenantId: tenant.id,
      role: 'CLINICIAN',
      permissions: ['PHI_ACCESS']
    })
    unauthorizedUser = await createTestUser({
      tenantId: tenant.id,
      role: 'ANALYST'
    })
    phi = await createEncryptedTestPhi()
  })

  it('enforces role-based access', async () => {
    // Test authorized access
    const authorizedAccess = await checkAccess(authorizedUser.id, phi.id)
    expect(authorizedAccess).toBe(true)

    // Test unauthorized access
    const unauthorizedAccess = await checkAccess(unauthorizedUser.id, phi.id)
    expect(unauthorizedAccess).toBe(false)
  })

  it('enforces purpose-based access', async () => {
    const validPurpose = await accessPhi({
      userId: authorizedUser.id,
      resourceId: phi.id,
      purpose: 'TREATMENT'
    })
    expect(validPurpose).toBeTruthy()

    await expect(accessPhi({
      userId: authorizedUser.id,
      resourceId: phi.id,
      purpose: 'MARKETING'
    })).rejects.toThrow('INVALID_PURPOSE')
  })
})
```

### Encryption Testing

```typescript
// tests/security/encryption.test.ts
import { encrypt, decrypt, rotateKey } from '@/lib/encryption'

describe('Encryption', () => {
  it('maintains data confidentiality', async () => {
    const originalData = createTestPhi()
    const encrypted = await encrypt(originalData)
    
    // Verify encryption
    expect(encrypted).not.toContain(originalData.ssn)
    expect(encrypted).not.toContain(originalData.patientId)
    
    // Verify decryption
    const decrypted = await decrypt(encrypted)
    expect(decrypted).toEqual(originalData)
  })

  it('handles key rotation', async () => {
    const data = createTestPhi()
    const encrypted = await encrypt(data)
    
    // Rotate key
    await rotateKey()
    
    // Verify data still accessible
    const decrypted = await decrypt(encrypted)
    expect(decrypted).toEqual(data)
  })
})
```

## Performance Testing

### Load Testing Scenarios

```typescript
// tests/performance/load.test.ts
import { performance } from 'perf_hooks'
import { generateLoad } from '@/tests/utils/load-generator'

describe('Performance Under Load', () => {
  it('maintains RLS performance', async () => {
    const metrics = await generateLoad({
      duration: 60_000, // 1 minute
      concurrency: 50,
      operation: async () => {
        const start = performance.now()
        await prisma.deal.findMany()
        return performance.now() - start
      }
    })

    expect(metrics.p95).toBeLessThan(100) // 100ms
    expect(metrics.p99).toBeLessThan(200) // 200ms
  })

  it('handles concurrent PHI access', async () => {
    const results = await Promise.all(
      Array.from({ length: 10 }).map(() =>
        accessPhi({
          resourceId: 'test-id',
          purpose: 'TREATMENT'
        })
      )
    )

    expect(results).toHaveLength(10)
    results.forEach(result => expect(result).toBeTruthy())
  })
})
```

### Encryption Performance

```typescript
// tests/performance/encryption.test.ts
describe('Encryption Performance', () => {
  it('meets latency requirements', async () => {
    const sampleSize = 1000
    const timings: number[] = []

    for (let i = 0; i < sampleSize; i++) {
      const data = createTestPhi()
      const start = performance.now()
      await encrypt(data)
      timings.push(performance.now() - start)
    }

    const avgTime = timings.reduce((a, b) => a + b) / sampleSize
    expect(avgTime).toBeLessThan(10) // 10ms average
  })
})
```

## Compliance Validation

### HIPAA Requirements Testing

```typescript
// tests/compliance/hipaa.test.ts
describe('HIPAA Compliance', () => {
  it('maintains audit completeness', async () => {
    const startTime = new Date()
    const phi = await createEncryptedTestPhi()

    // Perform various operations
    await accessPhi({ resourceId: phi.id, purpose: 'TREATMENT' })
    await updatePhi(phi.id, { diagnosis: 'Updated' })
    await accessPhi({ resourceId: phi.id, purpose: 'PAYMENT' })

    // Verify audit trail
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        resourceId: phi.id,
        timestamp: { gte: startTime }
      }
    })

    expect(auditLogs).toHaveLength(3)
    expect(auditLogs.map(log => log.action)).toEqual([
      'PHI_ACCESS',
      'PHI_UPDATE',
      'PHI_ACCESS'
    ])
  })

  it('enforces access controls', async () => {
    const phi = await createEncryptedTestPhi()
    
    // Test various access patterns
    await expect(accessPhi({
      resourceId: phi.id,
      purpose: 'TREATMENT',
      userId: unauthorizedUser.id
    })).rejects.toThrow()

    await expect(accessPhi({
      resourceId: phi.id,
      purpose: 'MARKETING',
      userId: authorizedUser.id
    })).rejects.toThrow()
  })
})
```

## Integration Testing

### Cross-Component Testing

```typescript
// tests/integration/phi-workflow.test.ts
describe('PHI Workflow', () => {
  it('handles complete PHI lifecycle', async () => {
    // 1. Create PHI
    const phi = await createEncryptedTestPhi()
    
    // 2. Access PHI
    const accessed = await accessPhi({
      resourceId: phi.id,
      purpose: 'TREATMENT'
    })
    
    // 3. Update PHI
    const updated = await updatePhi(phi.id, {
      diagnosis: 'Updated Diagnosis'
    })
    
    // 4. Verify Audit Trail
    const auditLogs = await getAuditTrail(phi.id)
    expect(auditLogs).toHaveLength(3) // Create, Access, Update
    
    // 5. Verify Encryption
    expect(updated.encryptedData).not.toContain('Updated Diagnosis')
    
    // 6. Verify Access Control
    await expect(accessPhi({
      resourceId: phi.id,
      purpose: 'UNAUTHORIZED'
    })).rejects.toThrow()
  })
})
```

### System Recovery Testing

```typescript
// tests/integration/recovery.test.ts
describe('System Recovery', () => {
  it('recovers from encryption failures', async () => {
    // Simulate encryption failure
    jest.spyOn(encryption, 'encrypt').mockRejectedValueOnce(new Error())
    
    const phi = createTestPhi()
    const encrypted = await withErrorRecovery(() => encrypt(phi))
    
    expect(encrypted).toBeTruthy()
    const decrypted = await decrypt(encrypted)
    expect(decrypted).toEqual(phi)
  })

  it('maintains data integrity during failures', async () => {
    const phi = await createEncryptedTestPhi()
    
    // Simulate partial update failure
    jest.spyOn(prisma.deal, 'update').mockRejectedValueOnce(new Error())
    
    await expect(updatePhi(phi.id, {
      diagnosis: 'New Diagnosis'
    })).rejects.toThrow()
    
    // Verify original data intact
    const original = await accessPhi({ resourceId: phi.id })
    expect(original).toEqual(phi)
  })
})
```

## Related Documentation
- [Security Development Guide](../guides/SECURITY_DEVELOPMENT.md)
- [Operations Runbook](../runbooks/OPERATIONS.md)
- [Security Architecture](../security/ARCHITECTURE.md) 