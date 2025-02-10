import { Meeting, MeetingType } from '@/lib/types'

export const MEETING_TYPES: Record<MeetingType, string> = {
  DISCOVERY: 'Initial Assessment',
  TECHNICAL_REVIEW: 'Technical Deep Dive',
  CLINICAL_REVIEW: 'Clinical Workflow Review',
  SECURITY_REVIEW: 'Security Assessment',
  STAKEHOLDER_REVIEW: 'Stakeholder Alignment',
  CONTRACT_REVIEW: 'Contract Discussion',
  IMPLEMENTATION_PLANNING: 'Implementation Planning'
}

export const mockMeetings: Meeting[] = [
  {
    id: 'meet_1',
    title: 'EMR Integration Technical Review',
    type: 'TECHNICAL_REVIEW',
    datetime: new Date('2024-02-15T14:00:00'),
    duration: 90, // minutes
    dealId: 'deal_1',
    location: 'Virtual',
    attendees: ['stak_1', 'stak_2'],
    agenda: [
      'System architecture review',
      'Integration requirements',
      'Security protocols'
    ],
    notes: 'Focus on HL7 FHIR compliance requirements',
    status: 'SCHEDULED',
    documents: ['doc_1']
  },
  {
    id: 'meet_2',
    title: 'Clinical Workflow Assessment',
    type: 'CLINICAL_REVIEW',
    datetime: new Date('2024-02-20T10:00:00'),
    duration: 60,
    dealId: 'deal_1',
    location: 'City Hospital - Conference Room A',
    attendees: ['stak_1', 'stak_3'],
    agenda: [
      'Current workflow review',
      'Pain points discussion',
      'Solution benefits'
    ],
    notes: 'Prepare department-specific workflow diagrams',
    status: 'SCHEDULED',
    documents: ['doc_2']
  }
] 