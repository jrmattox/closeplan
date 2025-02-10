import winston from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'
import { sanitizeLog } from './sanitizer'
import { createDebug } from '@/lib/utils/debug'

const debug = createDebug('logging:config')

interface LogConfig {
  level: string
  retention: number // days
  maxSize: string
  sanitize: boolean
}

const LOG_CONFIGS: Record<string, LogConfig> = {
  security: {
    level: 'debug',
    retention: 30,
    maxSize: '100m',
    sanitize: true
  },
  phi: {
    level: 'info',
    retention: 90,
    maxSize: '500m',
    sanitize: true
  },
  audit: {
    level: 'info',
    retention: 365,
    maxSize: '1g',
    sanitize: false
  },
  performance: {
    level: 'debug',
    retention: 7,
    maxSize: '100m',
    sanitize: false
  }
}

// Create logger instances
export const loggers = Object.entries(LOG_CONFIGS).reduce((acc, [name, config]) => {
  const rotateTransport = new DailyRotateFile({
    filename: `logs/${name}-%DATE%.log`,
    datePattern: 'YYYY-MM-DD',
    maxSize: config.maxSize,
    maxFiles: `${config.retention}d`,
    auditFile: `logs/${name}-audit.json`
  })

  const logger = winston.createLogger({
    level: config.level,
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json(),
      config.sanitize ? sanitizeLog() : winston.format.simple()
    ),
    transports: [
      rotateTransport,
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      })
    ]
  })

  acc[name] = logger
  return acc
}, {} as Record<string, winston.Logger>)
