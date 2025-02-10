export * from './mock-deals'
export * from './mock-stakeholders'
export * from './mock-documents'
export * from './test-utils'
export * from './healthcare-metrics'

export const formatHealthcareMetrics = {
  formatClinicalDuration: (days: number) => `${days} days`,
  formatComplianceRate: (rate: number) => `${(rate * 100).toFixed(1)}%`,
  formatImplementationTime: (days: number) => `${days} days`
} 