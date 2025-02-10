/**
 * Represents the possible stages in a healthcare sales deal lifecycle
 */
export enum DealStage {
  DISCOVERY = 'DISCOVERY',
  CLINICAL_VALIDATION = 'CLINICAL_VALIDATION',
  TECHNICAL_VALIDATION = 'TECHNICAL_VALIDATION',
  CONTRACT_REVIEW = 'CONTRACT_REVIEW',
  CLOSED_WON = 'CLOSED_WON',
  CLOSED_LOST = 'CLOSED_LOST'
}

/**
 * Represents a healthcare department or clinical area
 */
export enum Department {
  CARDIOLOGY = 'CARDIOLOGY',
  ORTHOPEDICS = 'ORTHOPEDICS',
  ONCOLOGY = 'ONCOLOGY',
  NEUROLOGY = 'NEUROLOGY',
  EMERGENCY = 'EMERGENCY'
}

/**
 * Represents the compliance status of a deal
 */
export type ComplianceStatus = 'pending' | 'approved' | 'rejected'

/**
 * Represents a clinical validation workflow
 */
export interface ClinicalValidation {
  completed: boolean
  requiredDocuments: string[]
  validatedBy: string | null
  validationDate: string | null
  clinicalTrialReference: string | null
  notes: Array<{
    id: string
    content: string
    createdAt: string
    author: string
  }>
}

/**
 * Represents an implementation plan for a healthcare solution
 */
export interface ImplementationPlan {
  technicalSetup: number
  clinicalTraining: number
  totalDuration: number
  milestones?: string[]
  risks?: string[]
}

/**
 * Represents a healthcare sales deal
 */
export interface Deal {
  /** Unique identifier for the deal */
  id: string

  /** Name of the deal/project */
  name: string

  /** Healthcare organization name */
  customer: string

  /** Deal value in USD */
  value: number

  /** Current stage in the sales cycle */
  stage: DealStage

  /** Probability of closing (0-100) */
  probability: number

  /** Expected close date */
  expectedCloseDate: Date

  /** Deal start date */
  startDate: Date

  /** Last activity timestamp */
  lastActivity: Date

  /** Deal owner (sales rep) */
  owner: string

  /** Array of stakeholder IDs */
  stakeholders: string[]

  /** Healthcare products/solutions */
  products: string[]

  /** Deal notes */
  notes: string

  /** Clinical validation details */
  clinicalValidation: ClinicalValidation

  /** Implementation planning */
  implementationPlan?: ImplementationPlan

  /** Department or clinical area */
  department: Department

  /** Compliance status */
  complianceStatus: ComplianceStatus

  /** Required documents */
  documents: string[]

  /** Healthcare compliance requirements and certifications */
  complianceChecks: ComplianceChecks
}

/**
 * Represents deal pipeline metrics
 */
export interface DealMetrics {
  pipeline: {
    /** Total pipeline value in USD */
    total: number

    /** Pipeline value by stage */
    byStage: Partial<Record<DealStage, number>>

    /** Overall pipeline probability */
    probability: number
  }
  activity: {
    /** Number of stakeholder meetings */
    meetings: number

    /** Number of deal documents */
    documents: number

    /** Number of active stakeholders */
    stakeholders: number
  }
  timeline: {
    /** Average sales cycle duration in days */
    avgSalesCycle: number

    /** Average time in current stage in days */
    avgTimeInStage: number
  }
}

/**
 * Healthcare-specific metrics
 */
export interface HealthcareMetrics {
  clinicalValidation: {
    avgDuration: number
    successRate: number
    pendingApprovals: number
  }
  compliance: {
    hipaaCompliance: number
    avgApprovalTime: number
    pendingReviews: number
  }
  implementation: {
    avgDuration: number
    trainingCompletion: number
    technicalReadiness: number
  }
}

/**
 * Deal component props
 */
export interface DealCardProps {
  deal: Deal
  onStatusChange: (dealId: string, newStatus: DealStage) => Promise<void>
  onEdit: (dealId: string) => void
}

export interface DealTableProps {
  deals: Deal[]
  stakeholders: string[]
  onDealSelect: (dealId: string) => void
  isLoading?: boolean
}

export interface DealMetricsProps {
  deals: Deal[]
  timeframe: 'week' | 'month' | 'quarter'
  department?: Department
}

/**
 * Healthcare compliance requirements and certifications
 */
export interface ComplianceChecks {
  hipaaCompliant: boolean
  hitrustCertified: boolean
  fdaApproved: boolean
  lastAuditDate: string
  requiredCertifications: string[]
  deviceCertification?: boolean
  clinicalTrialRequired?: boolean
  irb_approval?: boolean
} 