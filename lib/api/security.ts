import { SecurityMonitor } from '@/lib/monitoring/security-monitor'
import { SecurityIncidentHandler } from '@/lib/security/incident-handler'

export async function getSecurityStatus() {
  const monitor = SecurityMonitor.getInstance()
  const status = await monitor.checkSecurityStatus()
  
  const recentEvents = await monitor.getSecurityEvents({
    startDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
    limit: 10
  })

  return {
    metrics: status,
    recentEvents
  }
}

export async function reportSecurityEvent(event: {
  type: string
  details: any
  tenantId: string
  userId?: string
}) {
  const handler = SecurityIncidentHandler.getInstance()
  await handler.handleSecurityEvent(event)
}

// Example middleware usage
export const securityMonitoring = async (req: any, res: any, next: any) => {
  try {
    await next()
  } catch (error) {
    if (isSecurityRelated(error)) {
      await reportSecurityEvent({
        type: getSecurityEventType(error),
        details: {
          error: error.message,
          stack: error.stack,
          request: {
            path: req.path,
            method: req.method,
            headers: sanitizeHeaders(req.headers)
          }
        },
        tenantId: req.tenantId,
        userId: req.user?.id
      })
    }
    throw error
  }
} 