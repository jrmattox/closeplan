import { prisma } from '@/lib/prisma'
import chalk from 'chalk'
import { subDays } from 'date-fns'

interface MetricsQuery {
  days?: number
  tenant?: string
}

export async function viewSecurityMetrics(
  query: MetricsQuery = {}
): Promise<void> {
  try {
    const startDate = subDays(new Date(), query.days || 7)

    // Collect metrics
    const metrics = await Promise.all([
      getAccessMetrics(startDate, query.tenant),
      getEncryptionMetrics(startDate),
      getAuditMetrics(startDate, query.tenant),
      getErrorMetrics(startDate)
    ])

    // Display metrics
    console.log(chalk.blue('\nAccess Metrics:'))
    displayMetrics(metrics[0])

    console.log(chalk.blue('\nEncryption Metrics:'))
    displayMetrics(metrics[1])

    console.log(chalk.blue('\nAudit Metrics:'))
    displayMetrics(metrics[2])

    console.log(chalk.blue('\nError Metrics:'))
    displayMetrics(metrics[3])

  } catch (error) {
    console.error(chalk.red('Error collecting metrics:'), error)
    process.exit(1)
  }
}

async function getAccessMetrics(startDate: Date, tenant?: string) {
  const where = {
    timestamp: { gte: startDate },
    ...(tenant && { tenantId: tenant })
  }

  return {
    totalAccesses: await prisma.auditLog.count({
      where: { ...where, action: 'ACCESS' }
    }),
    failedAttempts: await prisma.auditLog.count({
      where: { ...where, action: 'ACCESS_DENIED' }
    }),
    uniqueUsers: await prisma.auditLog.groupBy({
      by: ['userId'],
      where,
      _count: true
    }).then(groups => groups.length)
  }
}

async function getEncryptionMetrics(startDate: Date) {
  return {
    activeKeys: await prisma.encryptionKeys.count({
      where: { active: true }
    }),
    keyRotations: await prisma.auditLog.count({
      where: {
        timestamp: { gte: startDate },
        action: 'KEY_ROTATION'
      }
    }),
    encryptionErrors: await prisma.auditLog.count({
      where: {
        timestamp: { gte: startDate },
        action: 'ENCRYPTION_ERROR'
      }
    })
  }
}

function displayMetrics(metrics: Record<string, number>): void {
  Object.entries(metrics).forEach(([key, value]) => {
    const formattedKey = key
      .replace(/([A-Z])/g, ' $1')
      .toLowerCase()
      .replace(/^\w/, c => c.toUpperCase())

    console.log(chalk.yellow(formattedKey + ':'), value)
  })
}
