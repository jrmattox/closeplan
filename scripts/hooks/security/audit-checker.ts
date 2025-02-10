import { readFileSync } from 'fs'
import chalk from 'chalk'

interface AuditCheck {
  type: string
  pattern: RegExp
  required: boolean
}

const AUDIT_CHECKS: AuditCheck[] = [
  {
    type: 'PHI Access',
    pattern: /auditPhiAccess|logPhiAccess/,
    required: true
  },
  {
    type: 'User Actions',
    pattern: /auditUserAction|logUserActivity/,
    required: true
  },
  {
    type: 'Data Changes',
    pattern: /auditDataChange|logDataModification/,
    required: true
  }
]

export async function verifyAuditSetup(): Promise<void> {
  console.log(chalk.blue('Verifying audit logging...'))

  // Get all TypeScript files
  const files = execSync('git ls-files "*.ts"')
    .toString()
    .split('\n')
    .filter(Boolean)

  const auditCoverage = new Map<string, boolean>()

  for (const file of files) {
    const content = readFileSync(file, 'utf8')

    for (const check of AUDIT_CHECKS) {
      if (check.pattern.test(content)) {
        auditCoverage.set(check.type, true)
      }
    }
  }

  // Verify required audit types
  const missingAudits = AUDIT_CHECKS
    .filter(check => check.required && !auditCoverage.get(check.type))
    .map(check => check.type)

  if (missingAudits.length > 0) {
    throw new Error(
      `Missing required audit logging for: ${missingAudits.join(', ')}`
    )
  }

  console.log(chalk.green('✓ Audit logging verified'))
}
