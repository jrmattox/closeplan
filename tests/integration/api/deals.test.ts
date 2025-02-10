import { createServer } from '@/server'
import { prisma } from '@/lib/prisma'
import request from 'supertest'
import { createDeal, createCompliantDeal } from '@/tests/factories/deals'
import { createTenant } from '@/tests/factories/tenants'
import { createUser } from '@/tests/factories/users'
import { DealStage, Department } from '@/lib/types'

describe('Deal API Endpoints', () => {
  const app = createServer()
  
  let tenant1: any
  let tenant2: any
  let authorizedUser: any
  let unauthorizedUser: any
  let dealWithPhi: any

  beforeAll(async () => {
    // Create test tenants
    tenant1 = await createTenant()
    tenant2 = await createTenant()

    // Create users with different permissions
    authorizedUser = await createUser({
      role: 'CLINICIAN',
      permissions: ['PHI_ACCESS'],
      tenantId: tenant1.id
    })

    unauthorizedUser = await createUser({
      role: 'ANALYST',
      permissions: [],
      tenantId: tenant1.id
    })

    // Create test deal with PHI
    await prisma.$executeRaw`SELECT set_tenant_context(${tenant1.id}::uuid)`
    dealWithPhi = await createCompliantDeal({
      stage: DealStage.CLINICAL_VALIDATION,
      department: Department.CARDIOLOGY,
      phi: {
        patientId: 'P12345',
        condition: 'Test Condition',
        clinicalData: {
          sensitive: true,
          details: 'Protected Information'
        }
      }
    })
  })

  afterAll(async () => {
    await prisma.$executeRaw`SELECT set_tenant_context(NULL)`
    await prisma.deal.deleteMany()
    await prisma.auditLog.deleteMany()
    await prisma.tenant.deleteMany()
  })

  describe('GET /api/deals/:id', () => {
    it('enforces tenant isolation', async () => {
      // Create deal in tenant2
      await prisma.$executeRaw`SELECT set_tenant_context(${tenant2.id}::uuid)`
      const tenant2Deal = await createDeal()

      // Attempt to access from tenant1
      const response = await request(app)
        .get(`/api/deals/${tenant2Deal.id}`)
        .set('Authorization', `Bearer ${authorizedUser.token}`)
        .set('X-Tenant-ID', tenant1.id)

      expect(response.status).toBe(404)

      // Verify audit log
      const auditLog = await prisma.auditLog.findFirst({
        where: {
          dealId: tenant2Deal.id,
          action: 'ACCESS_DENIED',
          tenantId: tenant1.id
        },
        orderBy: { timestamp: 'desc' }
      })

      expect(auditLog).toBeTruthy()
      expect(auditLog.details).toMatchObject({
        reason: 'TENANT_MISMATCH',
        requestedTenant: tenant1.id,
        actualTenant: tenant2.id
      })
    })

    it('handles PHI access control', async () => {
      // Authorized access
      const authorizedResponse = await request(app)
        .get(`/api/deals/${dealWithPhi.id}`)
        .set('Authorization', `Bearer ${authorizedUser.token}`)
        .set('X-Tenant-ID', tenant1.id)
        .set('X-Purpose', 'CLINICAL_REVIEW')

      expect(authorizedResponse.status).toBe(200)
      expect(authorizedResponse.body.phi).toBeTruthy()
      expect(authorizedResponse.body.phi.patientId).toBe('P12345')

      // Unauthorized access
      const unauthorizedResponse = await request(app)
        .get(`/api/deals/${dealWithPhi.id}`)
        .set('Authorization', `Bearer ${unauthorizedUser.token}`)
        .set('X-Tenant-ID', tenant1.id)

      expect(unauthorizedResponse.status).toBe(200)
      expect(unauthorizedResponse.body.phi).toBeUndefined()

      // Verify audit logs
      const accessLogs = await prisma.accessLog.findMany({
        where: {
          dealId: dealWithPhi.id,
          action: 'PHI_ACCESS'
        },
        orderBy: { timestamp: 'desc' }
      })

      expect(accessLogs).toHaveLength(2)
      expect(accessLogs[0]).toMatchObject({
        userId: unauthorizedUser.id,
        success: false
      })
      expect(accessLogs[1]).toMatchObject({
        userId: authorizedUser.id,
        success: true,
        metadata: {
          purpose: 'CLINICAL_REVIEW'
        }
      })
    })

    it('requires purpose for PHI access', async () => {
      const response = await request(app)
        .get(`/api/deals/${dealWithPhi.id}`)
        .set('Authorization', `Bearer ${authorizedUser.token}`)
        .set('X-Tenant-ID', tenant1.id)
        // No X-Purpose header

      expect(response.status).toBe(200)
      expect(response.body.phi).toBeUndefined()
      expect(response.body.error).toBe('Purpose required for PHI access')
    })
  })

  describe('POST /api/deals', () => {
    it('enforces PHI encryption', async () => {
      const response = await request(app)
        .post('/api/deals')
        .set('Authorization', `Bearer ${authorizedUser.token}`)
        .set('X-Tenant-ID', tenant1.id)
        .send({
          stage: DealStage.CLINICAL_VALIDATION,
          department: Department.CARDIOLOGY,
          phi: {
            patientId: 'P67890',
            condition: 'New Condition'
          }
        })

      expect(response.status).toBe(201)

      // Verify PHI is encrypted in database
      const deal = await prisma.deal.findUnique({
        where: { id: response.body.id }
      })

      expect(deal.phi).toHaveProperty('data')
      expect(deal.phi).toHaveProperty('iv')
      expect(deal.phi).toHaveProperty('key_version')
      expect(deal.phi).not.toHaveProperty('patientId')

      // Verify audit log
      const auditLog = await prisma.auditLog.findFirst({
        where: {
          dealId: response.body.id,
          action: 'CREATE'
        }
      })

      expect(auditLog).toBeTruthy()
      expect(auditLog.changes).toMatchObject({
        phi: 'SENSITIVE_DATA_MODIFIED'
      })
    })
  })

  describe('PUT /api/deals/:id', () => {
    it('tracks field-level changes', async () => {
      const response = await request(app)
        .put(`/api/deals/${dealWithPhi.id}`)
        .set('Authorization', `Bearer ${authorizedUser.token}`)
        .set('X-Tenant-ID', tenant1.id)
        .send({
          stage: DealStage.CONTRACT_REVIEW,
          clinicalData: {
            status: 'updated'
          }
        })

      expect(response.status).toBe(200)

      // Verify audit log captures specific changes
      const auditLog = await prisma.auditLog.findFirst({
        where: {
          dealId: dealWithPhi.id,
          action: 'UPDATE'
        },
        orderBy: { timestamp: 'desc' }
      })

      expect(auditLog.changes).toMatchObject({
        stage: {
          old: DealStage.CLINICAL_VALIDATION,
          new: DealStage.CONTRACT_REVIEW
        },
        clinicalData: {
          status: {
            old: null,
            new: 'updated'
          }
        }
      })
    })
  })

  describe('Error Handling', () => {
    it('handles invalid tenant context', async () => {
      const response = await request(app)
        .get(`/api/deals/${dealWithPhi.id}`)
        .set('Authorization', `Bearer ${authorizedUser.token}`)
        // Missing X-Tenant-ID header

      expect(response.status).toBe(400)
      expect(response.body.error).toBe('Tenant context required')
    })

    it('handles invalid deal access', async () => {
      const response = await request(app)
        .get('/api/deals/invalid-id')
        .set('Authorization', `Bearer ${authorizedUser.token}`)
        .set('X-Tenant-ID', tenant1.id)

      expect(response.status).toBe(404)
      
      // Verify error is logged
      const errorLog = await prisma.auditLog.findFirst({
        where: {
          action: 'ERROR',
          details: {
            path: ['type'],
            equals: 'DEAL_NOT_FOUND'
          }
        },
        orderBy: { timestamp: 'desc' }
      })

      expect(errorLog).toBeTruthy()
    })
  })
}) 