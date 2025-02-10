import { Deal, DealStage } from '@/lib/types'

export const DEAL_STAGES: Record<DealStage, string> = {
  DISCOVERY: 'Initial Assessment',
  TECHNICAL_VALIDATION: 'Technical Review',
  CLINICAL_VALIDATION: 'Clinical Validation',
  VALUE_PROPOSITION: 'ROI Analysis',
  PROCUREMENT: 'Procurement Review',
  NEGOTIATION: 'Contract Negotiation',
  CLOSED_WON: 'Closed Won',
  CLOSED_LOST: 'Closed Lost'
}

export const mockDeals: Deal[] = [
  {
    id: 'deal_1',
    name: 'EMR Integration Platform',
    customer: 'City Hospital',
    value: 750000,
    stage: 'TECHNICAL_VALIDATION',
    probability: 60,
    expectedCloseDate: new Date('2024-06-30'),
    startDate: new Date('2024-01-15'),
    lastActivity: new Date('2024-02-05'),
    owner: 'user_1',
    stakeholders: ['stak_1', 'stak_2'],
    products: ['EMR Integration Suite', 'Data Migration Tools'],
    notes: 'Complex integration project with existing EMR system'
  },
  {
    id: 'deal_2',
    name: 'Radiology PACS Upgrade',
    customer: 'City Hospital',
    value: 500000,
    stage: 'CLINICAL_VALIDATION',
    probability: 75,
    expectedCloseDate: new Date('2024-05-15'),
    startDate: new Date('2024-01-01'),
    lastActivity: new Date('2024-02-06'),
    owner: 'user_1',
    stakeholders: ['stak_1', 'stak_3'],
    products: ['PACS Enterprise', 'Cloud Storage'],
    notes: 'Department-wide imaging system upgrade'
  }
]

export const mockDealMetrics = {
  pipeline: {
    total: 2500000,
    byStage: {
      DISCOVERY: 500000,
      TECHNICAL_VALIDATION: 750000,
      CLINICAL_VALIDATION: 500000,
      VALUE_PROPOSITION: 750000
    },
    probability: 65
  },
  activity: {
    meetings: 12,
    documents: 8,
    stakeholders: 5
  },
  timeline: {
    avgSalesCycle: 120, // days
    avgTimeInStage: 15  // days
  }
} 