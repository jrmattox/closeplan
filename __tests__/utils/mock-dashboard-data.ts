import { Deal, Activity, Meeting } from '@/lib/test-data'

export const mockMetrics = {
  activeDeals: 5,
  totalPipeline: 1250000,
  upcomingMeetings: 3,
  pendingActions: 8,
  monthlyGrowth: {
    deals: 20.1,
    pipeline: 15.0,
    meetings: 5.2
  }
}

export const mockActivities: Activity[] = [
  {
    id: '1',
    type: 'DOCUMENT',
    description: 'Security assessment uploaded',
    timestamp: new Date('2024-02-06T10:30:00'),
    dealId: '1'
  },
  {
    id: '2',
    type: 'MEETING',
    description: 'Technical review scheduled',
    timestamp: new Date('2024-02-06T09:15:00'),
    dealId: '1'
  },
  {
    id: '3',
    type: 'STAKEHOLDER',
    description: 'New IT stakeholder added',
    timestamp: new Date('2024-02-05T16:45:00'),
    dealId: '2'
  }
]

export const mockDeals: Deal[] = [
  {
    id: '1',
    name: 'Healthcare System Integration',
    customer: 'City Hospital',
    value: 250000,
    stage: 'EVALUATION',
    lastActivity: new Date('2024-02-05')
  },
  {
    id: '2',
    name: 'EMR Implementation',
    customer: 'Regional Medical Center',
    value: 500000,
    stage: 'NEGOTIATION',
    lastActivity: new Date('2024-02-06')
  }
] 