export enum DealStage {
  DISCOVERY = 'DISCOVERY',
  CLINICAL_VALIDATION = 'CLINICAL_VALIDATION',
  TECHNICAL_REVIEW = 'TECHNICAL_REVIEW',
  CONTRACT_NEGOTIATION = 'CONTRACT_NEGOTIATION',
  IMPLEMENTATION = 'IMPLEMENTATION',
  CLOSED_WON = 'CLOSED_WON',
  CLOSED_LOST = 'CLOSED_LOST'
}

export interface Deal {
  id: string;
  name: string;
  value: number;
  stage: DealStage;
  department: string;
  lastActivity: Date;
  stakeholders: string[];
  documents: string[];
  complianceStatus: 'pending' | 'approved' | 'rejected';
  probability: number;
  expectedCloseDate: Date;
  clinicalValidation?: {
    status: 'pending' | 'completed';
    duration: number;
    approver: string;
  };
  implementationPlan?: {
    technicalSetup: number;
    clinicalTraining: number;
    totalDuration: number;
  };
}

export interface DealMetrics {
  totalPipeline: number;
  winRate: number;
  avgDealSize: number;
  stageBreakdown: Record<DealStage, number>;
  timeInStage: Record<DealStage, number>;
  complianceRate: number;
  implementationMetrics: {
    avgDuration: number;
    successRate: number;
  };
} 