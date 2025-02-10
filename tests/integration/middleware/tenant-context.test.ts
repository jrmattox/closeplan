import { createTestContext } from '@/tests/utils/test-context'
import { setupTestServer } from '@/tests/utils/test-server'
import { prisma } from '@/lib/prisma'
import request from 'supertest'

const app = setupTestServer()

describe('Tenant Context Middleware', () => {
  let context: any

  beforeEach(async () => {
    context = await createTestContext(['PHI_ACCESS'])
  })

  it('sets tenant context for authenticated requests', async () => {
    const response = await request(app)
      .get('/api/system/context')
      .set('Authorization', `Bearer ${context.token}`)
      .expect(200)

    expect(response.body.currentTenant).toBe(context.tenantId)
  })

  it('clears tenant context after request', async () => {
    await request(app)
      .get('/api/phi/records')
      .set('Authorization', `Bearer ${context.token}`)

    // Verify context is cleared
    const currentContext = await prisma.$queryRaw`
      SELECT current_setting('app.current_tenant_id', true) as tenant_id
    `
    expect(currentContext[0].tenant_id).toBeNull()
  })

  it('handles concurrent requests correctly', async () => {
    const tenant1Context = await createTestContext(['PHI_ACCESS'])
    const tenant2Context = await createTestContext(['PHI_ACCESS'])

    // Make concurrent requests from different tenants
    const requests = await Promise.all([
      request(app)
        .get('/api/system/context')
        .set('Authorization', `Bearer ${tenant1Context.token}`),
      request(app)
        .get('/api/system/context')
        .set('Authorization', `Bearer ${tenant2Context.token}`)
    ])

    expect(requests[0].body.currentTenant).toBe(tenant1Context.tenantId)
    expect(requests[1].body.currentTenant).toBe(tenant2Context.tenantId)
  })
})
