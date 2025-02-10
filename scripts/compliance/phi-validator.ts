import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import chalk from 'chalk'
import { createDebug } from '@/lib/utils/debug'

const debug = createDebug('compliance:phi')

interface PhiPattern {
  id: string
  pattern: RegExp
  severity: 'error' | 'warning'
  message: string
  allowedContexts?: string[]
}

const PHI_PATTERNS: PhiPattern[] = [
  {
    id: 'PHI001',
    pattern: /\.create\(\s*{[^}]*phi:/,
    severity: 'error',
    message: 'PHI must be encrypted before storage',
    allowedContexts: ['encryption.ts', 'test']
  },
  {
    id: 'PHI002',
    pattern: /console\.log.*phi/i,
    severity: 'error',
    message: 'PHI must not be logged directly'
  },
  {
    id: 'PHI003',
    pattern: /return.*phi.*}/,
    severity: 'error',
    message: 'PHI must be encrypted before transmission',
    allowedContexts: ['encryption.ts']
  }
]

export async function validatePhiHandling(
  files: string[] = getAllSourceFiles()
): Promise<ValidationResult> {
  debug('Validating PHI handling in %d files', files.length)

  const violations: Violation[] = []

  for (const file of files) {
    const content = readFileSync(file, 'utf8')
    const lines = content.split('\n')

    for (const pattern of PHI_PATTERNS) {
      lines.forEach((line, index) => {
        if (pattern.pattern.test(line)) {
          // Check if violation is in allowed context
          const isAllowed = pattern.allowedContexts?.some(
            context => file.includes(context)
          )

          if (!isAllowed) {
            violations.push({
              file,
              line: index + 1,
              pattern: pattern.id,
              severity: pattern.severity,
              message: pattern.message
            })
          }
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
