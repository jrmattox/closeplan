# Audit System Documentation

This document details our comprehensive audit system for HIPAA compliance. It complements the audit logging structure defined in [PostgreSQL Security](./POSTGRESQL.md#audit-logging-structure).

## Audit Data Model

```typescript
interface AuditEvent {
  id: string
  tenantId: string
  timestamp: Date
  actor: {
    id: string
    role: string
    mfaVerified: boolean
    ipAddress: string
    userAgent: string
  }
  resource: {
    type: ResourceType
    id: string
    fields?: string[]
  }
  action: AuditAction
  context: {
    purpose?: string
    reason?: string
    sessionId: string
    correlationId: string
  }
  changes?: JsonDiff
  metadata: Record<string, any>
}

type ResourceType = 
  | 'PHI'
  | 'DEAL'
  | 'USER'
  | 'ENCRYPTION_KEY'
  | 'SYSTEM_CONFIG'

type AuditAction =
  | 'VIEW'
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'EXPORT'
  | 'SEARCH'
  | 'KEY_ROTATION'
  | 'ACCESS_DENIED'
```

## Collection Mechanisms

### 1. Middleware Collection

```typescript
export const auditMiddleware: MiddlewareFunction = async (
  req,
  res,
  next
) => {
  const startTime = Date.now()
  const correlationId = req.headers['x-correlation-id'] || uuid()

  // Capture request context
  const auditContext = {
    sessionId: req.session?.id,
    correlationId,
    userAgent: req.headers['user-agent'],
    ipAddress: req.ip,
    timestamp: new Date()
  }

  // Wrap response to capture changes
  const originalJson = res.json
  res.json = function(body) {
    recordAuditEvent({
      ...auditContext,
      response: body,
      duration: Date.now() - startTime
    })
    return originalJson.call(this, body)
  }

  return next()
}
```

### 2. Database Triggers
See [PostgreSQL Security](./POSTGRESQL.md#audit-triggers) for database-level audit collection.

### 3. Application Events

```typescript
class AuditCollector {
  private static instance: AuditCollector
  private buffer: AuditEvent[] = []
  private flushInterval = 1000 // 1 second

  private constructor() {
    this.startPeriodicFlush()
  }

  static getInstance(): AuditCollector {
    if (!this.instance) {
      this.instance = new AuditCollector()
    }
    return this.instance
  }

  async recordEvent(event: AuditEvent): Promise<void> {
    this.buffer.push(event)
    if (this.buffer.length >= 100) {
      await this.flush()
    }
  }

  private async flush(): Promise<void> {
    if (this.buffer.length === 0) return

    const events = [...this.buffer]
    this.buffer = []

    await prisma.$transaction(
      events.map(event =>
        prisma.auditLog.create({ data: event })
      )
    )
  }

  private startPeriodicFlush(): void {
    setInterval(() => this.flush(), this.flushInterval)
  }
}
```

## Retention Policies

```typescript
const RETENTION_POLICIES = {
  PHI_ACCESS: {
    duration: '6 years',      // HIPAA requirement
    storageType: 'ACTIVE',
    archiveAfter: '2 years'
  },
  SYSTEM_CHANGES: {
    duration: '2 years',
    storageType: 'ACTIVE',
    archiveAfter: '6 months'
  },
  SECURITY_EVENTS: {
    duration: '3 years',
    storageType: 'ACTIVE',
    archiveAfter: '1 year'
  }
}

interface RetentionJob {
  schedule: string        // cron expression
  policy: keyof typeof RETENTION_POLICIES
  action: 'ARCHIVE' | 'DELETE'
}

const retentionJobs: RetentionJob[] = [
  {
    schedule: '0 0 * * *',  // Daily
    policy: 'SYSTEM_CHANGES',
    action: 'ARCHIVE'
  },
  {
    schedule: '0 0 * * 0',  // Weekly
    policy: 'PHI_ACCESS',
    action: 'ARCHIVE'
  }
]
```

## Gap Detection

### 1. Real-time Monitoring

```typescript
interface AuditGap {
  startTime: Date
  endTime: Date
  missingEvents: number
  affectedResources: string[]
  severity: 'HIGH' | 'MEDIUM' | 'LOW'
}

class AuditGapDetector {
  private static readonly GAP_THRESHOLD = 5000 // 5 seconds

  async detectGaps(
    resourceId: string,
    timeWindow: { start: Date; end: Date }
  ): Promise<AuditGap[]> {
    const events = await prisma.auditLog.findMany({
      where: {
        resourceId,
        timestamp: {
          gte: timeWindow.start,
          lte: timeWindow.end
        }
      },
      orderBy: { timestamp: 'asc' }
    })

    const gaps: AuditGap[] = []
    for (let i = 1; i < events.length; i++) {
      const timeDiff = events[i].timestamp.getTime() - 
                      events[i-1].timestamp.getTime()
      
      if (timeDiff > this.GAP_THRESHOLD) {
        gaps.push({
          startTime: events[i-1].timestamp,
          endTime: events[i].timestamp,
          missingEvents: Math.floor(timeDiff / this.GAP_THRESHOLD),
          affectedResources: [resourceId],
          severity: this.calculateSeverity(timeDiff)
        })
      }
    }

    return gaps
  }

  private calculateSeverity(gapSize: number): AuditGap['severity'] {
    if (gapSize > 60000) return 'HIGH'        // 1 minute
    if (gapSize > 30000) return 'MEDIUM'      // 30 seconds
    return 'LOW'
  }
}
```

### 2. Periodic Verification

```typescript
async function verifyAuditCompleteness(): Promise<void> {
  const verification = await prisma.$transaction(async (tx) => {
    // Check sequence gaps
    const sequenceGaps = await tx.$queryRaw`
      SELECT * FROM audit_sequence_gaps()
    `

    // Check referential integrity
    const integrityIssues = await tx.$queryRaw`
      SELECT * FROM audit_integrity_check()
    `

    // Verify timestamps
    const timeSequenceIssues = await tx.$queryRaw`
      SELECT * FROM audit_time_sequence_check()
    `

    return {
      sequenceGaps,
      integrityIssues,
      timeSequenceIssues
    }
  })

  if (hasIssues(verification)) {
    await notifyAuditIssues(verification)
  }
}
```

## Report Generation

### 1. Standard Reports

```typescript
interface AuditReport {
  type: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CUSTOM'
  period: {
    start: Date
    end: Date
  }
  metrics: {
    totalEvents: number
    byResource: Record<ResourceType, number>
    byAction: Record<AuditAction, number>
    failedAccess: number
  }
  gaps: AuditGap[]
  anomalies: AuditAnomaly[]
}

async function generateAuditReport(
  type: AuditReport['type'],
  customPeriod?: { start: Date; end: Date }
): Promise<AuditReport> {
  const period = customPeriod || calculateReportPeriod(type)
  
  const [events, gaps, anomalies] = await Promise.all([
    getAuditEvents(period),
    detectAuditGaps(period),
    detectAnomalies(period)
  ])

  return {
    type,
    period,
    metrics: calculateMetrics(events),
    gaps,
    anomalies
  }
}
```

### 2. Custom Reports

```typescript
interface CustomReportConfig {
  resources?: ResourceType[]
  actions?: AuditAction[]
  users?: string[]
  includeGaps?: boolean
  includeAnomalies?: boolean
  format: 'JSON' | 'CSV' | 'PDF'
}

async function generateCustomReport(
  config: CustomReportConfig,
  period: { start: Date; end: Date }
): Promise<Buffer> {
  const data = await gatherReportData(config, period)
  return formatReport(data, config.format)
}
```

## Related Documentation
- [Security Architecture](./ARCHITECTURE.md)
- [PostgreSQL Security](./POSTGRESQL.md)
- [PHI Handling](./PHI_HANDLING.md) 