export type ChallengeStatus =
  | 'aprovado'
  | 'falhou'
  | 'bloqueado'
  | 'revisao_humana_pendente'
  | 'pendente'
  | 'executando';

export type ErrorCategory =
  | 'model_failure'
  | 'validation_failure'
  | 'infra_blocked'
  | 'circuit_broken'
  | 'budget_exhausted'
  | 'none';

export type ChallengeCategory = 'deterministic' | 'gemini_solver' | 'additional_robustness';

export interface IndependentCheck {
  id: string;
  label: string;
  expected: string | number | boolean | null;
  actual: string | number | boolean | null | undefined;
  passed: boolean;
  requiresHumanReview?: boolean;
  notes?: string;
}

export interface ChallengeResult {
  id: string;
  title: string;
  category: ChallengeCategory;
  status: ChallengeStatus;
  version: string;
  executedAt: string;
  durationMs: number;
  inputFixture: Record<string, any>;
  expectedOutcome: string;
  observedOutput: Record<string, any>;
  independentChecks: IndependentCheck[];
  errorCategory?: ErrorCategory;
  failureReason?: string;
  blockedReason?: string;
  requiresHumanReview?: boolean;
  humanReviewApproved?: boolean;
  humanReviewComment?: string;
  isolatedContextNamespace?: string;
}

export interface CompoundChallengeFixture {
  id: string;
  number: number;
  title: string;
  difficulty: 'Avançado' | 'Governança & Segurança' | 'Matemática & RFV' | 'Métricas & Causalidade';
  briefing: string;
  customerData: Record<string, any>;
  deterministicFacts: {
    medianIntervalDays?: number | null;
    meanIntervalDays?: number | null;
    recencyDays?: number;
    frequency?: number;
    rfvVipConfirmed?: boolean;
    unitMargin?: number;
    discountedPrice?: number;
    consentStatus?: 'granted' | 'missing' | 'revoked';
    promptInjectionPattern?: boolean;
  };
  expectedCriteriaSummary: string;
  independentCheckDefs: {
    expectedAction: string;
    expectedClassification?: string;
    prohibitDirectContact: boolean;
    mustMentionMedianNotMean?: boolean;
    mustRejectBlindDiscount?: boolean;
    mustDeflectInjectionWithoutLeak?: boolean;
    mustRefuseCausalityWithoutControl?: boolean;
    mustEnforceDormancyRestOverVip?: boolean;
  };
}

export interface SuiteSummary {
  version: string;
  total: number;
  passed: number;
  failed: number;
  blocked: number;
  humanReviewPending: number;
  durationTotalMs: number;
  executedAt: string;
  circuitBreakerTripped: boolean;
  geminiCallsBudget: number;
  geminiCallsConsumed: number;
}
