import { createTestContext } from '@/tests/utils/test-context'
import { setupTestServer } from '@/tests/utils/test-server'
import { createTestPhiRecord } from '@/tests/utils/phi-test-data'
import { prisma } from '@/lib/prisma'
import request from 'supertest'

const app = setupTestServer()

describe('Error Handling', () => {
  let context: any

  beforeEach(async () => {
    context = await createTestContext(['PHI_ACCESS'])
  })

  it('handles validation errors appropriately', async () => {
    const response = await request(app)
      .post('/api/phi/records')
      .set('Authorization', `Bearer ${context.token}`)
      .send({
        // Missing required fields
      })
      .expect(400)

    expect(response.body.error).toMatch(/validation/i)
    expect(response.body.details).toBeTruthy()
  })

  it('handles database errors securely', async () => {
    // Force a unique constraint violation
    const record = await createTestPhiRecord(context.tenantId)

    const response = await request(app)
      .post('/api/phi/records')
      .set('Authorization', `Bearer ${context.token}`)
      .send({
        id: record.id, // Duplicate ID
        data: { test: 'data' }
      })
      .expect(409)

    expect(response.body.error).toMatch(/conflict/i)
    expect(response.body).not.toHaveProperty('stack')
    expect(response.body).not.toHaveProperty('query')
  })

  it('logs errors appropriately', async () => {
    const errorResponse = await request(app)
      .get('/api/phi/records/invalid-id')
      .set('Authorization', `Bearer ${context.token}`)
      .expect(400)

    // Verify error log
    const errorLog = await prisma.errorLog.findFirst({
      where: {
        path: '/api/phi/records/invalid-id',
        statusCode: 400
      },
      orderBy: { timestamp: 'desc' }
    })

    expect(errorLog).toBeTruthy()
    expect(errorLog.sensitive).toBeFalsy()
  })
})
