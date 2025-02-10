import { prisma } from '@/lib/prisma'
import { createLogger } from '@/lib/logger'
import { sendAlert } from '@/lib/notifications'
import { SecurityIncident, IncidentSeverity, IncidentStatus } from '@/lib/types'

const logger = createLogger('security-incident')

interface IncidentPattern {
  type: string
  threshold: number
  timeWindow: number // milliseconds
  severity: IncidentSeverity
}

export class SecurityIncidentHandler {
  private static instance: SecurityIncidentHandler
  private patterns: IncidentPattern[] = [
    {
      type: 'FAILED_ACCESS',
      threshold: 5,
      timeWindow: 5 * 60 * 1000, // 5 minutes
      severity: 'HIGH'
    },
    {
      type: 'ENCRYPTION_FAILURE',
      threshold: 3,
      timeWindow: 15 * 60 * 1000, // 15 minutes
      severity: 'CRITICAL'
    },
    {
      type: 'AUDIT_GAP',
      threshold: 10,
      timeWindow: 60 * 60 * 1000, // 1 hour
      severity: 'MEDIUM'
    },
    {
      type: 'TENANT_ISOLATION',
      threshold: 1, // Any isolation failure is critical
      timeWindow: 60 * 60 * 1000,
      severity: 'CRITICAL'
    }
  ]

  private constructor() {
    this.startMonitoring()
  }

  static getInstance(): SecurityIncidentHandler {
    if (!SecurityIncidentHandler.instance) {
      SecurityIncidentHandler.instance = new SecurityIncidentHandler()
    }
    return SecurityIncidentHandler.instance
  }

  async handleSecurityEvent(event: {
    type: string
    details: any
    tenantId: string
    userId?: string
  }): Promise<void> {
    try {
      // Log the event
      await this.logSecurityEvent(event)

      // Check for incident patterns
      const incidents = await this.detectIncidents(event)

      // Handle any detected incidents
      for (const incident of incidents) {
        await this.createIncident(incident)
      }
    } catch (error) {
      logger.error('Failed to handle security event:', {
        event,
        error: error.message
      })
      // Ensure critical events are not lost
      await this.logToFallbackSystem(event)
    }
  }

  private async detectIncidents(event: any): Promise<Partial<SecurityIncident>[]> {
    const incidents: Partial<SecurityIncident>[] = []
    const pattern = this.patterns.find(p => p.type === event.type)

    if (!pattern) return incidents

    // Check event frequency
    const recentEvents = await prisma.securityEvent.count({
      where: {
        type: event.type,
        timestamp: {
          gte: new Date(Date.now() - pattern.timeWindow)
        },
        tenantId: event.tenantId
      }
    })

    if (recentEvents >= pattern.threshold) {
      incidents.push({
        type: event.type,
        severity: pattern.severity,
        tenantId: event.tenantId,
        details: {
          eventCount: recentEvents,
          timeWindow: pattern.timeWindow,
          latestEvent: event.details
        }
      })
    }

    // Special handling for specific incident types
    switch (event.type) {
      case 'ENCRYPTION_FAILURE':
        await this.handleEncryptionFailure(event, incidents)
        break
      case 'AUDIT_GAP':
        await this.handleAuditGap(event, incidents)
        break
      case 'TENANT_ISOLATION':
        await this.handleIsolationFailure(event, incidents)
        break
    }

    return incidents
  }

  private async handleEncryptionFailure(event: any, incidents: Partial<SecurityIncident>[]) {
    // Check key status
    const activeKey = await prisma.encryptionKeys.findFirst({
      where: { active: true }
    })

    if (!activeKey || activeKey.createdAt < new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)) {
      incidents.push({
        type: 'KEY_ROTATION_REQUIRED',
        severity: 'HIGH',
        tenantId: event.tenantId,
        details: {
          keyAge: activeKey ? Math.floor((Date.now() - activeKey.createdAt.getTime()) / (24 * 60 * 60 * 1000)) : 'No active key',
          failureEvent: event.details
        }
      })
    }
  }

  private async handleAuditGap(event: any, incidents: Partial<SecurityIncident>[]) {
    // Analyze audit trail completeness
    const gapSize = event.details.gapDuration || 0
    if (gapSize > 30 * 60 * 1000) { // 30 minute gap
      incidents.push({
        type: 'SIGNIFICANT_AUDIT_GAP',
        severity: 'HIGH',
        tenantId: event.tenantId,
        details: {
          gapSize,
          affectedRecords: event.details.affectedRecords
        }
      })
    }
  }

  private async handleIsolationFailure(event: any, incidents: Partial<SecurityIncident>[]) {
    // Immediate lockdown for isolation failures
    await this.initiateIsolationResponse(event.tenantId)
    incidents.push({
      type: 'TENANT_ISOLATION_BREACH',
      severity: 'CRITICAL',
      tenantId: event.tenantId,
      details: {
        ...event.details,
        responseActions: ['TENANT_LOCKDOWN', 'ADMIN_NOTIFICATION']
      }
    })
  }

  private async createIncident(incident: Partial<SecurityIncident>): Promise<void> {
    const createdIncident = await prisma.securityIncident.create({
      data: {
        ...incident,
        status: 'OPEN',
        createdAt: new Date(),
        details: incident.details as any
      }
    })

    // Trigger incident response
    await this.triggerIncidentResponse(createdIncident)
  }

  private async triggerIncidentResponse(incident: SecurityIncident): Promise<void> {
    // Log incident
    logger.warn('Security incident detected:', {
      id: incident.id,
      type: incident.type,
      severity: incident.severity
    })

    // Send notifications based on severity
    if (incident.severity === 'CRITICAL') {
      await sendAlert('SECURITY_CRITICAL', {
        incident,
        recipients: ['security-team', 'operations']
      })
    }

    // Initiate automated response
    switch (incident.type) {
      case 'TENANT_ISOLATION_BREACH':
        await this.initiateIsolationResponse(incident.tenantId)
        break
      case 'ENCRYPTION_FAILURE':
        await this.initiateEncryptionResponse(incident)
        break
      case 'AUDIT_GAP':
        await this.initiateAuditRecovery(incident)
        break
    }
  }

  private async initiateIsolationResponse(tenantId: string): Promise<void> {
    try {
      // Immediate tenant lockdown
      await prisma.$transaction(async (tx) => {
        // Disable tenant access
        await tx.tenant.update({
          where: { id: tenantId },
          data: { status: 'LOCKED' }
        })

        // Log lockdown
        await tx.securityEvent.create({
          data: {
            type: 'TENANT_LOCKDOWN',
            tenantId,
            details: {
              reason: 'ISOLATION_BREACH',
              timestamp: new Date()
            }
          }
        })
      })

      // Notify security team
      await sendAlert('TENANT_LOCKDOWN', {
        tenantId,
        timestamp: new Date(),
        requiresAcknowledgment: true
      })
    } catch (error) {
      logger.error('Failed to initiate isolation response:', error)
      throw error
    }
  }

  private async initiateEncryptionResponse(incident: SecurityIncident): Promise<void> {
    try {
      // Attempt key rotation
      await prisma.$executeRaw`SELECT rotate_encryption_key()`

      // Verify encryption after rotation
      const verificationResults = await this.verifyEncryption(incident.tenantId)
      
      if (!verificationResults.success) {
        await sendAlert('ENCRYPTION_VERIFICATION_FAILED', {
          incident,
          details: verificationResults
        })
      }
    } catch (error) {
      logger.error('Failed to initiate encryption response:', error)
      throw error
    }
  }

  private async initiateAuditRecovery(incident: SecurityIncident): Promise<void> {
    try {
      const recoveryResult = await this.recoverAuditTrail(incident.details)
      
      await prisma.securityIncident.update({
        where: { id: incident.id },
        data: {
          resolution: {
            action: 'AUDIT_RECOVERY',
            result: recoveryResult
          }
        }
      })
    } catch (error) {
      logger.error('Failed to initiate audit recovery:', error)
      throw error
    }
  }

  private async verifyEncryption(tenantId: string) {
    // Implement encryption verification logic
    const results = {
      success: false,
      details: {}
    }

    try {
      const deals = await prisma.deal.findMany({
        where: {
          tenantId,
          phi: { not: null }
        },
        take: 10
      })

      results.success = deals.every(deal => 
        deal.phi && 
        typeof deal.phi === 'object' && 
        'data' in deal.phi &&
        'key_version' in deal.phi
      )

      results.details = {
        checkedRecords: deals.length,
        validRecords: deals.filter(d => d.phi && 'data' in d.phi).length
      }
    } catch (error) {
      results.details = { error: error.message }
    }

    return results
  }

  private async recoverAuditTrail(details: any) {
    // Implement audit trail recovery logic
    const recoveryResults = {
      recoveredEntries: 0,
      remainingGaps: []
    }

    try {
      const { startTime, endTime } = details.gapPeriod
      const affectedDeals = await prisma.deal.findMany({
        where: {
          updatedAt: {
            gte: new Date(startTime),
            lte: new Date(endTime)
          }
        },
        include: {
          auditLogs: true
        }
      })

      // Reconstruct missing audit entries
      for (const deal of affectedDeals) {
        const reconstructedLogs = await this.reconstructAuditLogs(deal, startTime, endTime)
        recoveryResults.recoveredEntries += reconstructedLogs.length
      }
    } catch (error) {
      logger.error('Audit recovery failed:', error)
    }

    return recoveryResults
  }

  private async reconstructAuditLogs(deal: any, startTime: number, endTime: number) {
    // Implement audit log reconstruction logic
    const reconstructedLogs = []
    // ... reconstruction logic ...
    return reconstructedLogs
  }

  private startMonitoring(): void {
    // Start periodic checks
    setInterval(() => this.checkSecurityMetrics(), 5 * 60 * 1000) // Every 5 minutes
  }

  private async checkSecurityMetrics(): Promise<void> {
    try {
      // Implement security metric checks
      const metrics = await this.gatherSecurityMetrics()
      await this.analyzeMetrics(metrics)
    } catch (error) {
      logger.error('Failed to check security metrics:', error)
    }
  }

  private async gatherSecurityMetrics() {
    // Implement metric gathering logic
    return {}
  }

  private async analyzeMetrics(metrics: any) {
    // Implement metric analysis logic
  }

  private async logToFallbackSystem(event: any): Promise<void> {
    // Implement fallback logging
    logger.error('Using fallback logging system:', event)
  }
} 