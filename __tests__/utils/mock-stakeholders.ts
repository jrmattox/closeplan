import { Stakeholder } from '@/lib/test-data'

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
  {
    id: '2',
    name: 'James Wilson',
    email: 'jwilson@cityhospital.com',
    role: 'IT',
    organization: 'City Hospital',
    department: 'Information Technology',
    phone: '555-0124',
    deals: ['1']
  }
]

export const mockOrganizations = [
  {
    id: '1',
    name: 'City Hospital',
    type: 'Healthcare',
    stakeholderCount: 5,
    activeDeals: 2
  },
  {
    id: '2',
    name: 'Regional Medical Center',
    type: 'Healthcare',
    stakeholderCount: 3,
    activeDeals: 1
  }
] 