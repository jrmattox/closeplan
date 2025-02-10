import { PerformanceMonitor } from '@/lib/monitoring/performance-monitor'

export async function getPerformanceStatus(model?: string) {
  const monitor = PerformanceMonitor.getInstance()
  
  return monitor.getPerformanceStatus({
    model,
    startDate: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
  })
}

export async function updatePerformanceThresholds(thresholds: {
  queryTimeMs?: number
  rlsOverheadPercent?: number
  encryptionTimeMs?: number
  auditLatencyMs?: number
}) {
  const monitor = PerformanceMonitor.getInstance()
  monitor.updateThresholds(thresholds)
} 