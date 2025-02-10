import { loggers } from './config'
import { createDebug } from '@/lib/utils/debug'

const debug = createDebug('logging:security')

interface SecurityEvent {
  type: 'AUTH' | 'ACCESS' | 'ENCRYPTION' | 'AUDIT'
  action: string
  status: 'SUCCESS' | 'FAILURE' | 'ATTEMPT'
  userId?: string
  tenantId?: string
  resourceId?: string
  details?: Record<string, any>
}

export function logSecurityEvent(event: SecurityEvent): void {
  debug('Logging security event: %s %s', event.type, event.action)

  const { security: securityLogger } = loggers

  securityLogger.log({
    level: event.status === 'FAILURE' ? 'warn' : 'info',
    message: `${event.type}:${event.action}`,
    ...event,
    timestamp: new Date().toISOString()
  })
}

export function logPhiAccess(
  userId: string,
  resourceId: string,
  action: string,
  success: boolean
): void {
  const { phi: phiLogger } = loggers

  phiLogger.log({
    level: success ? 'info' : 'warn',
    message: `PHI ${action} ${success ? 'SUCCESS' : 'FAILURE'}`,
    userId,
    resourceId,
    action,
    success,
    timestamp: new Date().toISOString()
  })
}
