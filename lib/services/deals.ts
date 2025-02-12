import { prisma } from "@/lib/prisma"
import { Deal, DealStatus } from "@prisma/client"

export type CreateDealInput = {
  title: string
  status: DealStatus
  value: number
  phi?: Record<string, any>
}

export type DealFilter = {
  status?: DealStatus[]
  search?: string
  page?: number
  limit?: number
}

export class DealService {
  static async createDeal(
    data: CreateDealInput,
    userId: string,
    tenantId: string
  ): Promise<Deal> {
    return prisma.deal.create({
      data: {
        ...data,
        createdById: userId,
        tenantId,
      },
    });
  }

  static async listDeals(
    tenantId: string,
    filters: DealFilter
  ) {
    const { status, search, page = 1, limit = 10 } = filters;

    return prisma.deal.findMany({
      where: {
        tenantId,
        status: status?.length ? { in: status } : undefined,
        title: search ? { contains: search, mode: 'insensitive' } : undefined,
      },
      take: limit,
      skip: (page - 1) * limit,
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    });
  }
}
