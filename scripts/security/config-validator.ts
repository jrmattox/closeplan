import { readFileSync } from 'fs'
import { parse as parseYaml } from 'yaml'
import chalk from 'chalk'
import { createDebug } from '@/lib/utils/debug'
import { securityScanConfig } from './scan-config'

const debug = createDebug('security:config')

interface ConfigValidation {
  missingSettings: string[]
  exposedSecrets: {
    file: string
    line: number
    match: string
  }[]
  environmentIssues: {
    name: string
    message: string
  }[]
}

export async function validateConfigurations(): Promise<ConfigValidation> {
  debug('Validating security configurations')

  const validation: ConfigValidation = {
    missingSettings: [],
    exposedSecrets: [],
    environmentIssues: []
  }

  // Check required settings
  const config = parseYaml(
    readFileSync('config/security.yml', 'utf8')
  )

  Object.entries(securityScanConfig.configuration.requiredSettings)
    .forEach(([path, value]) => {
      const configValue = path.split('.').reduce(
        (obj, key) => obj?.[key],
        config
      )
      if (configValue !== value) {
        validation.missingSettings.push(path)
      }
    })

  // Scan for exposed secrets
  const configFiles = [
    'config/**/*.{yml,json}',
    '.env*',
    '*.config.{js,ts}'
  ]

  for (const pattern of configFiles) {
    const files = await globby(pattern)
    for (const file of files) {
      const content = readFileSync(file, 'utf8')
      const lines = content.split('\n')

      lines.forEach((line, index) => {
        securityScanConfig.configuration.secretPatterns.forEach(pattern => {
          if (pattern.test(line)) {
            validation.exposedSecrets.push({
              file,
              line: index + 1,
              match: line.trim()
            })
          }
        })
      })
    }
  }

  // Validate environment
  securityScanConfig.configuration.environmentChecks.forEach(check => {
    const value = process.env[check.name]
    if (check.required && !value) {
      validation.environmentIssues.push({
        name: check.name,
        message: 'Required environment variable missing'
      })
    } else if (check.pattern && !check.pattern.test(value)) {
      validation.environmentIssues.push({
        name: check.name,
        message: 'Environment variable format invalid'
      })
    } else if (check.minLength && value.length < check.minLength) {
      validation.environmentIssues.push({
        name: check.name,
        message: `Must be at least ${check.minLength} characters`
      })
    }
  })

  return validation
}
