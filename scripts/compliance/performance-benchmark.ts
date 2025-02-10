import { performance } from 'perf_hooks'
import { encrypt, decrypt } from '@/lib/encryption'
import { prisma } from '@/lib/prisma'
import { createDebug } from '@/lib/utils/debug'

const debug = createDebug('compliance:performance')

interface BenchmarkThresholds {
  encryption: number  // ms
  decryption: number  // ms
  query: number       // ms
  api: number         // ms
}

const THRESHOLDS: BenchmarkThresholds = {
  encryption: 100,
  decryption: 50,
  query: 200,
  api: 500
}

export async function runPerformanceBenchmarks(): Promise<ValidationResult> {
  debug('Running performance benchmarks')

  const violations: Violation[] = []
  const metrics: Record<string, number> = {}

  // Test encryption performance
  const encryptionTimes: number[] = []
  for (let i = 0; i < 100; i++) {
    const start = performance.now()
    await encrypt({ test: 'data' })
    encryptionTimes.push(performance.now() - start)
  }
  metrics.encryption = average(encryptionTimes)

  // Test decryption performance
  const encrypted = await encrypt({ test: 'data' })
  const decryptionTimes: number[] = []
  for (let i = 0; i < 100; i++) {
    const start = performance.now()
    await decrypt(encrypted)
    decryptionTimes.push(performance.now() - start)
  }
  metrics.decryption = average(decryptionTimes)

  // Check against thresholds
  Object.entries(metrics).forEach(([operation, value]) => {
    const threshold = THRESHOLDS[operation as keyof BenchmarkThresholds]
    if (value > threshold) {
      violations.push({
        severity: 'warning',
        message: `${operation} performance exceeds threshold`,
        details: {
          operation,
          value,
          threshold
        }
      })
    }
  })

  return {
    passed: violations.length === 0,
    violations,
    metrics,
    timestamp: new Date()
  }
}

function average(numbers: number[]): number {
  return numbers.reduce((a, b) => a + b, 0) / numbers.length
}
