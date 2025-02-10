import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { withTenantContext } from '@/lib/middleware/tenant-context'
import { validatePermissions } from '@/lib/auth/permissions'
import { createAuditLog } from '@/lib/audit'

export default withTenantContext(async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  { tenantId, userId }
) {
  if (req.method !== 'POST') {
    return res.status(405).end()
  }

  try {
    // Validate permissions
    await validatePermissions(userId, 'CREATE_DEAL')

    const deal = await prisma.deal.create({
      data: {
        ...req.body,
        tenantId,
        createdById: userId
      }
    })

    // Create detailed audit log
    await createAuditLog({
      action: 'CREATE_DEAL',
      resourceType: 'DEAL',
      resourceId: deal.id,
      userId,
      tenantId,
      metadata: {
        department: deal.department,
        containsPhi: deal.containsPhi,
        stage: deal.stage
      }
    })

    return res.status(201).json(deal)
  } catch (error) {
    console.error('Failed to create deal:', error)
    return res.status(500).json({ error: 'Failed to create deal' })
  }
})
