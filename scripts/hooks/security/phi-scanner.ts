import { readFileSync } from 'fs'
import chalk from 'chalk'

const PHI_PATTERNS = [
  /\b\d{3}-\d{2}-\d{4}\b/, // SSN
  /\b\d{10}\b/,            // MRN
  /patient.*id.*:/i,       // Patient IDs
  /"mrn":\s*"[^"]+"/,     // MRN in JSON
  /phi.*data/i            // PHI references
]

const ALLOWED_PATTERNS = [
  /test.*data/i,
  /example/i,
  /mock/i,
  /fake/i
]

export async function checkForPhi(
  files: string[],
  config: { excludePaths: string[] }
): Promise<void> {
  console.log(chalk.blue('Checking for exposed PHI...'))

  for (const file of files) {
    // Skip excluded paths
    if (config.excludePaths.some(path => file.includes(path))) {
      continue
    }

    const content = readFileSync(file, 'utf8')

    // Check each pattern
    for (const pattern of PHI_PATTERNS) {
      const matches = content.match(pattern)

      if (matches) {
        // Check if it's an allowed test pattern
        const isAllowed = ALLOWED_PATTERNS.some(p =>
          matches.some(m => p.test(m))
        )

        if (!isAllowed) {
          throw new Error(
            `Possible PHI found in ${file}: ${pattern}`
          )
        }
      }
    }
  }

  console.log(chalk.green('✓ No exposed PHI found'))
}
