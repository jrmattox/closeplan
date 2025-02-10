import { createTestContext } from '@/tests/utils/test-context'
import { setupTestServer } from '@/tests/utils/test-server'
import { createTestPhiRecord } from '@/tests/utils/phi-test-data'
import { prisma } from '@/lib/prisma'
import request from 'supertest'

const app = setupTestServer()

describe('API Security', () => {
  let context: any

  beforeEach(async () => {
    context = await createTestContext(['PHI_ACCESS'])
  })

  describe('Authentication & Authorization', () => {
    it('rejects requests without authentication', async () => {
      const response = await request(app)
        .get('/api/phi/records')
        .expect(401)

      expect(response.body.error).toMatch(/authentication required/i)
    })

    it('enforces permission requirements', async () => {
      const record = await createTestPhiRecord(context.tenantId)

      // Test with missing permission
      const restrictedContext = await createTestContext([])

      const response = await request(app)
        .get(`/api/phi/records/${record.id}`)
        .set('Authorization', `Bearer ${restrictedContext.token}`)
        .expect(403)

      expect(response.body.error).toMatch(/insufficient permissions/i)

      // Verify audit log
      const auditLog = await prisma.auditLog.findFirst({
        where: {
          resourceId: record.id,
          action: 'ACCESS_DENIED'
        }
      })
      expect(auditLog).toBeTruthy()
    })
  })

  describe('Tenant Isolation', () => {
    it('enforces tenant data isolation', async () => {
      // Create records in two different tenants
      const tenant1Record = await createTestPhiRecord(context.tenantId)
      const tenant2Context = await createTestContext(['PHI_ACCESS'])
      const tenant2Record = await createTestPhiRecord(tenant2Context.tenantId)

      // Attempt cross-tenant access
      const response = await request(app)
        .get(`/api/phi/records/${tenant2Record.id}`)
        .set('Authorization', `Bearer ${context.token}`)
        .expect(404)

      expect(response.body.error).toMatch(/not found/i)
    })
  })

  describe('Rate Limiting', () => {
    it('enforces rate limits', async () => {
      const requests = Array(10).fill(0).map(() =>
        request(app)
          .get('/api/phi/records')
          .set('Authorization', `Bearer ${context.token}`)
      )

      const responses = await Promise.all(requests)
      const tooManyRequests = responses.filter(r => r.status === 429)

      expect(tooManyRequests.length).toBeGreaterThan(0)
    })
  })
})
