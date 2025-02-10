import { prisma } from '@/lib/prisma'
import { encrypt } from '@/lib/encryption'
import { v4 as uuidv4 } from 'uuid'

interface TestPhiData {
  id: string
  tenantId: string
  encryptedData: string
  metadata: Record<string, any>
}

export async function createTestPhiRecord(
  tenantId: string,
  data: Record<string, any> = {}
): Promise<TestPhiData> {
  const testData = {
    patientId: `TEST-${uuidv4()}`,
    mrn: `TEST-MRN-${Date.now()}`,
    ...data
  }

  const encryptedData = await encrypt(testData)

  const record = await prisma.phiRecord.create({
    data: {
      tenantId,
      phi: encryptedData,
      metadata: {
        environment: 'test',
        testData: true
      }
    }
  })

  return {
    id: record.id,
    tenantId,
    encryptedData,
    metadata: record.metadata
  }
}

export async function verifyPhiAccess(
  recordId: string,
  expectedActions: string[]
): Promise<void> {
  const auditLogs = await prisma.auditLog.findMany({
    where: {
      resourceId: recordId,
      action: { in: expectedActions }
    },
    orderBy: { timestamp: 'asc' }
  })

  expect(auditLogs).toHaveLength(expectedActions.length)

  auditLogs.forEach((log, index) => {
    expect(log.action).toBe(expectedActions[index])
  })
}
