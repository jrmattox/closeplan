import { prisma } from '@/lib/prisma'
import { createLogger } from '@/lib/logger'
import { performance } from 'perf_hooks'

const logger = createLogger('performance-monitor')

interface PerformanceMetrics {
  queryTime: number
  rlsOverhead: number
  encryptionTime: number
  auditLatency: number
  timestamp: Date
}

interface ThresholdConfig {
  queryTimeMs: number
  rlsOverheadPercent: number
  encryptionTimeMs: number
  auditLatencyMs: number
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private metrics: Map<string, PerformanceMetrics[]> = new Map()
  private alertsSent: Set<string> = new Set()

  private thresholds: ThresholdConfig = {
    queryTimeMs: 500,        // Max query time
    rlsOverheadPercent: 50,  // Max RLS overhead
    encryptionTimeMs: 100,   // Max encryption time
    auditLatencyMs: 50       // Max audit logging latency
  }

  private constructor() {
    this.setupMiddleware()
    this.startPeriodicCheck()
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }

  private setupMiddleware() {
    // Query performance monitoring
    prisma.$use(async (params, next) => {
      const start = performance.now()
      
      try {
        // Track RLS overhead
        const withoutRLS = await this.measureWithoutRLS(params)
        const result = await next(params)
        const withRLS = performance.now() - start

        this.recordMetrics(params.model, {
          queryTime: withRLS,
          rlsOverhead: ((withRLS - withoutRLS) / withoutRLS) * 100,
          encryptionTime: 0,  // Will be set by encryption middleware
          auditLatency: 0,    // Will be set by audit middleware
          timestamp: new Date()
        })

        return result
      } catch (error) {
        this.recordError(params.model, error)
        throw error
      }
    })

    // Encryption performance monitoring
    prisma.$use(async (params, next) => {
      if (params.model === 'Deal' && params.args?.data?.phi) {
        const start = performance.now()
        const result = await next(params)
        const encryptionTime = performance.now() - start

        this.updateMetrics(params.model, { encryptionTime })
        return result
      }
      return next(params)
    })

    // Audit logging performance monitoring
    prisma.$use(async (params, next) => {
      if (params.model === 'AuditLog' && params.action === 'create') {
        const start = performance.now()
        const result = await next(params)
        const auditLatency = performance.now() - start

        this.updateMetrics('AuditLog', { auditLatency })
        return result
      }
      return next(params)
    })
  }

  private async measureWithoutRLS(params: any): Promise<number> {
    const start = performance.now()
    
    // Execute query without RLS for comparison
    await prisma.$executeRaw`
      SET LOCAL row_security = off;
      ${this.buildRawQuery(params)};
      SET LOCAL row_security = on;
    `

    return performance.now() - start
  }

  private buildRawQuery(params: any): string {
    // Convert Prisma params to raw SQL for measurement
    // This is a simplified version - expand based on your needs
    const model = params.model.toLowerCase()
    switch (params.action) {
      case 'findMany':
        return `SELECT * FROM "${model}" LIMIT 1`
      case 'findUnique':
        return `SELECT * FROM "${model}" WHERE id = '${params.args.where.id}' LIMIT 1`
      default:
        return `SELECT 1`
    }
  }

  private recordMetrics(model: string, metrics: PerformanceMetrics) {
    if (!this.metrics.has(model)) {
      this.metrics.set(model, [])
    }
    
    const modelMetrics = this.metrics.get(model)
    modelMetrics.push(metrics)

    // Keep last hour of metrics
    const oneHourAgo = Date.now() - 3600000
    this.metrics.set(
      model,
      modelMetrics.filter(m => m.timestamp.getTime() > oneHourAgo)
    )

    this.checkThresholds(model, metrics)
  }

  private updateMetrics(model: string, partialMetrics: Partial<PerformanceMetrics>) {
    const modelMetrics = this.metrics.get(model)
    if (modelMetrics?.length) {
      const latest = modelMetrics[modelMetrics.length - 1]
      Object.assign(latest, partialMetrics)
      this.checkThresholds(model, latest)
    }
  }

  private checkThresholds(model: string, metrics: PerformanceMetrics) {
    const alerts = []

    if (metrics.queryTime > this.thresholds.queryTimeMs) {
      alerts.push(`High query time: ${metrics.queryTime.toFixed(2)}ms`)
    }

    if (metrics.rlsOverhead > this.thresholds.rlsOverheadPercent) {
      alerts.push(`High RLS overhead: ${metrics.rlsOverhead.toFixed(2)}%`)
    }

    if (metrics.encryptionTime > this.thresholds.encryptionTimeMs) {
      alerts.push(`High encryption time: ${metrics.encryptionTime.toFixed(2)}ms`)
    }

    if (metrics.auditLatency > this.thresholds.auditLatencyMs) {
      alerts.push(`High audit latency: ${metrics.auditLatency.toFixed(2)}ms`)
    }

    if (alerts.length > 0) {
      this.sendAlert(model, alerts)
    }
  }

  private async sendAlert(model: string, alerts: string[]) {
    const alertKey = `${model}-${alerts.join('-')}`
    
    // Prevent alert spam - only send once per hour
    if (!this.alertsSent.has(alertKey)) {
      this.alertsSent.add(alertKey)
      
      logger.warn('Performance Alert', {
        model,
        alerts,
        timestamp: new Date().toISOString()
      })

      // Record alert in database
      await prisma.performanceAlert.create({
        data: {
          model,
          alerts,
          timestamp: new Date()
        }
      })

      // Clear alert after an hour
      setTimeout(() => {
        this.alertsSent.delete(alertKey)
      }, 3600000)
    }
  }

  private startPeriodicCheck() {
    setInterval(() => {
      this.reportMetrics()
    }, 300000) // Every 5 minutes
  }

  private async reportMetrics() {
    try {
      for (const [model, metrics] of this.metrics.entries()) {
        if (metrics.length === 0) continue

        const averageMetrics = {
          queryTime: 0,
          rlsOverhead: 0,
          encryptionTime: 0,
          auditLatency: 0
        }

        metrics.forEach(m => {
          averageMetrics.queryTime += m.queryTime
          averageMetrics.rlsOverhead += m.rlsOverhead
          averageMetrics.encryptionTime += m.encryptionTime
          averageMetrics.auditLatency += m.auditLatency
        })

        const count = metrics.length
        Object.keys(averageMetrics).forEach(key => {
          averageMetrics[key] /= count
        })

        await prisma.performanceMetrics.create({
          data: {
            model,
            ...averageMetrics,
            sampleCount: count,
            timestamp: new Date()
          }
        })
      }
    } catch (error) {
      logger.error('Failed to report metrics:', error)
    }
  }

  // Public methods for monitoring
  async getPerformanceStatus(options: {
    model?: string
    startDate?: Date
    endDate?: Date
  } = {}) {
    const metrics = await prisma.performanceMetrics.findMany({
      where: {
        model: options.model,
        timestamp: {
          gte: options.startDate,
          lte: options.endDate
        }
      },
      orderBy: { timestamp: 'desc' },
      take: 100
    })

    const alerts = await prisma.performanceAlert.findMany({
      where: {
        model: options.model,
        timestamp: {
          gte: options.startDate,
          lte: options.endDate
        }
      },
      orderBy: { timestamp: 'desc' },
      take: 10
    })

    return {
      metrics,
      alerts,
      currentThresholds: { ...this.thresholds }
    }
  }

  updateThresholds(newThresholds: Partial<ThresholdConfig>) {
    this.thresholds = {
      ...this.thresholds,
      ...newThresholds
    }
  }
} 