import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { DealService } from "@/lib/services/deals"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 })
  }

  try {
    const deal = await prisma.deal.findUnique({
      where: {
        id: params.id,
        tenantId: session.user.tenantId, // Ensure tenant isolation
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    })

    if (!deal) {
      return new Response("Deal not found", { status: 404 })
    }

    return NextResponse.json(deal)
  } catch (error) {
    console.error('Deal fetch error:', error)
    return new Response("Error fetching deal", { status: 500 })
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 })
  }

  try {
    const data = await req.json()

    // Verify deal exists and belongs to tenant
    const existingDeal = await prisma.deal.findUnique({
      where: {
        id: params.id,
        tenantId: session.user.tenantId,
      }
    })

    if (!existingDeal) {
      return new Response("Deal not found", { status: 404 })
    }

    // Update the deal
    const deal = await prisma.deal.update({
      where: {
        id: params.id,
      },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    })

    // Log the update
    await prisma.securityEvent.create({
      data: {
        type: 'DEAL_UPDATED',
        tenantId: session.user.tenantId,
        details: {
          dealId: deal.id,
          userId: session.user.id,
          changes: data,
          timestamp: new Date(),
        },
      },
    })

    return NextResponse.json(deal)
  } catch (error) {
    console.error('Deal update error:', error)
    return new Response("Error updating deal", { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 })
  }

  try {
    // Verify deal exists and belongs to tenant
    const existingDeal = await prisma.deal.findUnique({
      where: {
        id: params.id,
        tenantId: session.user.tenantId,
      }
    })

    if (!existingDeal) {
      return new Response("Deal not found", { status: 404 })
    }

    // Delete the deal
    await prisma.deal.delete({
      where: {
        id: params.id,
      }
    })

    // Log the deletion
    await prisma.securityEvent.create({
      data: {
        type: 'DEAL_DELETED',
        tenantId: session.user.tenantId,
        details: {
          dealId: params.id,
          userId: session.user.id,
          timestamp: new Date(),
        },
      },
    })

    return new Response(null, { status: 204 })
  } catch (error) {
    console.error('Deal deletion error:', error)
    return new Response("Error deleting deal", { status: 500 })
  }
}

