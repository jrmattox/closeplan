import { Suspense } from 'react'
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { DealsTable } from '../components/deals-table'
import { StatsCards } from '../components/stats-cards'
import { mockDeals, mockMeetings, mockActivities } from '@/lib/test-data'

export default function DealsPage() {
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Deals</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage and track your sales pipeline
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> New Deal
        </Button>
      </div>

      <Suspense fallback={<div>Loading stats...</div>}>
        <StatsCards 
          deals={mockDeals}
          meetings={mockMeetings}
          activities={mockActivities}
        />
      </Suspense>

      <div className="bg-white rounded-md shadow">
        <div className="p-6">
          <Suspense fallback={<div>Loading deals...</div>}>
            <DealsTable deals={mockDeals} />
          </Suspense>
        </div>
      </div>
    </div>
  )
} 