import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'
import { getSession } from 'next-auth/react'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function withTenantContext(
  handler: (
    req: NextApiRequest,
    res: NextApiResponse,
    context: { tenantId: string; userId: string }
  ) => Promise<void>
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      const session = await getSession({ req })
      if (!session?.user) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      // Get user's tenant
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { tenantId: true }
      })

      if (!user?.tenantId) {
        return res.status(403).json({ error: 'No tenant access' })
      }

      // Set tenant context
      await prisma.$executeRaw`SELECT set_tenant_context(${user.tenantId})`

      // Call handler with context
      await handler(req, res, {
        tenantId: user.tenantId,
        userId: session.user.id
      })
    } catch (error) {
      console.error('Tenant context error:', error)
      res.status(500).json({ error: 'Internal server error' })
    } finally {
      // Clear tenant context
      await prisma.$executeRaw`SELECT set_tenant_context(NULL)`
    }
  }
}

export function withTenantContextNextServer(handler: Function) {
  return async function(req: NextRequest, ...args: any[]) {
    // TODO: Implement tenant context logic
    // For now, just pass through
    return handler(req, ...args)
  }
}
