import { Card } from "@/components/ui/card"

export default function DashboardPage() {
  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-2">Active Deals</h2>
          <p className="text-gray-600">No active deals yet</p>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-2">Recent Activity</h2>
          <p className="text-gray-600">No recent activity</p>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-2">Team Members</h2>
          <p className="text-gray-600">No team members yet</p>
        </Card>
      </div>
    </main>
  )
}
