import { createServer } from '@/server'
import { prisma } from '@/lib/prisma'
import request from 'supertest'
import { createDeal } from '@/tests/factories/deals'
import { createTenant } from '@/tests/factories/tenants'
import { createUser } from '@/tests/factories/users'
import { DealStage } from '@/lib/types'
import { setTimeout } from 'timers/promises'

describe('Security Middleware', () => {
  const app = createServer()
  let tenant: any
  let user: any
  let deal: any

  beforeAll(async () => {
    tenant = await createTenant()
    user = await createUser({
      role: 'CLINICIAN',
      permissions: ['PHI_ACCESS'],
      tenantId: tenant.id
    })

    await prisma.$executeRaw`SELECT set_tenant_context(${tenant.id}::uuid)`
    deal = await createDeal()
  })

  afterAll(async () => {
    await prisma.$executeRaw`SELECT set_tenant_context(NULL)`
    await prisma.deal.deleteMany()
    await prisma.tenant.deleteMany()
  })

  describe('Tenant Context Middleware', () => {
    it('propagates tenant context through request chain', async () => {
      const responses = await Promise.all([
        request(app)
          .get(`/api/deals/${deal.id}`)
          .set('Authorization', `Bearer ${user.token}`)
          .set('X-Tenant-ID', tenant.id),
        request(app)
          .get('/api/deals/search')
          .set('Authorization', `Bearer ${user.token}`)
          .set('X-Tenant-ID', tenant.id)
      ])

      responses.forEach(response => {
        expect(response.status).toBe(200)
        expect(response.headers['x-tenant-context']).toBe(tenant.id)
      })

      // Verify context was consistent
      const contextLogs = await prisma.auditLog.findMany({
        where: {
          timestamp: {
            gte: new Date(Date.now() - 1000) // Last second
          }
        }
      })

      contextLogs.forEach(log => {
        expect(log.tenantId).toBe(tenant.id)
      })
    })

    it('cleans up tenant context after request', async () => {
      // Make request with tenant context
      await request(app)
        .get(`/api/deals/${deal.id}`)
        .set('Authorization', `Bearer ${user.token}`)
        .set('X-Tenant-ID', tenant.id)

      // Verify context is cleared
      const result = await prisma.$queryRaw`
        SELECT current_setting('app.current_tenant_id', true) as tenant_id
      `
      expect(result[0].tenant_id).toBeNull()
    })

    it('handles concurrent requests with different tenants', async () => {
      const tenant2 = await createTenant()
      const user2 = await createUser({ tenantId: tenant2.id })

      // Make concurrent requests
      const responses = await Promise.all(
        Array(5).fill(0).map((_, i) => 
          request(app)
            .get(`/api/deals/${deal.id}`)
            .set('Authorization', `Bearer ${i % 2 ? user.token : user2.token}`)
            .set('X-Tenant-ID', i % 2 ? tenant.id : tenant2.id)
        )
      )

      // Verify each request maintained correct context
      const contextLogs = await prisma.auditLog.findMany({
        where: {
          timestamp: {
            gte: new Date(Date.now() - 1000)
          }
        },
        orderBy: { timestamp: 'asc' }
      })

      responses.forEach((response, i) => {
        expect(contextLogs[i].tenantId).toBe(i % 2 ? tenant.id : tenant2.id)
      })
    })
  })

  describe('PHI Access Middleware', () => {
    it('enforces access timeouts', async () => {
      // Set short timeout for PHI access
      process.env.PHI_ACCESS_TIMEOUT = '1000' // 1 second

      // First access should work
      const response1 = await request(app)
        .get(`/api/deals/${deal.id}`)
        .set('Authorization', `Bearer ${user.token}`)
        .set('X-Tenant-ID', tenant.id)
        .set('X-Purpose', 'TEST')

      expect(response1.status).toBe(200)

      // Wait for timeout
      await setTimeout(1100)

      // Second access should require new purpose
      const response2 = await request(app)
        .get(`/api/deals/${deal.id}`)
        .set('Authorization', `Bearer ${user.token}`)
        .set('X-Tenant-ID', tenant.id)

      expect(response2.status).toBe(200)
      expect(response2.body.error).toBe('PHI access timeout - new purpose required')
    })

    it('tracks concurrent PHI access', async () => {
      const phiRequests = Array(10).fill(0).map((_, i) => 
        request(app)
          .get(`/api/deals/${deal.id}`)
          .set('Authorization', `Bearer ${user.token}`)
          .set('X-Tenant-ID', tenant.id)
          .set('X-Purpose', `CONCURRENT_TEST_${i}`)
      )

      const responses = await Promise.all(phiRequests)

      // Verify access tracking
      const accessLogs = await prisma.accessLog.findMany({
        where: {
          userId: user.id,
          timestamp: {
            gte: new Date(Date.now() - 1000)
          }
        }
      })

      expect(accessLogs.length).toBe(10)
      expect(new Set(accessLogs.map(log => log.metadata.purpose)).size).toBe(10)
    })
  })

  describe('Rate Limiting', () => {
    it('enforces rate limits per tenant', async () => {
      // Configure rate limit
      const RATE_LIMIT = 5
      const WINDOW_MS = 1000

      // Make requests up to limit
      const responses = []
      for (let i = 0; i < RATE_LIMIT + 2; i++) {
        const response = await request(app)
          .get(`/api/deals/${deal.id}`)
          .set('Authorization', `Bearer ${user.token}`)
          .set('X-Tenant-ID', tenant.id)
        responses.push(response)
      }

      // Verify rate limiting
      expect(responses.slice(0, RATE_LIMIT).every(r => r.status === 200)).toBe(true)
      expect(responses.slice(RATE_LIMIT).every(r => r.status === 429)).toBe(true)

      // Wait for window to reset
      await setTimeout(WINDOW_MS)

      // Should work again
      const resetResponse = await request(app)
        .get(`/api/deals/${deal.id}`)
        .set('Authorization', `Bearer ${user.token}`)
        .set('X-Tenant-ID', tenant.id)

      expect(resetResponse.status).toBe(200)
    })
  })

  describe('Error Recovery', () => {
    it('maintains security context on error', async () => {
      // Trigger an error
      const response = await request(app)
        .post('/api/deals')
        .set('Authorization', `Bearer ${user.token}`)
        .set('X-Tenant-ID', tenant.id)
        .send({ invalid: 'data' })

      expect(response.status).toBe(400)

      // Verify error was logged with correct context
      const errorLog = await prisma.auditLog.findFirst({
        where: {
          action: 'ERROR',
          tenantId: tenant.id
        },
        orderBy: { timestamp: 'desc' }
      })

      expect(errorLog).toBeTruthy()
      expect(errorLog.details).toMatchObject({
        tenantId: tenant.id,
        userId: user.id
      })

      // Verify next request works
      const nextResponse = await request(app)
        .get(`/api/deals/${deal.id}`)
        .set('Authorization', `Bearer ${user.token}`)
        .set('X-Tenant-ID', tenant.id)

      expect(nextResponse.status).toBe(200)
    })

    it('handles middleware timeout recovery', async () => {
      // Configure short timeout
      const originalTimeout = process.env.REQUEST_TIMEOUT
      process.env.REQUEST_TIMEOUT = '100' // 100ms

      // Make slow request
      const slowResponse = await request(app)
        .get('/api/deals/search')
        .set('Authorization', `Bearer ${user.token}`)
        .set('X-Tenant-ID', tenant.id)
        .query({ complexQuery: 'true' }) // Triggers slow path

      expect(slowResponse.status).toBe(504)

      // Verify timeout was logged
      const timeoutLog = await prisma.auditLog.findFirst({
        where: {
          action: 'TIMEOUT',
          tenantId: tenant.id
        },
        orderBy: { timestamp: 'desc' }
      })

      expect(timeoutLog).toBeTruthy()

      // Reset timeout
      process.env.REQUEST_TIMEOUT = originalTimeout

      // Verify system recovered
      const nextResponse = await request(app)
        .get(`/api/deals/${deal.id}`)
        .set('Authorization', `Bearer ${user.token}`)
        .set('X-Tenant-ID', tenant.id)

      expect(nextResponse.status).toBe(200)
    })
  })
}) 