import { readFileSync } from 'fs'
import { join } from 'path'
import chalk from 'chalk'
import { createDebug } from '@/lib/utils/debug'
import { securityScanConfig } from './scan-config'
import { minimatch } from 'minimatch'

const debug = createDebug('security:static')

interface AnalysisResult {
  file: string
  line: number
  pattern: string
  severity: 'error' | 'warning'
  message: string
  snippet?: string
}

export async function analyzeCode(
  files: string[]
): Promise<AnalysisResult[]> {
  debug('Starting static analysis')
  const results: AnalysisResult[] = []

  const filteredFiles = files.filter(file =>
    !securityScanConfig.staticAnalysis.excludePaths.some(
      pattern => minimatch(file, pattern)
    )
  )

  for (const file of filteredFiles) {
    const content = readFileSync(file, 'utf8')
    const lines = content.split('\n')

    for (const pattern of securityScanConfig.staticAnalysis.patterns) {
      lines.forEach((line, index) => {
        if (pattern.pattern.test(line)) {
          results.push({
            file,
            line: index + 1,
            pattern: pattern.id,
            severity: securityScanConfig.staticAnalysis.severity[pattern.id],
            message: pattern.message,
            snippet: line.trim()
          })
        }
      })
    }
  }

  return results
}

export function formatAnalysisResults(results: AnalysisResult[]): string {
  let output = ''

  const groupedByFile = results.reduce((acc, result) => {
    if (!acc[result.file]) acc[result.file] = []
    acc[result.file].push(result)
    return acc
  }, {} as Record<string, AnalysisResult[]>)

  Object.entries(groupedByFile).forEach(([file, fileResults]) => {
    output += `\n${chalk.underline(file)}\n`

    fileResults.forEach(result => {
      const severity = result.severity === 'error'
        ? chalk.red('error')
        : chalk.yellow('warning')

      output += `  ${severity} ${result.message}\n`
      output += chalk.gray(`    at line ${result.line}: ${result.snippet}\n`)
    })
  })

  return output
}
