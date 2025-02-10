import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Activity } from "@/lib/test-data"
import { formatDistanceToNow } from "date-fns"
import { File, Users, Calendar, BarChart } from "lucide-react"

interface RecentActivityProps {
  activities: Activity[]
}

const getActivityIcon = (type: Activity['type']) => {
  switch (type) {
    case 'DOCUMENT':
      return <File className="h-4 w-4" />
    case 'MEETING':
      return <Calendar className="h-4 w-4" />
    case 'STAKEHOLDER':
      return <Users className="h-4 w-4" />
    case 'DEAL':
      return <BarChart className="h-4 w-4" />
  }
}

export function RecentActivity({ activities }: RecentActivityProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-start">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border bg-muted">
                {getActivityIcon(activity.type)}
              </div>
              <div className="ml-4 space-y-1">
                <p className="text-sm font-medium">{activity.description}</p>
                <p className="text-sm text-muted-foreground">
                  {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
} 