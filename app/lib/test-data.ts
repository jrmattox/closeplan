export type Deal = {
  id: string
  name: string
  customer: string
  value: number
  stage: 'DISCOVERY' | 'EVALUATION' | 'NEGOTIATION' | 'CLOSED'
  lastActivity: Date
}

export type Activity = {
  id: string
  type: 'DOCUMENT' | 'MEETING' | 'DEAL' | 'STAKEHOLDER'
  description: string
  timestamp: Date
  dealId?: string
}

export type Meeting = {
  id: string
  title: string
  description?: string
  datetime: Date
  duration: number // in minutes
  dealId?: string
  attendees: string[]
  type: 'REVIEW' | 'TECHNICAL' | 'BUSINESS' | 'OTHER'
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED'
  recording?: string
  summary?: string
}

export type Stakeholder = {
  id: string
  name: string
  email: string
  role: string
  organization: string
  department: string
  phone?: string
  deals: string[] // Deal IDs
}

export type Document = {
  id: string
  name: string
  type: 'PDF' | 'DOC' | 'SHEET' | 'SLIDE' | 'OTHER'
  size: number
  uploadedAt: Date
  uploadedBy: string
  dealId?: string
  folder: string
  version: number
}

export const mockDeals: Deal[] = [
  {
    id: '1',
    name: 'Healthcare System Integration',
    customer: 'City Hospital',
    value: 250000,
    stage: 'EVALUATION',
    lastActivity: new Date('2024-02-05'),
  },
  // Add more mock deals...
]

export const mockActivities: Activity[] = [
  {
    id: '1',
    type: 'DOCUMENT',
    description: 'Security assessment uploaded',
    timestamp: new Date('2024-02-06T10:30:00'),
    dealId: '1',
  },
  // Add more mock activities...
]

export const mockMeetings: Meeting[] = [
  {
    id: '1',
    title: 'Technical Review',
    datetime: new Date('2024-02-08T14:00:00'),
    dealId: '1',
    attendees: ['tech@customer.com', 'sales@closeplan.com'],
  },
  // Add more mock meetings...
]

export const mockStakeholders: Stakeholder[] = [
  {
    id: '1',
    name: 'Dr. Sarah Chen',
    email: 'schen@cityhospital.com',
    role: 'ECONOMIC_BUYER',
    organization: 'City Hospital',
    department: 'Executive',
    phone: '555-0123',
    deals: ['1']
  },
  // Add more stakeholders...
]

export const mockDocuments: Document[] = [
  {
    id: '1',
    name: 'Technical Requirements.pdf',
    type: 'PDF',
    size: 2500000,
    uploadedAt: new Date('2024-02-01'),
    uploadedBy: 'sales@closeplan.com',
    dealId: '1',
    folder: '/technical',
    version: 1
  },
  // Add more documents...
]

// Add more mock meetings to existing mockMeetings... 