import winston from 'winston'

// PHI patterns to redact
const PHI_PATTERNS = [
  /\b\d{3}-\d{2}-\d{4}\b/g,         // SSN
  /\b[A-Z]\d{8}\b/g,                // MRN
  /\b[A-Z]{2}\d{6}\b/g,             // Patient ID
  /"(mrn|ssn|dob)":\s*"[^"]+"/g,   // JSON fields
  /\b\d{1,2}\/\d{1,2}\/\d{4}\b/g   // Dates
]

// Keys that might contain PHI
const SENSITIVE_KEYS = [
  'patientId',
  'mrn',
  'ssn',
  'dob',
  'name',
  'address',
  'phone'
]

export function sanitizeLog(): winston.Logform.Format {
  return winston.format((info) => {
    // Deep clone to avoid modifying original
    const sanitized = JSON.parse(JSON.stringify(info))

    // Recursively sanitize objects
    function sanitizeObject(obj: any): any {
      if (!obj || typeof obj !== 'object') return obj

      Object.entries(obj).forEach(([key, value]) => {
        if (SENSITIVE_KEYS.includes(key)) {
          obj[key] = '[REDACTED]'
        } else if (typeof value === 'string') {
          // Check string values against PHI patterns
          PHI_PATTERNS.forEach(pattern => {
            obj[key] = value.replace(pattern, '[REDACTED]')
          })
        } else if (typeof value === 'object') {
          obj[key] = sanitizeObject(value)
        }
      })

      return obj
    }

    return sanitizeObject(sanitized)
  })()
}
