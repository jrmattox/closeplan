import { Stakeholder } from '@/lib/types'

export const STAKEHOLDER_ROLES = {
  ECONOMIC_BUYER: 'Chief Medical Officer',
  TECHNICAL_BUYER: 'IT Director',
  CHAMPION: 'Department Head',
  INFLUENCER: 'Clinical Staff',
  USER: 'Healthcare Provider',
  PROCUREMENT: 'Procurement Officer',
  LEGAL: 'Legal Counsel',
  COMPLIANCE: 'Compliance Officer'
} as const

export const DEPARTMENTS = {
  EXECUTIVE: 'Executive Leadership',
  IT: 'Information Technology',
  CLINICAL: 'Clinical Operations',
  RADIOLOGY: 'Radiology',
  CARDIOLOGY: 'Cardiology',
  PROCUREMENT: 'Procurement',
  LEGAL: 'Legal & Compliance',
  FINANCE: 'Finance'
} as const

export const mockStakeholders: Stakeholder[] = [
  {
    id: 'stak_1',
    name: 'Dr. Sarah Chen',
    title: 'Chief Medical Officer',
    email: 'schen@cityhospital.com',
    phone: '555-0123',
    role: 'ECONOMIC_BUYER',
    department: DEPARTMENTS.EXECUTIVE,
    organization: 'City Hospital',
    deals: ['deal_1', 'deal_2'],
    notes: 'Key decision maker for EMR integration projects',
    lastContact: new Date('2024-02-01')
  },
  {
    id: 'stak_2',
    name: 'Michael Torres',
    title: 'IT Director',
    email: 'mtorres@cityhospital.com',
    phone: '555-0124',
    role: 'TECHNICAL_BUYER',
    department: DEPARTMENTS.IT,
    organization: 'City Hospital',
    deals: ['deal_1'],
    notes: 'Technical evaluator for system integration',
    lastContact: new Date('2024-02-03')
  },
  {
    id: 'stak_3',
    name: 'Dr. James Wilson',
    title: 'Head of Radiology',
    email: 'jwilson@cityhospital.com',
    phone: '555-0125',
    role: 'CHAMPION',
    department: DEPARTMENTS.RADIOLOGY,
    organization: 'City Hospital',
    deals: ['deal_2'],
    notes: 'Strong advocate for digital transformation',
    lastContact: new Date('2024-02-02')
  }
]

export const mockOrganizations = [
  {
    id: 'org_1',
    name: 'City Hospital',
    type: 'Hospital System',
    size: 'ENTERPRISE',
    location: 'New York, NY',
    stakeholderCount: 5,
    activeDeals: 2,
    annualRevenue: '$500M+',
    bedCount: 500
  },
  {
    id: 'org_2',
    name: 'Regional Medical Center',
    type: 'Healthcare Network',
    size: 'MID_MARKET',
    location: 'Boston, MA',
    stakeholderCount: 3,
    activeDeals: 1,
    annualRevenue: '$200M-500M',
    bedCount: 250
  }
] 