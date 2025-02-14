import { DealDashboard } from "@/components/dashboard/DealDashboard"
import { MetricsCard } from "@/components/dashboard/MetricsCard"
import { ActivityFeed } from "@/components/dashboard/ActivityFeed"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect('/auth/login')
  }

  // Fetch dashboard data
  const deals = await prisma.deal.findMany({
    where: {
      tenantId: session.user.tenantId,
    },
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: {
      organization: true,
    }
  })

  const metrics = [
    {
      label: "Active Deals",
      value: deals.length,
      trend: 12, // Percentage increase
    },
    {
      label: "Pipeline Value",
      value: deals.reduce((sum, deal) => sum + deal.value, 0),
      target: 1000000,
    },
    {
      label: "Win Rate",
      value: 65,
      target: 75,
    },
  ]

  const activities = await prisma.activity.findMany({
    where: {
      tenantId: session.user.tenantId,
    },
    take: 10,
    orderBy: { timestamp: 'desc' },
    include: {
      user: {
        select: {
          name: true,
          image: true,
        }
      }
    }
  })

  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
        <MetricsCard title="Key Metrics" metrics={metrics} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <DealDashboard deals={deals} />
        <ActivityFeed activities={activities} />
      </div>
    </main>
  )
}
