import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default async function DealsPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect('/auth/login')
  }

  const deals = await prisma.deal.findMany({
    where: {
      tenantId: session.user.tenantId,
    },
    include: {
      organization: true,
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Deals</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {deals.map((deal) => (
          <Card key={deal.id}>
            <CardHeader>
              <CardTitle>{deal.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                ${deal.value.toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">
                {deal.organization?.name}
              </p>
              <div className="mt-4">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {deal.status}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
