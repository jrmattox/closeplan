import { readFileSync } from 'fs'
import chalk from 'chalk'
import { parse as parseYaml } from 'yaml'

interface SecurityConfig {
  encryption: {
    algorithm: string
    keyRotation: number
  }
  audit: {
    enabled: boolean
    retention: number
  }
  tenantIsolation: {
    enabled: boolean
    enforceContext: boolean
  }
}

const REQUIRED_CONFIGS = [
  'encryption.algorithm',
  'encryption.keyRotation',
  'audit.enabled',
  'audit.retention',
  'tenantIsolation.enabled'
]

export async function validateConfigs(
  files: string[]
): Promise<void> {
  console.log(chalk.blue('Validating security configurations...'))

  const configFiles = files.filter(f =>
    f.endsWith('.yml') || f.endsWith('.yaml')
  )

  for (const file of configFiles) {
    const content = readFileSync(file, 'utf8')
    const config = parseYaml(content) as SecurityConfig

    // Check required fields
    for (const path of REQUIRED_CONFIGS) {
      const value = path.split('.').reduce(
        (obj, key) => obj?.[key],
        config as any
      )

      if (value === undefined) {
        throw new Error(
          `Missing required config: ${path} in ${file}`
        )
      }
    }

    // Validate encryption settings
    if (!['aes-256-gcm', 'aes-256-cbc'].includes(
      config.encryption.algorithm
    )) {
      throw new Error(
        `Invalid encryption algorithm in ${file}`
      )
    }

    // Validate audit retention
    if (config.audit.retention < 2555) { // 7 years
      throw new Error(
        `Audit retention must be at least 7 years in ${file}`
      )
    }
  }

  console.log(chalk.green('✓ Security configurations valid'))
}
