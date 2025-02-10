import { prisma } from '@/lib/prisma'
import { createDebug } from '@/lib/utils/debug'

const debug = createDebug('audit:trace')

interface TraceOptions {
  resourceId?: string
  action?: string
  startTime?: Date
  endTime?: Date
}

async function traceLogs(options: TraceOptions): Promise<void> {
  debug('Starting audit log trace with options:', options)

  const logs = await prisma.auditLog.findMany({
    where: {
      resourceId: options.resourceId,
      action: options.action,
      timestamp: {
        gte: options.startTime,
        lte: options.endTime
      }
    },
    include: {
      user: {
        select: {
          email: true,
          role: true
        }
      }
    },
    orderBy: {
      timestamp: 'asc'
    }
  })

  debug('Found %d audit logs', logs.length)

  for (const log of logs) {
    debug(
      '%s: %s by %s (%s)',
      log.timestamp.toISOString(),
      log.action,
      log.user.email,
      log.user.role
    )

    if (log.changes) {
      debug('Changes:', log.changes)
    }

    debug('Context:', log.context)
    debug('---')
  }
}
