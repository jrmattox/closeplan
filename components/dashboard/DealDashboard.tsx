import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { createAuditLog } from '@/lib/audit'
import { withTenantContext } from '@/lib/middleware/tenant-context'
import { decrypt } from '@/lib/utils/phi-encryption'

interface DealSummary {
  id: string
  name: string // Non-PHI deal name
  stage: string
  value: number
  department: string
  lastActivity: Date
  assignedTo: {
    id: string
    initials: string
  }
}

export function DealDashboard() {
  const [selectedDept, setSelectedDept] = useState('all')
  const [deals, setDeals] = useState<DealSummary[]>([])

  // Fetch deals with tenant context
  const fetchDeals = async () => {
    const response = await fetch('/api/deals/summary', {
      headers: {
        'Content-Type': 'application/json'
      }
    })
    const data = await response.json()
    setDeals(data)

    // Audit the dashboard access
    await createAuditLog({
      action: 'VIEW_DASHBOARD',
      resourceType: 'DEAL_SUMMARY',
      metadata: { department: selectedDept }
    })
  }

  useEffect(() => {
    fetchDeals()
  }, [selectedDept])

  return (
    <div className="p-6 space-y-6">
      <Tabs defaultValue="pipeline" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline">
          <div className="grid gap-4 md:grid-cols-3">
            <PipelineStageCard
              stage="Qualification"
              deals={deals.filter(d => d.stage === 'QUALIFICATION')}
            />
            <PipelineStageCard
              stage="Proposal"
              deals={deals.filter(d => d.stage === 'PROPOSAL')}
            />
            <PipelineStageCard
              stage="Closing"
              deals={deals.filter(d => d.stage === 'CLOSING')}
            />
          </div>
        </TabsContent>

        <TabsContent value="metrics">
          <div className="grid gap-4 md:grid-cols-2">
            <MetricsCard
              title="Department Performance"
              metrics={aggregateMetricsByDepartment(deals)}
            />
            <MetricsCard
              title="Value Summary"
              metrics={calculateValueMetrics(deals)}
            />
          </div>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <ActivityFeed deals={deals} />
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function PipelineStageCard({ stage, deals }: { stage: string, deals: DealSummary[] }) {
  const totalValue = deals.reduce((sum, deal) => sum + deal.value, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between">
          {stage}
          <Badge variant="secondary">
            {deals.length} Deals
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px]">
          {deals.map(deal => (
            <div key={deal.id} className="flex items-center p-2 border-b">
              <div className="flex-1">
                <p className="font-medium">{deal.name}</p>
                <p className="text-sm text-muted-foreground">
                  ${deal.value.toLocaleString()}
                </p>
              </div>
              <Avatar className="h-8 w-8">
                <AvatarFallback>
                  {deal.assignedTo.initials}
                </AvatarFallback>
              </Avatar>
            </div>
          ))}
        </ScrollArea>
        <div className="mt-4 pt-4 border-t">
          <p className="text-sm font-medium">
            Total Value: ${totalValue.toLocaleString()}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
