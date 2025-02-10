import { prisma } from '@/lib/prisma'
import chalk from 'chalk'
import { format } from 'date-fns'

interface AuditQuery {
  action?: string
  resourceType?: string
  startDate?: Date
  endDate?: Date
  limit?: number
}

export async function viewAuditLogs(query: AuditQuery): Promise<void> {
  try {
    const logs = await prisma.auditLog.findMany({
      where: {
        action: query.action,
        resourceType: query.resourceType,
        timestamp: {
          gte: query.startDate,
          lte: query.endDate
        }
      },
      orderBy: { timestamp: 'desc' },
      take: query.limit || 50,
      include: {
        user: {
          select: {
            email: true,
            role: true
          }
        }
      }
    })

    console.log(chalk.blue(`Found ${logs.length} audit logs`))

    for (const log of logs) {
      console.log(chalk.white('----------------------------------------'))
      console.log(chalk.yellow('Timestamp:'),
        format(log.timestamp, 'yyyy-MM-dd HH:mm:ss'))
      console.log(chalk.yellow('Action:'), log.action)
      console.log(chalk.yellow('User:'), log.user.email)
      console.log(chalk.yellow('Resource:'),
        `${log.resourceType}:${log.resourceId}`)

      if (log.changes) {
        console.log(chalk.yellow('Changes:'),
          JSON.stringify(log.changes, null, 2))
      }
    }
  } catch (error) {
    console.error(chalk.red('Error viewing audit logs:'), error)
    process.exit(1)
  }
}
