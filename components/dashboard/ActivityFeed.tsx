import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { formatDistanceToNow } from 'date-fns'

interface Activity {
  id: string
  dealId: string
  dealName: string
  type: string
  timestamp: Date
  user: {
    initials: string
  }
}

export function ActivityFeed({ activities }: { activities: Activity[] }) {
  return (
    <div className="space-y-4">
      {activities.map(activity => (
        <Card key={activity.id}>
          <CardContent className="p-4 flex items-center space-x-4">
            <Avatar className="h-8 w-8">
              <AvatarFallback>
                {activity.user.initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="text-sm font-medium">
                {activity.dealName}
              </p>
              <p className="text-sm text-muted-foreground">
                {activity.type}
              </p>
            </div>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
            </span>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
