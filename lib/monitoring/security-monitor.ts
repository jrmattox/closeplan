import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { createLogger } from '@/lib/logger'

const logger = createLogger('security-monitor')

interface SecurityMetrics {
  failedAccess: number
  phiAccesses: number
  keyRotations: number
  auditVolume: number
  timestamp: Date
}

export class SecurityMonitor {
  private metrics: SecurityMetrics = {
    failedAccess: 0,
    phiAccesses: 0,
    keyRotations: 0,
    auditVolume: 0,
    timestamp: new Date()
  }

  private static instance: SecurityMonitor
  
  private constructor() {
    this.setupMiddleware()
    this.startPeriodicCheck()
  }

  static getInstance(): SecurityMonitor {
    if (!SecurityMonitor.instance) {
      SecurityMonitor.instance = new SecurityMonitor()
    }
    return SecurityMonitor.instance
  }

  private setupMiddleware() {
    // Monitor tenant access
    prisma.$use(async (params, next) => {
      const startTime = Date.now()
      try {
        const result = await next(params)
        return result
      } catch (error) {
        if (error.message.includes('tenant') || error.code === 'P2025') {
          this.metrics.failedAccess++
          await this.logSecurityEvent('FAILED_TENANT_ACCESS', {
            model: params.model,
            action: params.action,
            error: error.message
          })
        }
        throw error
      }
    })

    // Monitor PHI access
    prisma.$use(async (params, next) => {
      if (params.model === 'Deal' && params.args?.select?.phi) {
        this.metrics.phiAccesses++
        await this.logSecurityEvent('PHI_ACCESS', {
          action: params.action,
          fields: params.args.select
        })
      }
      return next(params)
    })

    // Monitor audit volume
    prisma.$use(async (params, next) => {
      if (params.model === 'AuditLog' && params.action === 'create') {
        this.metrics.auditVolume++
      }
      return next(params)
    })
  }

  private async logSecurityEvent(
    type: string,
    details: Record<string, any>
  ) {
    try {
      await prisma.securityEvent.create({
        data: {
          type,
          details,
          timestamp: new Date(),
          tenantId: await this.getCurrentTenantId()
        }
      })
    } catch (error) {
      logger.error('Failed to log security event:', {
        type,
        details,
        error: error.message
      })
    }
  }

  private async getCurrentTenantId(): Promise<string | null> {
    try {
      const result = await prisma.$queryRaw`
        SELECT current_setting('app.current_tenant_id', true)
      `
      return result[0]?.current_setting || null
    } catch (error) {
      return null
    }
  }

  private startPeriodicCheck() {
    setInterval(async () => {
      await this.checkKeyRotation()
      await this.checkAuditVolume()
      await this.reportMetrics()
      this.resetMetrics()
    }, 3600000) // Every hour
  }

  private async checkKeyRotation() {
    try {
      const lastRotation = await prisma.encryptionKeys.findFirst({
        orderBy: { createdAt: 'desc' }
      })

      if (lastRotation) {
        const daysSinceRotation = Math.floor(
          (Date.now() - lastRotation.createdAt.getTime()) / (1000 * 60 * 60 * 24)
        )

        if (daysSinceRotation > 30) {
          await this.logSecurityEvent('KEY_ROTATION_NEEDED', {
            lastRotation: lastRotation.createdAt,
            daysSinceRotation
          })
        }
      }
    } catch (error) {
      logger.error('Failed to check key rotation:', error)
    }
  }

  private async checkAuditVolume() {
    try {
      const volumeStats = await prisma.$queryRaw`
        SELECT 
          count(*) as total,
          count(*) FILTER (WHERE timestamp > now() - interval '1 hour') as recent
        FROM "AuditLog"
      `

      if (volumeStats[0].recent > 10000) { // High volume threshold
        await this.logSecurityEvent('HIGH_AUDIT_VOLUME', {
          hourlyCount: volumeStats[0].recent,
          totalCount: volumeStats[0].total
        })
      }
    } catch (error) {
      logger.error('Failed to check audit volume:', error)
    }
  }

  private async reportMetrics() {
    try {
      await prisma.securityMetrics.create({
        data: {
          ...this.metrics,
          timestamp: new Date()
        }
      })

      logger.info('Security metrics:', {
        ...this.metrics,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      logger.error('Failed to report metrics:', error)
    }
  }

  private resetMetrics() {
    this.metrics = {
      failedAccess: 0,
      phiAccesses: 0,
      keyRotations: 0,
      auditVolume: 0,
      timestamp: new Date()
    }
  }

  // Public methods for manual checks
  async checkSecurityStatus(): Promise<SecurityMetrics> {
    await this.checkKeyRotation()
    await this.checkAuditVolume()
    return { ...this.metrics }
  }

  async getSecurityEvents(
    options: {
      type?: string
      startDate?: Date
      endDate?: Date
      limit?: number
    } = {}
  ) {
    return prisma.securityEvent.findMany({
      where: {
        type: options.type,
        timestamp: {
          gte: options.startDate,
          lte: options.endDate
        }
      },
      orderBy: { timestamp: 'desc' },
      take: options.limit || 100
    })
  }
} 