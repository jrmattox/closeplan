import { DealDashboard } from "@/components/dashboard/DealDashboard"
import { withTenantContext } from "@/lib/middleware/tenant-context"

export default async function DashboardPage() {
  return (
    <main className="container mx-auto p-4">
      <DealDashboard />
    </main>
  )
}
