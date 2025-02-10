import { ComplianceReporter } from '@/lib/reporting/compliance-reporter'

export async function generateComplianceReport(period: 'daily' | 'weekly' | 'monthly') {
  const reporter = new ComplianceReporter(period)
  await reporter.generateReport()
}

// Schedule daily reports
if (process.env.NODE_ENV === 'production') {
  const schedule = require('node-schedule')
  
  // Run daily at 1 AM
  schedule.scheduleJob('0 1 * * *', async () => {
    await generateComplianceReport('daily')
  })
  
  // Run weekly on Sunday at 2 AM
  schedule.scheduleJob('0 2 * * 0', async () => {
    await generateComplianceReport('weekly')
  })
  
  // Run monthly on the 1st at 3 AM
  schedule.scheduleJob('0 3 1 * *', async () => {
    await generateComplianceReport('monthly')
  })
} 