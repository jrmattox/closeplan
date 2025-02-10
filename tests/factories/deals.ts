import { nanoid } from 'nanoid'
import { 
  Deal, 
  DealStage, 
  Department, 
  ComplianceStatus, 
  ClinicalValidation,
  ComplianceChecks,
  Customer,
  Product
} from '@/lib/types'

// Stage-specific configurations with healthcare requirements
const STAGE_CONFIGS = {
  [DealStage.DISCOVERY]: {
    probability: 20,
    minStakeholders: 1,
    requiredDocs: ['INITIAL_ASSESSMENT'],
    requiresCompliance: false,
    requiresClinicalValidation: false
  },
  [DealStage.CLINICAL_VALIDATION]: {
    probability: 40,
    minStakeholders: 2,
    requiredDocs: ['CLINICAL_VALIDATION', 'WORKFLOW_ASSESSMENT'],
    requiresCompliance: true,
    requiresClinicalValidation: true
  },
  [DealStage.TECHNICAL_VALIDATION]: {
    probability: 60,
    minStakeholders: 2,
    requiredDocs: ['TECHNICAL_SPEC', 'SECURITY_ASSESSMENT'],
    requiresCompliance: true,
    requiresClinicalValidation: false
  },
  [DealStage.VALUE_PROPOSITION]: {
    probability: 70,
    minStakeholders: 3,
    requiredDocs: ['ROI_ANALYSIS', 'PROPOSAL'],
    requiresCompliance: true,
    requiresClinicalValidation: true
  },
  [DealStage.PROCUREMENT]: {
    probability: 80,
    minStakeholders: 3,
    requiredDocs: ['CONTRACT', 'HIPAA_COMPLIANCE'],
    requiresCompliance: true,
    requiresClinicalValidation: true
  }
} as const

const DEFAULT_CLINICAL_VALIDATION: ClinicalValidation = {
  completed: false,
  requiredDocuments: [],
  validatedBy: null,
  validationDate: null,
  clinicalTrialReference: null,
  notes: []
}

const DEFAULT_COMPLIANCE_CHECKS: ComplianceChecks = {
  hipaaCompliant: false,
  hitrustCertified: false,
  fdaApproved: false,
  lastAuditDate: '',
  requiredCertifications: [],
  deviceCertification: false,
  clinicalTrialRequired: false,
  irb_approval: false
}

/**
 * Department-specific required documents
 */
const departmentDocuments: Record<Department, string[]> = {
  [Department.CARDIOLOGY]: ['CARDIAC_EFFICACY_STUDY', 'DEVICE_CERTIFICATION'],
  [Department.ORTHOPEDICS]: ['BIOMECHANICAL_STUDY', 'CLINICAL_TRIALS'],
  [Department.ONCOLOGY]: ['TUMOR_RESPONSE_DATA', 'SURVIVAL_ANALYSIS'],
  [Department.NEUROLOGY]: ['NEUROLOGICAL_ASSESSMENT', 'SAFETY_STUDY'],
  [Department.EMERGENCY]: ['RAPID_DEPLOYMENT_STUDY', 'EMERGENCY_PROTOCOLS']
}

/**
 * Base compliance requirements for all deals
 */
const baseComplianceChecks: ComplianceChecks = {
  hipaaCompliant: true,
  hitrustCertified: false,
  fdaApproved: true,
  lastAuditDate: new Date().toISOString(),
  requiredCertifications: [],
  deviceCertification: false,
  clinicalTrialRequired: false,
  irb_approval: false
}

/**
 * Helper Functions
 */
const generateId = (prefix: string): string => 
  `${prefix}-${nanoid(9)}`

const createDateOffset = (daysOffset: number): string => 
  new Date(Date.now() + daysOffset * 24 * 60 * 60 * 1000).toISOString()

const getRandomEnum = <T>(enumObj: T): T[keyof T] => {
  const values = Object.values(enumObj)
  return values[Math.floor(Math.random() * values.length)]
}

/**
 * Creates default clinical validation based on department
 */
function createClinicalValidation(department: Department): ClinicalValidation {
  return {
    completed: false,
    requiredDocuments: departmentDocuments[department],
    validatedBy: null,
    validationDate: null,
    clinicalTrialReference: null,
    notes: [{
      id: generateId('note'),
      content: 'Initial validation setup',
      createdAt: new Date().toISOString(),
      author: 'system'
    }]
  }
}

/**
 * Creates a base healthcare deal
 */
export function createDeal(overrides: Partial<Deal> = {}): Deal {
  const department = overrides.department || Department.CARDIOLOGY
  const now = new Date()
  
  const deal: Deal = {
    id: generateId('deal'),
    name: 'New Healthcare Solution Implementation',
    stage: DealStage.DISCOVERY,
    department,
    value: Math.floor(Math.random() * 1000000),
    probability: Math.random(),
    expectedCloseDate: createDateOffset(90),
    startDate: now,
    lastActivity: now,
    owner: generateId('user'),
    customer: 'Healthcare Provider',
    stakeholders: [],
    products: [],
    notes: '',
    clinicalValidation: createClinicalValidation(department),
    complianceChecks: {
      ...baseComplianceChecks,
      deviceCertification: department === Department.CARDIOLOGY,
      clinicalTrialRequired: department === Department.ONCOLOGY,
      irb_approval: department === Department.NEUROLOGY
    },
    complianceStatus: 'pending',
    documents: [...departmentDocuments[department]],
    implementationPlan: {
      technicalSetup: 21,
      clinicalTraining: 14,
      totalDuration: 35,
      milestones: [],
      risks: []
    },
    ...overrides
  }

  return deal
}

/**
 * Creates a deal in a specific stage with appropriate requirements
 */
export function createDealInStage(
  stage: DealStage,
  overrides?: Partial<Deal>
): Deal {
  const config = STAGE_CONFIGS[stage]
  const stakeholders = Array.from(
    { length: config.minStakeholders },
    () => generateId('stak')
  )

  return createDeal({
    stage,
    probability: config.probability,
    stakeholders,
    documents: [
      ...departmentDocuments[overrides?.department || Department.CARDIOLOGY],
      ...config.requiredDocs
    ],
    complianceStatus: config.requiresCompliance ? 'pending' : 'approved',
    ...overrides
  })
}

/**
 * Creates a department-specific deal with appropriate compliance requirements
 */
export function createDepartmentSpecificDeal(
  department: Department,
  stage: DealStage = DealStage.DISCOVERY
): Deal {
  const baseComplianceByDepartment: Partial<ComplianceChecks> = {
    [Department.CARDIOLOGY]: {
      fdaApproved: true,
      deviceCertification: true,
      requiredCertifications: ['FDA_CARDIAC_DEVICE', 'ISO_13485']
    },
    [Department.ONCOLOGY]: {
      clinicalTrialRequired: true,
      irb_approval: true,
      requiredCertifications: ['RADIATION_SAFETY', 'CLINICAL_TRIALS']
    },
    [Department.ORTHOPEDICS]: {
      deviceCertification: true,
      fdaApproved: true,
      requiredCertifications: ['FDA_ORTHOPEDIC_DEVICE']
    },
    [Department.NEUROLOGY]: {
      clinicalTrialRequired: true,
      irb_approval: true,
      requiredCertifications: ['NEUROLOGICAL_SAFETY']
    },
    [Department.EMERGENCY]: {
      fdaApproved: true,
      requiredCertifications: ['EMERGENCY_USE_AUTHORIZATION']
    }
  }[department] || {}

  return createDeal({
    department,
    stage,
    complianceChecks: {
      ...baseComplianceChecks,
      ...baseComplianceByDepartment
    },
    documents: [
      ...departmentDocuments[department],
      ...(STAGE_CONFIGS[stage]?.requiredDocs || [])
    ]
  })
}

/**
 * Helper to get department-specific certifications
 */
function getDepartmentCertifications(department: Department): string[] {
  const certifications: Record<Department, string[]> = {
    [Department.CARDIOLOGY]: ['CARDIAC_DEVICE_CERT', 'ISO_13485'],
    [Department.ORTHOPEDICS]: ['BIOMECHANICAL_CERT', 'MATERIAL_SAFETY'],
    [Department.ONCOLOGY]: ['RADIATION_SAFETY', 'CLINICAL_TRIAL_CERT'],
    [Department.NEUROLOGY]: ['NEUROLOGICAL_DEVICE_CERT', 'BRAIN_STIM_CERT'],
    [Department.EMERGENCY]: ['EMERGENCY_DEVICE_CERT', 'RAPID_RESPONSE_CERT']
  }

  return certifications[department] || []
}

/**
 * Creates a fully compliant deal with completed validations
 */
export function createCompliantDeal(overrides: Partial<Deal> = {}): Deal {
  const department = overrides.department || Department.CARDIOLOGY
  const now = new Date().toISOString()
  
  return createDeal({
    stage: DealStage.CONTRACT_REVIEW,
    complianceChecks: {
      ...baseComplianceChecks,
      hipaaCompliant: true,
      hitrustCertified: true,
      fdaApproved: true,
      lastAuditDate: now,
      requiredCertifications: [
        'HIPAA_COMPLIANCE',
        'HITRUST_CERTIFICATION',
        'FDA_APPROVAL',
        ...getDepartmentCertifications(department)
      ]
    },
    clinicalValidation: {
      ...createClinicalValidation(department),
      completed: true,
      validatedBy: 'Dr. Smith',
      validationDate: now,
      notes: [
        {
          id: nanoid(8),
          content: 'Clinical validation completed successfully',
          createdAt: now,
          author: 'Dr. Smith'
        }
      ]
    },
    documents: [
      ...departmentDocuments[department],
      'HIPAA_ATTESTATION',
      'SECURITY_ASSESSMENT',
      'COMPLIANCE_CHECKLIST',
      'VALIDATION_REPORT'
    ],
    ...overrides
  })
}

/**
 * Creates a deal with specific clinical trial requirements
 */
export function createClinicalTrialDeal(
  department: Department = Department.ONCOLOGY
): Deal {
  const now = new Date().toISOString()

  return createDeal({
    department,
    stage: DealStage.CLINICAL_VALIDATION,
    clinicalValidation: {
      completed: false,
      requiredDocuments: [
        'TRIAL_PROTOCOL',
        'IRB_APPROVAL',
        'PATIENT_CONSENT_FORMS',
        'SAFETY_MONITORING_PLAN'
      ],
      validatedBy: null,
      validationDate: null,
      clinicalTrialReference: `CT-${nanoid(6)}`,
      notes: [
        {
          id: nanoid(8),
          content: 'Clinical trial protocol submitted for IRB review',
          createdAt: now,
          author: 'Clinical Research Team'
        }
      ]
    },
    complianceChecks: {
      ...baseComplianceChecks,
      clinicalTrialRequired: true,
      irb_approval: false,
      requiredCertifications: [
        'GCP_CERTIFICATION',
        'HUMAN_SUBJECTS_RESEARCH',
        'TRIAL_INVESTIGATOR_CREDENTIALS'
      ]
    }
  })
}

/**
 * Creates a diverse set of healthcare deals across departments and stages
 */
export function createDealSet(count: number = 10): Deal[] {
  return Array.from({ length: count }, () => {
    const department = getRandomEnum(Department)
    const stage = getRandomEnum(DealStage)
    const isCompliant = Math.random() > 0.7
    const needsClinicalTrial = [Department.ONCOLOGY, Department.NEUROLOGY].includes(department)
    
    if (isCompliant) {
      return createCompliantDeal({ department, stage })
    }

    if (needsClinicalTrial) {
      return createClinicalTrialDeal(department)
    }

    return createDepartmentSpecificDeal(department, stage)
  })
}

/**
 * Creates multiple deals in a specific stage
 */
export function createDealsInStage(
  stage: DealStage,
  count: number = 5
): Deal[] {
  const departments = Object.values(Department)
  
  return Array.from({ length: count }, (_, index) => {
    const department = departments[index % departments.length]
    const config = STAGE_CONFIGS[stage]
    
    return createDeal({
      stage,
      department,
      probability: config.probability,
      stakeholders: Array.from(
        { length: config.minStakeholders },
        (_, i) => `stak_${nanoid(8)}_${i + 1}`
      ),
      documents: [
        ...departmentDocuments[department],
        ...config.requiredDocs
      ],
      complianceChecks: {
        ...baseComplianceChecks,
        hipaaCompliant: config.requiresCompliance,
        clinicalTrialRequired: [Department.ONCOLOGY, Department.NEUROLOGY].includes(department)
      }
    })
  })
}

/**
 * Creates a set of related deals in a department
 */
export function createDepartmentDealSet(
  department: Department,
  count: number = 3
): Deal[] {
  const stages = [
    DealStage.DISCOVERY,
    DealStage.CLINICAL_VALIDATION,
    DealStage.TECHNICAL_VALIDATION
  ]

  return Array.from({ length: count }, (_, index) => {
    const stage = stages[index % stages.length]
    const value = 250000 * (index + 1)

    return createDepartmentSpecificDeal(department, stage)
  })
}

/**
 * Configuration for creating a deal pipeline
 */
export interface DealPipelineConfig {
  totalDeals: number
  stageDistribution: Partial<Record<DealStage, number>>
  departmentFocus?: Department
}

/**
 * Creates a realistic deal pipeline with specified distribution
 */
export function createDealPipeline(config: DealPipelineConfig): Deal[] {
  const { totalDeals, stageDistribution, departmentFocus } = config
  const deals: Deal[] = []
  
  // Calculate actual numbers based on percentages
  const stageDeals = Object.entries(stageDistribution).reduce((acc, [stage, percentage]) => {
    acc[stage as DealStage] = Math.floor(totalDeals * (percentage / 100))
    return acc
  }, {} as Record<DealStage, number>)

  // Create deals for each stage
  Object.entries(stageDeals).forEach(([stage, count]) => {
    const stageEnum = stage as DealStage
    const baseValue = STAGE_CONFIGS[stageEnum]?.probability || 0

    for (let i = 0; i < count; i++) {
      const department = departmentFocus || getRandomEnum(Department)
      const isCompliant = stageEnum === DealStage.CONTRACT_REVIEW
      
      const deal = isCompliant 
        ? createCompliantDeal({ department, stage: stageEnum })
        : createDepartmentSpecificDeal(department, stageEnum)

      // Adjust values based on stage
      deals.push({
        ...deal,
        value: baseValue * 10000 * (1 + Math.random()),
        probability: baseValue + (Math.random() * 20)
      })
    }
  })

  return deals
}

// Example pipeline configurations
export const standardPipelineConfig: DealPipelineConfig = {
  totalDeals: 100,
  stageDistribution: {
    [DealStage.DISCOVERY]: 30,
    [DealStage.CLINICAL_VALIDATION]: 25,
    [DealStage.TECHNICAL_VALIDATION]: 20,
    [DealStage.CONTRACT_REVIEW]: 15,
    [DealStage.CLOSED_WON]: 7,
    [DealStage.CLOSED_LOST]: 3
  }
}

export const cardiologyPipelineConfig: DealPipelineConfig = {
  totalDeals: 100,
  stageDistribution: {
    [DealStage.DISCOVERY]: 30,
    [DealStage.CLINICAL_VALIDATION]: 25,
    [DealStage.TECHNICAL_VALIDATION]: 20,
    [DealStage.CONTRACT_REVIEW]: 15,
    [DealStage.CLOSED_WON]: 7,
    [DealStage.CLOSED_LOST]: 3
  },
  departmentFocus: Department.CARDIOLOGY
}

export const oncologyPipelineConfig: DealPipelineConfig = {
  totalDeals: 100,
  stageDistribution: {
    [DealStage.DISCOVERY]: 20,
    [DealStage.CLINICAL_VALIDATION]: 35,
    [DealStage.TECHNICAL_VALIDATION]: 25,
    [DealStage.CONTRACT_REVIEW]: 10,
    [DealStage.CLOSED_WON]: 5,
    [DealStage.CLOSED_LOST]: 5
  },
  departmentFocus: Department.ONCOLOGY
}

/**
 * Creates a deal with specified healthcare products
 */
export function createDealWithProducts(
  productCount: number = 1,
  overrides: Partial<Deal> = {}
): Deal {
  const products = Array.from({ length: productCount }, (_, index) => ({
    id: `prod-${nanoid(9)}`,
    name: `Healthcare Product ${index + 1}`,
    price: Math.floor(Math.random() * 50000),
    category: 'MEDICAL_DEVICE',
    regulatoryStatus: 'FDA_APPROVED'
  }))

  return createDeal({
    products,
    ...overrides
  })
}

// Healthcare-specific factories
export function createMedicalDeviceDeal(overrides?: Partial<Deal>): Deal {
  return createDeal({
    name: 'PACS System Upgrade',
    department: Department.CARDIOLOGY,
    value: 500000,
    clinicalValidation: createClinicalValidation(Department.CARDIOLOGY),
    complianceChecks: {
      ...baseComplianceChecks,
      deviceCertification: true,
      fdaApproved: true,
      requiredCertifications: ['FDA_DEVICE_CERT', 'ISO_13485']
    },
    ...overrides
  })
}

export function createEMRIntegrationDeal(overrides?: Partial<Deal>): Deal {
  return createDeal({
    name: 'EMR Integration Platform',
    department: Department.EMERGENCY,
    value: 750000,
    clinicalValidation: createClinicalValidation(Department.EMERGENCY),
    complianceChecks: {
      ...baseComplianceChecks,
      hitrustCertified: true,
      requiredCertifications: ['HITRUST_CERT', 'HL7_COMPLIANCE']
    },
    ...overrides
  })
}

export function createHighValueDeal(overrides?: Partial<Deal>): Deal {
  const department = overrides?.department || Department.ONCOLOGY
  
  return createDeal({
    value: 1000000,
    probability: 40,
    department,
    stakeholders: Array.from({ length: 5 }, (_, i) => `stak_${nanoid(8)}_${i + 1}`),
    clinicalValidation: {
      ...createClinicalValidation(department),
      completed: true,
      validatedBy: 'Dr. Sarah Chen',
      validationDate: new Date().toISOString()
    },
    ...overrides
  })
}

export function createComplianceFocusedDeal(overrides?: Partial<Deal>): Deal {
  const department = overrides?.department || Department.CARDIOLOGY
  const now = new Date().toISOString()

  return createDeal({
    name: 'Data Security Implementation',
    department,
    complianceStatus: 'pending',
    complianceChecks: {
      ...baseComplianceChecks,
      hipaaCompliant: true,
      hitrustCertified: true,
      lastAuditDate: now,
      requiredCertifications: [
        'HIPAA_COMPLIANCE',
        'HITRUST_CERTIFICATION',
        'SOC2_COMPLIANCE'
      ]
    },
    documents: [
      ...departmentDocuments[department],
      'HIPAA_ATTESTATION',
      'SECURITY_ASSESSMENT',
      'DATA_PROTECTION_PLAN',
      'ACCESS_CONTROL_DOCS'
    ],
    ...overrides
  })
}

// Helper for creating related deals
export function createRelatedDeals(
  baseDeal: Deal,
  count: number = 2
): Deal[] {
  return Array.from({ length: count }, () => 
    createDeal({
      department: baseDeal.department,
      stakeholders: [...baseDeal.stakeholders],
      clinicalValidation: {
        ...baseDeal.clinicalValidation,
        approver: baseDeal.clinicalValidation?.approver
      }
    })
  )
} 