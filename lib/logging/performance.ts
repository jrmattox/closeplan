import { loggers } from './config'
import { performance } from 'perf_hooks'

interface PerformanceMetric {
  operation: string
  duration: number
  success: boolean
  details?: Record<string, any>
}

const metrics = new Map<string, number[]>()

export function startMeasure(operation: string): () => void {
  const start = performance.now()

  return () => {
    const duration = performance.now() - start
    recordMetric({
      operation,
      duration,
      success: true
    })
  }
}

export function recordMetric(metric: PerformanceMetric): void {
  const { performance: perfLogger } = loggers

  // Store for aggregation
  if (!metrics.has(metric.operation)) {
    metrics.set(metric.operation, [])
  }
  metrics.get(metric.operation)!.push(metric.duration)

  // Log individual metric
  perfLogger.log({
    level: 'debug',
    message: `PERF:${metric.operation}`,
    ...metric,
    timestamp: new Date().toISOString()
  })
}

// Report aggregated metrics periodically
setInterval(() => {
  const { performance: perfLogger } = loggers

  metrics.forEach((durations, operation) => {
    const avg = durations.reduce((a, b) => a + b, 0) / durations.length
    const max = Math.max(...durations)
    const min = Math.min(...durations)

    perfLogger.log({
      level: 'info',
      message: `PERF_AGGREGATE:${operation}`,
      operation,
      avg,
      max,
      min,
      count: durations.length,
      timestamp: new Date().toISOString()
    })
  })

  // Clear metrics
  metrics.clear()
}, 60000) // Every minute
