import { Document, DocumentType } from '@/lib/types'

export const DOCUMENT_TYPES: Record<DocumentType, string> = {
  CLINICAL_VALIDATION: 'Clinical Validation Report',
  TECHNICAL_SPEC: 'Technical Specification',
  SECURITY_ASSESSMENT: 'Security Assessment',
  PROPOSAL: 'Solution Proposal',
  CONTRACT: 'Contract',
  ROI_ANALYSIS: 'ROI Analysis',
  IMPLEMENTATION_PLAN: 'Implementation Plan',
  HIPAA_COMPLIANCE: 'HIPAA Compliance',
  DATA_SPECS: 'Data Specifications'
}

export const mockDocuments: Document[] = [
  {
    id: 'doc_1',
    name: 'EMR Integration Security Assessment.pdf',
    type: 'SECURITY_ASSESSMENT',
    size: 2.5 * 1024 * 1024, // 2.5MB
    uploadedAt: new Date('2024-02-01'),
    uploadedBy: 'user_1',
    dealId: 'deal_1',
    folder: '/technical/security',
    version: 1,
    status: 'APPROVED',
    approvedBy: 'stak_2',
    approvedAt: new Date('2024-02-03')
  },
  {
    id: 'doc_2',
    name: 'Clinical Workflow Analysis.pdf',
    type: 'CLINICAL_VALIDATION',
    size: 1.8 * 1024 * 1024,
    uploadedAt: new Date('2024-02-02'),
    uploadedBy: 'user_1',
    dealId: 'deal_1',
    folder: '/clinical',
    version: 2,
    status: 'IN_REVIEW',
    reviewers: ['stak_1', 'stak_3']
  }
] 