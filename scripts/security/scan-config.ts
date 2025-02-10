import { createDebug } from '@/lib/utils/debug'

const debug = createDebug('security:scan')

export interface ScanConfig {
  staticAnalysis: {
    patterns: SecurityPattern[]
    excludePaths: string[]
    severity: Record<string, 'error' | 'warning'>
  }
  dependencies: {
    allowedLicenses: string[]
    blockedPackages: string[]
    maxVulnerabilities: Record<string, number>
  }
  configuration: {
    requiredSettings: Record<string, any>
    secretPatterns: RegExp[]
    environmentChecks: EnvironmentCheck[]
  }
}

export const securityScanConfig: ScanConfig = {
  staticAnalysis: {
    patterns: [
      {
        id: 'SEC-SA001',
        pattern: /process\.env\.[A-Z_]+/g,
        message: 'Direct environment access - use config service',
        severity: 'warning'
      },
      {
        id: 'SEC-SA002',
        pattern: /SELECT.*FROM.*WHERE/i,
        message: 'Raw SQL query detected - use Prisma',
        severity: 'error'
      },
      {
        id: 'SEC-SA003',
        pattern: /eval\(|new Function\(/,
        message: 'Dynamic code execution detected',
        severity: 'error'
      }
    ],
    excludePaths: [
      'tests/',
      'scripts/',
      '*.test.ts',
      '*.spec.ts'
    ],
    severity: {
      'SEC-SA001': 'warning',
      'SEC-SA002': 'error',
      'SEC-SA003': 'error'
    }
  },
  dependencies: {
    allowedLicenses: [
      'MIT',
      'Apache-2.0',
      'BSD-3-Clause'
    ],
    blockedPackages: [
      'crypto-js', // Use node crypto
      'unsafe-package'
    ],
    maxVulnerabilities: {
      critical: 0,
      high: 0,
      moderate: 2
    }
  },
  configuration: {
    requiredSettings: {
      'encryption.algorithm': 'aes-256-gcm',
      'audit.enabled': true,
      'security.headers': {
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block'
      }
    },
    secretPatterns: [
      /(['"_]?password['"_]?\s*[:=]\s*['"][^'"]+['"])/i,
      /(['"_]?secret['"_]?\s*[:=]\s*['"][^'"]+['"])/i,
      /(['"_]?key['"_]?\s*[:=]\s*['"][^'"]+['"])/i
    ],
    environmentChecks: [
      {
        name: 'Database URL',
        pattern: /^postgresql:\/\/[^:]+:[^@]+@[^:]+:\d+\/\w+$/,
        required: true
      },
      {
        name: 'Encryption Key',
        minLength: 32,
        required: true
      }
    ]
  }
}
