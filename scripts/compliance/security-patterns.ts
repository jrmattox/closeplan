import { readFileSync } from 'fs'
import chalk from 'chalk'
import { createDebug } from '@/lib/utils/debug'

const debug = createDebug('compliance:security')

interface SecurityPattern {
  id: string
  type: 'required' | 'forbidden'
  pattern: RegExp
  message: string
  files?: string[]
}

const SECURITY_PATTERNS: SecurityPattern[] = [
  {
    id: 'SEC001',
    type: 'required',
    pattern: /withTenantContext/,
    message: 'Missing tenant context',
    files: ['api', 'handlers']
  },
  {
    id: 'SEC002',
    type: 'required',
    pattern: /auditLog|logAccess/,
    message: 'Missing audit logging',
    files: ['phi', 'sensitive']
  },
  {
    id: 'SEC003',
    type: 'forbidden',
    pattern: /Object\.assign.*phi/,
    message: 'Potential PHI exposure through object spread'
  },
  {
    id: 'SEC004',
    type: 'required',
    pattern: /validatePermissions|checkAccess/,
    message: 'Missing access control',
    files: ['api', 'handlers']
  }
]

export async function validateSecurityPatterns(
  files: string[]
): Promise<ValidationResult> {
  debug('Checking security patterns')

  const violations: Violation[] = []

  for (const file of files) {
    const content = readFileSync(file, 'utf8')

    for (const pattern of SECURITY_PATTERNS) {
      // Skip if pattern doesn't apply to this file type
      if (pattern.files && !pattern.files.some(f => file.includes(f))) {
        continue
      }

      const matches = pattern.type === 'required'
        ? !pattern.pattern.test(content)
        : pattern.pattern.test(content)

      if (matches) {
        violations.push({
          file,
          pattern: pattern.id,
          severity: 'error',
          message: pattern.message
        })
      }
    }
  }

  return {
    passed: violations.length === 0,
    violations,
    timestamp: new Date()
  }
}
