// Basic structure for deal listing
import { prisma } from '@/lib/prisma'
import { DealTable } from '@/components/deals/DealTable'

export default async function DealsPage() {
  const deals = await prisma.deal.findMany({
    include: {
      organization: true,
      department: true,
    }
  })

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-4">Deals</h1>
      <DealTable deals={deals} />
    </div>
  )
}
