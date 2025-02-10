import { prisma } from '@/lib/prisma'
import { format } from 'date-fns'
import { createObjectCsvWriter } from 'csv-writer'
import fs from 'fs/promises'

interface ComplianceMetrics {
  phiAccess: {
    total: number
    authorized: number
    unauthorized: number
    byPurpose: Record<string, number>
    byRole: Record<string, number>
  }
  encryption: {
    activeKeyAge: number
    lastRotation: Date
    encryptedDeals: number
    totalDeals: number
  }
  auditTrail: {
    totalLogs: number
    accessLogs: number
    modificationLogs: number
    errorLogs: number
    completeness: number
  }
  security: {
    mfaEnabled: number
    totalUsers: number
    failedAccess: number
    avgResponseTime: number
  }
}

export class ComplianceReporter {
  private reportPath: string
  private detailedPath: string
  private period: 'daily' | 'weekly' | 'monthly'

  constructor(period: 'daily' | 'weekly' | 'monthly' = 'daily') {
    this.period = period
    const timestamp = format(new Date(), 'yyyy-MM-dd')
    this.reportPath = `./reports/compliance/${period}_${timestamp}.md`
    this.detailedPath = `./reports/compliance/detailed_${period}_${timestamp}`
  }

  async generateReport(): Promise<void> {
    const metrics = await this.gatherMetrics()
    await this.generateSummaryReport(metrics)
    await this.generateDetailedReports(metrics)
  }

  private async gatherMetrics(): Promise<ComplianceMetrics> {
    const startDate = this.getStartDate()

    // PHI Access Metrics
    const phiAccess = await this.getPhiAccessMetrics(startDate)

    // Encryption Metrics
    const encryption = await this.getEncryptionMetrics()

    // Audit Trail Metrics
    const auditTrail = await this.getAuditMetrics(startDate)

    // Security Metrics
    const security = await this.getSecurityMetrics(startDate)

    return {
      phiAccess,
      encryption,
      auditTrail,
      security
    }
  }

  private async getPhiAccessMetrics(startDate: Date) {
    const accessLogs = await prisma.accessLog.findMany({
      where: {
        timestamp: { gte: startDate },
        resourceType: 'PHI'
      },
      include: {
        user: true
      }
    })

    const byPurpose: Record<string, number> = {}
    const byRole: Record<string, number> = {}

    accessLogs.forEach(log => {
      const purpose = log.metadata?.purpose || 'UNKNOWN'
      byPurpose[purpose] = (byPurpose[purpose] || 0) + 1
      
      const role = log.user?.role || 'UNKNOWN'
      byRole[role] = (byRole[role] || 0) + 1
    })

    return {
      total: accessLogs.length,
      authorized: accessLogs.filter(log => log.success).length,
      unauthorized: accessLogs.filter(log => !log.success).length,
      byPurpose,
      byRole
    }
  }

  private async getEncryptionMetrics() {
    const activeKey = await prisma.encryptionKeys.findFirst({
      where: { active: true },
      orderBy: { createdAt: 'desc' }
    })

    const [encryptedCount, totalCount] = await Promise.all([
      prisma.deal.count({
        where: { phi: { not: null } }
      }),
      prisma.deal.count()
    ])

    return {
      activeKeyAge: activeKey ? 
        Math.floor((Date.now() - activeKey.createdAt.getTime()) / (1000 * 60 * 60 * 24)) : 
        0,
      lastRotation: activeKey?.createdAt || new Date(0),
      encryptedDeals: encryptedCount,
      totalDeals: totalCount
    }
  }

  private async getAuditMetrics(startDate: Date) {
    const [accessLogs, modificationLogs, errorLogs, totalDeals] = await Promise.all([
      prisma.accessLog.count({
        where: { timestamp: { gte: startDate } }
      }),
      prisma.auditLog.count({
        where: {
          timestamp: { gte: startDate },
          action: { in: ['CREATE', 'UPDATE', 'DELETE'] }
        }
      }),
      prisma.auditLog.count({
        where: {
          timestamp: { gte: startDate },
          action: 'ERROR'
        }
      }),
      prisma.deal.count()
    ])

    const totalLogs = accessLogs + modificationLogs + errorLogs
    const expectedLogs = totalDeals * 2 // Assuming at least 2 logs per deal

    return {
      totalLogs,
      accessLogs,
      modificationLogs,
      errorLogs,
      completeness: Math.min((totalLogs / expectedLogs) * 100, 100)
    }
  }

  private async getSecurityMetrics(startDate: Date) {
    const [users, failedAccess, performanceMetrics] = await Promise.all([
      prisma.user.findMany(),
      prisma.securityEvent.count({
        where: {
          timestamp: { gte: startDate },
          type: 'FAILED_ACCESS'
        }
      }),
      prisma.performanceMetrics.findMany({
        where: {
          timestamp: { gte: startDate }
        }
      })
    ])

    const avgResponseTime = performanceMetrics.reduce(
      (acc, curr) => acc + curr.queryTime, 0
    ) / (performanceMetrics.length || 1)

    return {
      mfaEnabled: users.filter(u => u.mfaEnabled).length,
      totalUsers: users.length,
      failedAccess,
      avgResponseTime
    }
  }

  private async generateSummaryReport(metrics: ComplianceMetrics) {
    const summary = `
# Compliance Summary Report
Generated: ${new Date().toISOString()}
Period: ${this.period}

## PHI Access
- Total Accesses: ${metrics.phiAccess.total}
- Authorized: ${metrics.phiAccess.authorized} (${(metrics.phiAccess.authorized / metrics.phiAccess.total * 100).toFixed(1)}%)
- Unauthorized Attempts: ${metrics.phiAccess.unauthorized}

## Encryption Status
- Active Key Age: ${metrics.encryption.activeKeyAge} days
- Last Key Rotation: ${format(metrics.encryption.lastRotation, 'yyyy-MM-dd HH:mm:ss')}
- Encrypted Deals: ${metrics.encryption.encryptedDeals}/${metrics.encryption.totalDeals}

## Audit Trail
- Total Logs: ${metrics.auditTrail.totalLogs}
- Completeness: ${metrics.auditTrail.completeness.toFixed(1)}%
- Access Logs: ${metrics.auditTrail.accessLogs}
- Modification Logs: ${metrics.auditTrail.modificationLogs}
- Error Logs: ${metrics.auditTrail.errorLogs}

## Security Metrics
- MFA Adoption: ${(metrics.security.mfaEnabled / metrics.security.totalUsers * 100).toFixed(1)}%
- Failed Access Attempts: ${metrics.security.failedAccess}
- Avg Response Time: ${metrics.security.avgResponseTime.toFixed(2)}ms

## Compliance Status
${this.getComplianceStatus(metrics)}
`

    await fs.writeFile(this.reportPath, summary)
  }

  private async generateDetailedReports(metrics: ComplianceMetrics) {
    // PHI Access Details
    await this.writeDetailedCsv('phi_access.csv', 
      await prisma.accessLog.findMany({
        where: {
          timestamp: { gte: this.getStartDate() },
          resourceType: 'PHI'
        },
        include: {
          user: true
        }
      })
    )

    // Encryption Details
    await this.writeDetailedCsv('encryption.csv',
      await prisma.encryptionKeys.findMany({
        orderBy: { createdAt: 'desc' }
      })
    )

    // Audit Trail Details
    await this.writeDetailedCsv('audit_trail.csv',
      await prisma.auditLog.findMany({
        where: {
          timestamp: { gte: this.getStartDate() }
        },
        orderBy: { timestamp: 'desc' }
      })
    )

    // Security Events
    await this.writeDetailedCsv('security_events.csv',
      await prisma.securityEvent.findMany({
        where: {
          timestamp: { gte: this.getStartDate() }
        },
        orderBy: { timestamp: 'desc' }
      })
    )
  }

  private getComplianceStatus(metrics: ComplianceMetrics): string {
    const checks = [
      {
        name: 'PHI Access Control',
        passed: metrics.phiAccess.unauthorized / metrics.phiAccess.total < 0.01
      },
      {
        name: 'Encryption',
        passed: metrics.encryption.activeKeyAge < 90 && 
                metrics.encryption.encryptedDeals === metrics.encryption.totalDeals
      },
      {
        name: 'Audit Trail',
        passed: metrics.auditTrail.completeness > 95
      },
      {
        name: 'MFA Adoption',
        passed: metrics.security.mfaEnabled / metrics.security.totalUsers > 0.95
      }
    ]

    return checks.map(check => 
      `- ${check.name}: ${check.passed ? '✅ COMPLIANT' : '❌ NON-COMPLIANT'}`
    ).join('\n')
  }

  private async writeDetailedCsv(filename: string, data: any[]) {
    const csvWriter = createObjectCsvWriter({
      path: `${this.detailedPath}/${filename}`,
      header: Object.keys(data[0] || {}).map(id => ({ id, title: id }))
    })

    await csvWriter.writeRecords(data)
  }

  private getStartDate(): Date {
    const now = new Date()
    switch (this.period) {
      case 'daily':
        return new Date(now.setDate(now.getDate() - 1))
      case 'weekly':
        return new Date(now.setDate(now.getDate() - 7))
      case 'monthly':
        return new Date(now.setMonth(now.getMonth() - 1))
      default:
        return new Date(now.setDate(now.getDate() - 1))
    }
  }
} 