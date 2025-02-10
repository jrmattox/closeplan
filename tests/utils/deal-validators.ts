import { Deal, DealStage, Department, ComplianceChecks } from '@/lib/types'
import { departmentDocuments } from '../factories/deals'

/**
 * Validates deal compliance based on stage and department requirements
 */
export function validateDealCompliance(deal: Deal): boolean {
  const { stage, complianceChecks, clinicalValidation, department } = deal
  
  // Basic compliance checks
  if (!complianceChecks.hipaaCompliant) return false
  
  // Department-specific validation
  const departmentValidation = validateDepartmentCompliance(department, complianceChecks)
  if (!departmentValidation) return false
  
  // Stage-specific validation
  switch (stage) {
    case DealStage.CLINICAL_VALIDATION:
      return clinicalValidation.completed && 
             clinicalValidation.validatedBy !== null

    case DealStage.CONTRACT_REVIEW:
      return complianceChecks.hipaaCompliant && 
             complianceChecks.hitrustCertified

    case DealStage.CLOSED_WON:
      return complianceChecks.hipaaCompliant && 
             complianceChecks.fdaApproved &&
             clinicalValidation.completed

    default:
      return true
  }
}

/**
 * Validates department-specific compliance requirements
 */
function validateDepartmentCompliance(
  department: Department,
  complianceChecks: ComplianceChecks
): boolean {
  switch (department) {
    case Department.CARDIOLOGY:
    case Department.ORTHOPEDICS:
      return complianceChecks.deviceCertification && 
             complianceChecks.fdaApproved

    case Department.ONCOLOGY:
    case Department.NEUROLOGY:
      return complianceChecks.clinicalTrialRequired && 
             complianceChecks.irb_approval

    case Department.EMERGENCY:
      return complianceChecks.fdaApproved

    default:
      return true
  }
}

/**
 * Validates required documents are present for department and stage
 */
export function validateDealDocuments(deal: Deal): boolean {
  const { department, stage, clinicalValidation, documents } = deal
  
  // Check department-specific documents
  const requiredDocs = departmentDocuments[department]
  const hasDepartmentDocs = requiredDocs.every(doc => 
    documents.includes(doc) || clinicalValidation.requiredDocuments.includes(doc)
  )
  if (!hasDepartmentDocs) return false

  // Check stage-specific documents
  const stageValidation = validateStageDocuments(stage, documents)
  return stageValidation
}

/**
 * Validates stage-specific document requirements
 */
function validateStageDocuments(stage: DealStage, documents: string[]): boolean {
  const stageRequirements: Record<DealStage, string[]> = {
    [DealStage.CLINICAL_VALIDATION]: [
      'CLINICAL_VALIDATION',
      'WORKFLOW_ASSESSMENT'
    ],
    [DealStage.CONTRACT_REVIEW]: [
      'HIPAA_ATTESTATION',
      'SECURITY_ASSESSMENT'
    ],
    [DealStage.CLOSED_WON]: [
      'FINAL_APPROVAL',
      'IMPLEMENTATION_PLAN'
    ]
  }

  const requiredDocs = stageRequirements[stage]
  return requiredDocs ? requiredDocs.every(doc => documents.includes(doc)) : true
}

/**
 * Validates complete deal structure and requirements
 */
export function validateDeal(deal: Deal): { 
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  // Validate compliance
  if (!validateDealCompliance(deal)) {
    errors.push('Deal does not meet compliance requirements')
  }

  // Validate documents
  if (!validateDealDocuments(deal)) {
    errors.push('Missing required documents')
  }

  // Validate clinical validation
  if (deal.stage >= DealStage.CLINICAL_VALIDATION && !deal.clinicalValidation.completed) {
    errors.push('Clinical validation incomplete for current stage')
  }

  // Validate stakeholders
  if (deal.stakeholders.length === 0) {
    errors.push('Deal requires at least one stakeholder')
  }

  return {
    valid: errors.length === 0,
    errors
  }
} 