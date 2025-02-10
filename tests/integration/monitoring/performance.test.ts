import { createTestContext } from '@/tests/utils/test-context'
import { setupTestServer } from '@/tests/utils/test-server'
import { createTestPhiRecord } from '@/tests/utils/phi-test-data'
import { prisma } from '@/lib/prisma'
import request from 'supertest'

const app = setupTestServer()

describe('API Performance', () => {
  let context: any

  beforeEach(async () => {
    context = await createTestContext(['PHI_ACCESS'])
  })

  it('tracks response times', async () => {
    const response = await request(app)
      .get('/api/phi/records')
      .set('Authorization', `Bearer ${context.token}`)
      .expect(200)

    expect(response.header['x-response-time']).toBeTruthy()

    // Verify metrics
    const metrics = await prisma.performanceMetric.findFirst({
      where: {
        path: '/api/phi/records',
        method: 'GET'
      },
      orderBy: { timestamp: 'desc' }
    })

    expect(metrics).toBeTruthy()
    expect(metrics.duration).toBeLessThan(1000) // 1 second
  })

  it('monitors encryption performance', async () => {
    const startTime = Date.now()

    await request(app)
      .post('/api/phi/records')
      .set('Authorization', `Bearer ${context.token}`)
      .send({
        data: { test: 'performance' }
      })
      .expect(201)

    const metrics = await prisma.performanceMetric.findFirst({
      where: {
        operation: 'ENCRYPTION',
        timestamp: { gte: new Date(startTime) }
      }
    })

    expect(metrics).toBeTruthy()
    expect(metrics.duration).toBeLessThan(100) // 100ms
  })

  it('tracks concurrent request handling', async () => {
    const concurrentRequests = 5
    const startTime = Date.now()

    // Make concurrent requests
    await Promise.all(
      Array(concurrentRequests).fill(0).map(() =>
        request(app)
          .get('/api/phi/records')
          .set('Authorization', `Bearer ${context.token}`)
      )
    )

    const metrics = await prisma.performanceMetric.findMany({
      where: {
        path: '/api/phi/records',
        timestamp: { gte: new Date(startTime) }
      }
    })

    expect(metrics).toHaveLength(concurrentRequests)
    metrics.forEach(metric => {
      expect(metric.duration).toBeLessThan(2000) // 2 seconds
    })
  })
})
