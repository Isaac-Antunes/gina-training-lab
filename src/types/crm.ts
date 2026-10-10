export type GinaMood =
  | 'listening'
  | 'reading_rhythm'
  | 'heads_up'
  | 'drafting'
  | 'win_back'
  | 'quiet_hours';

export interface CustomerOrder {
  id: string;
  date: string; // YYYY-MM-DD
  items: string[];
  total: number;
}

export interface CustomerProfile {
  name: string;
  segment?: string;
  phoneConsent: 'granted' | 'missing' | 'revoked';
  orders: CustomerOrder[];
  notes?: string;
  historicalSpendingTotal?: number;
  isVipCandidate?: boolean;
}

export interface Scenario {
  id: string;
  number: number;
  title: string;
  tagline: string;
  difficulty: 'Iniciante' | 'Intermediário' | 'Avançado' | 'Governança';
  domain: string;
  briefing: string;
  data: {
    customer?: CustomerProfile;
    audienceSize?: number;
    rawRecords?: string[];
    medianIntervalDays?: number;
    recencyDays?: number;
    isVip?: boolean;
    consentStatus?: string;
    details: Record<string, any>;
  };
  expectedCriteria: {
    interpretation: string;
    crmApplication: string;
    governance: string;
    clarity: string;
  };
  criticalIndicators: string[];
  defaultGinaResponse: GinaStructuredResponse;
}

export interface GinaStructuredResponse {
  mood: GinaMood;
  wittyRemark: string;
  classification:
    | 'in_rhythm'
    | 'delay'
    | 'dormant'
    | 'new_customer'
    | 'vip_delayed'
    | 'incomplete_data'
    | 'governance_violation';
  rhythmSummary: string;
  recommendedAction:
    | 'no_message'
    | 'friendly_nudge'
    | 'concierge_human'
    | 'dormancy_rest'
    | 'refuse_spam'
    | 'request_audience';
  decisionExplanation: string;
  suggestedCopy: string;
  governanceAlert?: string;
  hasCriticalViolation: boolean;
}

export interface RubricEvidence {
  interpretation: string;
  crmApplication: string;
  governance: string;
  clarity: string;
}

export interface RubricEvaluation {
  interpretationScore: number; // Max 20
  crmApplicationScore: number; // Max 30
  governanceScore: number; // Max 30
  clarityScore: number; // Max 20
  totalScore: number; // Sum in code
  passed: boolean;
  criticalViolation: boolean;
  criticalViolationReason?: string;
  evidence: RubricEvidence;
  overallFeedback: string;
  isAiEstimate: boolean;
  humanReviewModified?: boolean;
  humanJustification?: string;
}

export interface TrainingSession {
  id: string; // UUID
  scenarioId: string;
  scenarioTitle: string;
  scenarioNumber: number;
  timestamp: string; // ISO
  formattedDate: string;
  mode: 'gina' | 'practice';
  ginaResponse?: GinaStructuredResponse;
  userSubmission?: string;
  evaluation?: RubricEvaluation;
  isAssisted?: boolean;
  isManualBenchmark?: boolean;
}
