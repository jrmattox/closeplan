# Security Development Guide

This guide provides practical implementation guidance for developers working with our HIPAA-compliant system. It builds upon the security architecture detailed in our [Security Architecture](../security/ARCHITECTURE.md).

## Tenant Context Handling

### Context Middleware

```typescript
import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'

export async function withTenantContext(
  req: NextApiRequest,
  res: NextApiResponse,
  next: () => Promise<void>
): Promise<void> {
  const tenantId = req.headers['x-tenant-id']
  
  try {
    // Validate tenant ID
    if (!tenantId || typeof tenantId !== 'string') {
      throw new Error('MISSING_TENANT_CONTEXT')
    }

    // Set database context
    await prisma.$executeRaw`SELECT set_tenant_context(${tenantId}::uuid)`

    // Add to request context
    req.tenantId = tenantId
    
    await next()
  } finally {
    // Always clear context
    await prisma.$executeRaw`SELECT set_tenant_context(NULL)`
  }
}
```

### Best Practices

1. **Always Use Middleware**
   ```typescript
   // ❌ Don't access data without context
   const deals = await prisma.deal.findMany()

   // ✅ Use context middleware
   export default withTenantContext(async (req, res) => {
     const deals = await prisma.deal.findMany()
     res.json(deals)
   })
   ```

2. **Context Verification**
   ```typescript
   function verifyTenantContext() {
     const currentTenant = getCurrentTenant()
     if (!currentTenant) {
       throw new Error('NO_TENANT_CONTEXT')
     }
     return currentTenant
   }
   ```

## PHI Data Access

### Access Control

```typescript
interface PhiAccessRequest {
  resourceId: string
  purpose: AccessPurpose
  fields?: string[]
}

export async function accessPhi(
  request: PhiAccessRequest
): Promise<PhiData> {
  // 1. Verify tenant context
  const tenantId = verifyTenantContext()

  // 2. Check authorization
  const authorized = await checkPhiAuthorization({
    userId: getCurrentUser().id,
    purpose: request.purpose,
    resourceId: request.resourceId
  })

  if (!authorized) {
    throw new Error('PHI_ACCESS_DENIED')
  }

  // 3. Access data with audit
  return await withAudit(
    () => getPhiData(request.resourceId, request.fields),
    {
      action: 'PHI_ACCESS',
      resourceId: request.resourceId,
      purpose: request.purpose
    }
  )
}
```

### Data Handling

```typescript
// ❌ Don't expose PHI directly
router.get('/api/patient/:id', async (req, res) => {
  const patient = await prisma.patient.findUnique({
    where: { id: req.params.id }
  })
  res.json(patient) // Exposes all PHI fields
})

// ✅ Use purpose-based access and field filtering
router.get('/api/patient/:id', async (req, res) => {
  const { purpose, fields } = req.query
  
  const patient = await accessPhi({
    resourceId: req.params.id,
    purpose,
    fields: fields?.split(',')
  })

  res.json(maskSensitiveData(patient))
})
```

## Audit Logging Integration

### Audit Decorator

```typescript
function withAudit<T>(
  operation: () => Promise<T>,
  context: AuditContext
): Promise<T> {
  const startTime = Date.now()
  
  return operation()
    .then(async (result) => {
      await recordAuditEvent({
        ...context,
        status: 'SUCCESS',
        duration: Date.now() - startTime
      })
      return result
    })
    .catch(async (error) => {
      await recordAuditEvent({
        ...context,
        status: 'ERROR',
        error: error.message,
        duration: Date.now() - startTime
      })
      throw error
    })
}
```

### Usage Examples

```typescript
// ❌ Don't modify data without audit
async function updatePatientRecord(id: string, data: any) {
  return await prisma.patient.update({
    where: { id },
    data
  })
}

// ✅ Use audit wrapper
async function updatePatientRecord(id: string, data: any) {
  return await withAudit(
    async () => {
      const oldData = await prisma.patient.findUnique({ where: { id } })
      const newData = await prisma.patient.update({
        where: { id },
        data
      })
      return { oldData, newData }
    },
    {
      action: 'UPDATE_PATIENT',
      resourceId: id,
      context: {
        userId: getCurrentUser().id,
        reason: 'MEDICAL_UPDATE'
      }
    }
  )
}
```

## Error Handling

### Security Error Types

```typescript
class SecurityError extends Error {
  constructor(
    public code: SecurityErrorCode,
    public details: Record<string, any> = {}
  ) {
    super(`Security Error: ${code}`)
    this.name = 'SecurityError'
  }
}

type SecurityErrorCode =
  | 'MISSING_TENANT_CONTEXT'
  | 'INVALID_TENANT'
  | 'PHI_ACCESS_DENIED'
  | 'AUDIT_FAILURE'
  | 'ENCRYPTION_ERROR'
```

### Error Handling Middleware

```typescript
export async function withSecurityErrorHandling(
  req: NextApiRequest,
  res: NextApiResponse,
  next: () => Promise<void>
): Promise<void> {
  try {
    await next()
  } catch (error) {
    if (error instanceof SecurityError) {
      // Log security error
      await logSecurityEvent({
        type: error.code,
        details: error.details,
        request: {
          path: req.url,
          method: req.method,
          headers: sanitizeHeaders(req.headers)
        }
      })

      // Return safe error response
      res.status(403).json({
        error: error.code,
        message: getPublicErrorMessage(error.code)
      })
    } else {
      // Handle other errors
      throw error
    }
  }
}
```

### Best Practices

1. **Always Use Security Errors**
   ```typescript
   // ❌ Don't throw generic errors
   if (!authorized) {
     throw new Error('Not authorized')
   }

   // ✅ Use security errors
   if (!authorized) {
     throw new SecurityError('PHI_ACCESS_DENIED', {
       resourceId,
       userId: getCurrentUser().id
     })
   }
   ```

2. **Error Recovery**
   ```typescript
   async function withErrorRecovery<T>(
     operation: () => Promise<T>,
     retries = 3
   ): Promise<T> {
     try {
       return await operation()
     } catch (error) {
       if (retries > 0 && isRecoverableError(error)) {
         await handleRecovery(error)
         return await withErrorRecovery(operation, retries - 1)
       }
       throw error
     }
   }
   ```

## Testing Security Features

```typescript
describe('Security Features', () => {
  it('enforces tenant isolation', async () => {
    const tenant1 = await createTestTenant()
    const tenant2 = await createTestTenant()
    
    // Create data in tenant1
    await withTenantContext(tenant1.id, async () => {
      await prisma.patient.create({ data: testPatient })
    })
    
    // Attempt access from tenant2
    await withTenantContext(tenant2.id, async () => {
      const result = await prisma.patient.findMany()
      expect(result).toHaveLength(0)
    })
  })

  it('logs PHI access', async () => {
    const startTime = new Date()
    
    await accessPhi({
      resourceId: 'test-id',
      purpose: 'TREATMENT'
    })
    
    const auditLog = await prisma.auditLog.findFirst({
      where: {
        action: 'PHI_ACCESS',
        timestamp: { gte: startTime }
      }
    })
    
    expect(auditLog).toBeTruthy()
  })
})
```

## Related Documentation
- [Security Architecture](../security/ARCHITECTURE.md)
- [PostgreSQL Security](../security/POSTGRESQL.md)
- [Key Management](../security/KEY_MANAGEMENT.md) 