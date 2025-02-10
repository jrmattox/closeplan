import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

interface Metric {
  label: string
  value: number
  target?: number
  trend?: number
}

interface MetricsCardProps {
  title: string
  metrics: Metric[]
}

export function MetricsCard({ title, metrics }: MetricsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {metrics.map(metric => (
            <div key={metric.label} className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">
                  {metric.label}
                </span>
                <span className="text-sm text-muted-foreground">
                  {metric.value.toLocaleString()}
                  {metric.trend && (
                    <span className={metric.trend > 0 ? 'text-green-500' : 'text-red-500'}>
                      {metric.trend > 0 ? '↑' : '↓'}
                      {Math.abs(metric.trend)}%
                    </span>
                  )}
                </span>
              </div>
              {metric.target && (
                <Progress
                  value={(metric.value / metric.target) * 100}
                  className="h-2"
                />
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
