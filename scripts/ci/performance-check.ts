import { performance } from 'perf_hooks'
import { prisma } from '@/lib/prisma'

interface PerformanceThresholds {
  encryption: number  // ms
  query: number      // ms
  api: number        // ms
}

const THRESHOLDS: PerformanceThresholds = {
  encryption: 100,   // 100ms
  query: 50,        // 50ms
  api: 200          // 200ms
}

async function checkPerformance(): Promise<void> {
  console.log('Running performance checks...')

  // Test encryption performance
  const encryptionTimes: number[] = []
  for (let i = 0; i < 100; i++) {
    const start = performance.now()
    await encrypt({ test: 'data' })
    encryptionTimes.push(performance.now() - start)
  }

  // Test query performance
  const queryTimes: number[] = []
  for (let i = 0; i < 100; i++) {
    const start = performance.now()
    await prisma.phiRecord.findMany({
      take: 10,
      select: { id: true }
    })
    queryTimes.push(performance.now() - start)
  }

  // Calculate averages
  const avgEncryption = average(encryptionTimes)
  const avgQuery = average(queryTimes)

  // Check thresholds
  const violations = []

  if (avgEncryption > THRESHOLDS.encryption) {
    violations.push(
      `Encryption: ${avgEncryption.toFixed(2)}ms > ${THRESHOLDS.encryption}ms`
    )
  }

  if (avgQuery > THRESHOLDS.query) {
    violations.push(
      `Query: ${avgQuery.toFixed(2)}ms > ${THRESHOLDS.query}ms`
    )
  }

  if (violations.length > 0) {
    console.error('Performance thresholds exceeded:')
    violations.forEach(v => console.error(`- ${v}`))
    process.exit(1)
  }

  console.log('✓ Performance checks passed')
}
