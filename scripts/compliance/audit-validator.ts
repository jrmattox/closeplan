import { prisma } from '@/lib/prisma'
import { createDebug } from '@/lib/utils/debug'

const debug = createDebug('compliance:audit')

interface AuditRequirement {
  resource: string
  actions: string[]
  required: boolean
}

const AUDIT_REQUIREMENTS: AuditRequirement[] = [
  {
    resource: 'PHI',
    actions: ['VIEW', 'MODIFY', 'DELETE'],
    required: true
  },
  {
    resource: 'USER',
    actions: ['CREATE', 'UPDATE', 'DELETE'],
    required: true
  },
  {
    resource: 'KEY',
    actions: ['ROTATE', 'REVOKE'],
    required: true
  }
]

export async function validateAuditCompleteness(
  startDate: Date,
  endDate: Date
): Promise<ValidationResult> {
  debug('Validating audit completeness from %s to %s', startDate, endDate)

  const violations: Violation[] = []

  for (const requirement of AUDIT_REQUIREMENTS) {
    // Get audit logs for this resource type
    const logs = await prisma.auditLog.groupBy({
      by: ['action'],
      where: {
        resourceType: requirement.resource,
        timestamp: {
          gte: startDate,
          lte: endDate
        }
      },
      _count: true
    })

    // Check for missing required actions
    const missingActions = requirement.actions.filter(
      action => !logs.find(log => log.action === action)
    )

    if (requirement.required && missingActions.length > 0) {
      violations.push({
        severity: 'error',
        message: `Missing required audit logs for ${requirement.resource}: ${missingActions.join(', ')}`,
        details: {
          resource: requirement.resource,
          missingActions
        }
      })
    }
  }

  return {
    passed: violations.length === 0,
    violations,
    timestamp: new Date()
  }
}
