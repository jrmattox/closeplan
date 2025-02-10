import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity, BarChart, Users, Calendar } from "lucide-react"
import { Deal, Meeting, Activity as ActivityType } from "@/lib/test-data"

interface StatsCardsProps {
  deals: Deal[]
  meetings: Meeting[]
  activities: ActivityType[]
}

export function StatsCards({ deals, meetings, activities }: StatsCardsProps) {
  const activeDeals = deals.filter(d => d.stage !== 'CLOSED').length
  const pipelineValue = deals
    .filter(d => d.stage !== 'CLOSED')
    .reduce((acc, deal) => acc + deal.value, 0)
  const upcomingMeetings = meetings.filter(
    m => m.datetime > new Date()
  ).length
  const pendingActions = activities.filter(
    a => a.type === 'DOCUMENT' || a.type === 'MEETING'
  ).length

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Deals</CardTitle>
          <BarChart className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{activeDeals}</div>
          <p className="text-xs text-muted-foreground">
            +20.1% from last month
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pipeline Value</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            ${(pipelineValue / 1000).toFixed(1)}k
          </div>
          <p className="text-xs text-muted-foreground">
            +15% from last month
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Upcoming Meetings</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{upcomingMeetings}</div>
          <p className="text-xs text-muted-foreground">
            Next 7 days
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending Actions</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{pendingActions}</div>
          <p className="text-xs text-muted-foreground">
            Requires attention
          </p>
        </CardContent>
      </Card>
    </div>
  )
} 