import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 })
  }

  try {
    // Log PHI access attempt
    await prisma.accessLog.create({
      data: {
        userId: session.user.id,
        dealId: params.id,
        action: 'PHI_ACCESS',
        accessType: 'READ',
        resourceType: 'DEAL_PHI',
        success: true,
      }
    })

    const deal = await prisma.deal.findUnique({
      where: {
        id: params.id,
        tenantId: session.user.tenantId,
      },
      select: {
        phi: true
      }
    })

    if (!deal) {
      return new Response("Deal not found", { status: 404 })
    }

    return NextResponse.json(deal.phi)
  } catch (error) {
    console.error('PHI access error:', error)
    return new Response("Error accessing PHI", { status: 500 })
  }
}
