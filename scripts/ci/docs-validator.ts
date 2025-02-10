import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import chalk from 'chalk'

interface DocRequirement {
  pattern: RegExp
  message: string
}

const REQUIRED_DOCS: DocRequirement[] = [
  {
    pattern: /encryption.*key.*management/i,
    message: 'Key management documentation required'
  },
  {
    pattern: /phi.*handling/i,
    message: 'PHI handling documentation required'
  },
  {
    pattern: /audit.*log/i,
    message: 'Audit logging documentation required'
  }
]

async function validateDocs(): Promise<void> {
  console.log(chalk.blue('Validating documentation...'))

  const docs = getAllMarkdownFiles('docs')
  const combinedContent = docs
    .map(file => readFileSync(file, 'utf8'))
    .join('\n')

  const missing = REQUIRED_DOCS.filter(
    req => !req.pattern.test(combinedContent)
  )

  if (missing.length > 0) {
    console.error(chalk.red('Missing required documentation:'))
    missing.forEach(m => console.error(`- ${m.message}`))
    process.exit(1)
  }

  console.log(chalk.green('✓ Documentation validation passed'))
}
