import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import chalk from 'chalk'

interface ComplianceRule {
  id: string
  pattern: RegExp
  severity: 'error' | 'warning'
  message: string
}

const COMPLIANCE_RULES: ComplianceRule[] = [
  {
    id: 'PHI-001',
    pattern: /encrypt\(.*\)/,
    severity: 'error',
    message: 'PHI must be encrypted'
  },
  {
    id: 'AUDIT-001',
    pattern: /auditLog|logAccess/,
    severity: 'error',
    message: 'Access must be audited'
  },
  {
    id: 'TENANT-001',
    pattern: /tenantId|getTenantContext/,
    severity: 'error',
    message: 'Tenant context required'
  }
]

async function checkCompliance(): Promise<void> {
  console.log(chalk.blue('Running compliance checks...'))

  const violations: Array<{
    file: string
    rule: ComplianceRule
    line: number
  }> = []

  // Check source files
  const sourceFiles = getAllSourceFiles('src')

  for (const file of sourceFiles) {
    const content = readFileSync(file, 'utf8')
    const lines = content.split('\n')

    for (const rule of COMPLIANCE_RULES) {
      lines.forEach((line, index) => {
        if (!rule.pattern.test(line)) {
          violations.push({
            file,
            rule,
            line: index + 1
          })
        }
      })
    }
  }

  // Report violations
  if (violations.length > 0) {
    console.error(chalk.red('Compliance violations found:'))

    violations.forEach(({ file, rule, line }) => {
      console.error(
        `${file}:${line} - ${rule.id}: ${rule.message}`
      )
    })

    process.exit(1)
  }

  console.log(chalk.green('✓ Compliance checks passed'))
}
