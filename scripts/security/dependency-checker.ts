import { exec } from 'child_process'
import { promisify } from 'util'
import { readFileSync } from 'fs'
import chalk from 'chalk'
import { createDebug } from '@/lib/utils/debug'
import { securityScanConfig } from './scan-config'

const execAsync = promisify(exec)
const debug = createDebug('security:deps')

interface DependencyAudit {
  dependencies: {
    name: string
    version: string
    vulnerabilities: {
      severity: string
      count: number
    }[]
    license: string
  }[]
  summary: {
    vulnerabilities: Record<string, number>
    licensesViolated: string[]
    blockedPackages: string[]
  }
}

export async function auditDependencies(): Promise<DependencyAudit> {
  debug('Auditing dependencies')

  // Run npm audit
  const { stdout: auditOutput } = await execAsync('npm audit --json')
  const auditData = JSON.parse(auditOutput)

  // Read package.json
  const packageJson = JSON.parse(
    readFileSync('package.json', 'utf8')
  )

  const dependencies = Object.entries({
    ...packageJson.dependencies,
    ...packageJson.devDependencies
  }).map(([name, version]) => ({
    name,
    version: version as string,
    vulnerabilities: auditData.advisories?.[name] || [],
    license: await getPackageLicense(name)
  }))

  // Check for violations
  const summary = {
    vulnerabilities: countVulnerabilities(dependencies),
    licensesViolated: findLicenseViolations(dependencies),
    blockedPackages: findBlockedPackages(dependencies)
  }

  return { dependencies, summary }
}

export function formatAuditResults(audit: DependencyAudit): string {
  let output = chalk.bold('\nDependency Audit Results:\n')

  // Vulnerabilities
  Object.entries(audit.summary.vulnerabilities).forEach(([severity, count]) => {
    if (count > 0) {
      const color = severity === 'critical' ? 'red'
        : severity === 'high' ? 'yellow'
        : 'blue'
      output += chalk[color](`${severity}: ${count}\n`)
    }
  })

  // License violations
  if (audit.summary.licensesViolated.length > 0) {
    output += chalk.red('\nLicense Violations:\n')
    audit.summary.licensesViolated.forEach(pkg => {
      output += `  - ${pkg}\n`
    })
  }

  // Blocked packages
  if (audit.summary.blockedPackages.length > 0) {
    output += chalk.red('\nBlocked Packages:\n')
    audit.summary.blockedPackages.forEach(pkg => {
      output += `  - ${pkg}\n`
    })
  }

  return output
}
