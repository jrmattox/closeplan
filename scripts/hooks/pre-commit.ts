import { execSync } from 'child_process'
import { readFileSync } from 'fs'
import chalk from 'chalk'
import { checkForPhi } from './security/phi-scanner'
import { validateConfigs } from './security/config-validator'
import { verifyAuditSetup } from './security/audit-checker'
import { runSecurityTests } from './security/test-runner'

interface PreCommitConfig {
  bypassToken?: string
  excludePaths: string[]
  requireAudit: boolean
  minTestCoverage: number
}

async function preCommit(): Promise<void> {
  try {
    // Load configuration
    const config = loadConfig()

    // Check for bypass token
    const isBypassed = checkBypass(config.bypassToken)

    if (!isBypassed) {
      // Get staged files
      const stagedFiles = getStagedFiles()

      // Run checks
      await Promise.all([
        checkForPhi(stagedFiles, config),
        validateConfigs(stagedFiles),
        verifyAuditSetup(),
        runSecurityTests(config.minTestCoverage)
      ])
    }

    process.exit(0)
  } catch (error) {
    console.error(chalk.red('Pre-commit checks failed:'), error)
    process.exit(1)
  }
}
