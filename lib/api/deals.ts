import { prisma } from '@/lib/prisma'
import { encrypt, decrypt } from '@/lib/utils/phi-encryption'
import { withTenantContext } from '@/lib/middleware/tenant-context'

export async function getDealSummaries(tenantId: string) {
  // Get deals with tenant isolation
  const deals = await prisma.deal.findMany({
    where: { tenantId },
    select: {
      id: true,
      name: true,
      stage: true,
      value: true,
      department: true,
      lastActivity: true,
      assignedTo: {
        select: {
          id: true,
          initials: true
        }
      }
    }
  })

  // Decrypt any PHI fields if present
  return deals.map(deal => ({
    ...deal,
    name: deal.containsPhi ? decrypt(deal.name) : deal.name
  }))
}

export async function getDealMetrics(tenantId: string) {
  const metrics = await prisma.$queryRaw`
    SELECT
      department,
      COUNT(*) as deal_count,
      SUM(value) as total_value,
      AVG(value) as avg_value
    FROM deals
    WHERE tenant_id = ${tenantId}
    GROUP BY department
  `

  return metrics
}
