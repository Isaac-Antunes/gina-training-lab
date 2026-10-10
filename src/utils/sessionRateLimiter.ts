/**
 * Session Rate Limiter & Cost Control Manager
 * Product of Isaac Antunes - Gina Training Lab
 *
 * Enforces per-session request budgets and activates strict cooldown
 * blocks following 429 (quota exhaustion) or 503 (high demand) errors
 * to prevent aggressive cost overrun and wasteful retries.
 */

export interface SessionBudgetConfig {
  windowMs: number;
  maxRequestsPerWindow: number;
  maxAiCallsPerSession: number;
  baseCooldownMs: number;
  maxCooldownMs: number;
}

export const DEFAULT_BUDGET_CONFIG: SessionBudgetConfig = {
  windowMs: 10 * 60 * 1000, // 10 minutes
  maxRequestsPerWindow: 40, // Max 40 API requests per 10 min window
  maxAiCallsPerSession: 12, // Max 12 AI generation calls per session budget
  baseCooldownMs: 30 * 1000, // 30s base cooldown after 429/503
  maxCooldownMs: 120 * 1000, // 120s max cooldown
};

export interface SessionRateLimitState {
  sessionId: string;
  windowStartMs: number;
  requestCount: number;
  aiCallCount: number;
  cooldownUntilMs: number;
  consecutiveErrors: number;
  lastErrorCode?: number;
  lastErrorReason?: string;
}

export interface RateLimitCheckResult {
  allowed: boolean;
  statusCode?: 429 | 503;
  errorCode?: 'SESSION_COOLDOWN_ACTIVE' | 'SESSION_BUDGET_EXHAUSTED' | 'SESSION_RATE_LIMIT_EXCEEDED';
  errorMessage?: string;
  retryAfterSeconds?: number;
  budget: {
    requestsRemaining: number;
    aiCallsRemaining: number;
    cooldownRemainingMs: number;
    isCooldownActive: boolean;
  };
}

class SessionRateLimiter {
  private sessions = new Map<string, SessionRateLimitState>();
  private config: SessionBudgetConfig;

  constructor(config: Partial<SessionBudgetConfig> = {}) {
    this.config = { ...DEFAULT_BUDGET_CONFIG, ...config };
  }

  public getOrCreateSession(sessionId: string, nowMs = Date.now()): SessionRateLimitState {
    let session = this.sessions.get(sessionId);

    // If window expired, slide the window but preserve active cooldown if not yet expired
    if (!session || nowMs - session.windowStartMs > this.config.windowMs) {
      const activeCooldown = session && session.cooldownUntilMs > nowMs ? session.cooldownUntilMs : 0;
      const consecutiveErrors = session && activeCooldown > 0 ? session.consecutiveErrors : 0;

      session = {
        sessionId,
        windowStartMs: nowMs,
        requestCount: 0,
        aiCallCount: session ? session.aiCallCount : 0, // AI calls accumulate across sliding window per session
        cooldownUntilMs: activeCooldown,
        consecutiveErrors,
      };
      this.sessions.set(sessionId, session);
    }

    return session;
  }

  public checkRequest(sessionId: string, nowMs = Date.now()): RateLimitCheckResult {
    const session = this.getOrCreateSession(sessionId, nowMs);

    const isCooldownActive = session.cooldownUntilMs > nowMs;
    const cooldownRemainingMs = isCooldownActive ? session.cooldownUntilMs - nowMs : 0;
    const retryAfterSeconds = Math.ceil(cooldownRemainingMs / 1000);

    const requestsRemaining = Math.max(0, this.config.maxRequestsPerWindow - session.requestCount);
    const aiCallsRemaining = Math.max(0, this.config.maxAiCallsPerSession - session.aiCallCount);

    // 1. Check if session is under active cooldown from a previous 429/503
    if (isCooldownActive) {
      return {
        allowed: false,
        statusCode: 429,
        errorCode: 'SESSION_COOLDOWN_ACTIVE',
        errorMessage: `Período de resfriamento ativo para esta sessão após erro de cota ou alta demanda (${session.lastErrorCode || 429}). Novas chamadas bloqueadas temporariamente para controle de custos. Tente novamente em ${retryAfterSeconds}s.`,
        retryAfterSeconds,
        budget: {
          requestsRemaining,
          aiCallsRemaining,
          cooldownRemainingMs,
          isCooldownActive: true,
        },
      };
    }

    // 2. Check if AI call budget for the session is exhausted
    if (session.aiCallCount >= this.config.maxAiCallsPerSession) {
      return {
        allowed: false,
        statusCode: 429,
        errorCode: 'SESSION_BUDGET_EXHAUSTED',
        errorMessage: `Orçamento máximo de ${this.config.maxAiCallsPerSession} chamadas de IA atingido para esta sessão. O modo referencial de gabarito manual permanece disponível para continuidade dos seus estudos.`,
        retryAfterSeconds: 60,
        budget: {
          requestsRemaining,
          aiCallsRemaining: 0,
          cooldownRemainingMs: 0,
          isCooldownActive: false,
        },
      };
    }

    // 3. Check if general request window is exceeded
    if (session.requestCount >= this.config.maxRequestsPerWindow) {
      return {
        allowed: false,
        statusCode: 429,
        errorCode: 'SESSION_RATE_LIMIT_EXCEEDED',
        errorMessage: `Limite de ${this.config.maxRequestsPerWindow} requisições por janela atingido para esta sessão. Aguarde alguns instantes antes de enviar novos briefings.`,
        retryAfterSeconds: 30,
        budget: {
          requestsRemaining: 0,
          aiCallsRemaining,
          cooldownRemainingMs: 0,
          isCooldownActive: false,
        },
      };
    }

    // Request is allowed; increment request count
    session.requestCount++;

    return {
      allowed: true,
      budget: {
        requestsRemaining: Math.max(0, this.config.maxRequestsPerWindow - session.requestCount),
        aiCallsRemaining,
        cooldownRemainingMs: 0,
        isCooldownActive: false,
      },
    };
  }

  public recordAiCall(sessionId: string, nowMs = Date.now()): void {
    const session = this.getOrCreateSession(sessionId, nowMs);
    session.aiCallCount++;
    // Reset error count on successful AI call
    session.consecutiveErrors = 0;
  }

  /**
   * Called when an external AI call returns 429 (quota) or 503 (unavailable/demand)
   * Places the session into immediate exponential cooldown.
   */
  public reportFailure(
    sessionId: string,
    statusCode: number,
    reason?: string,
    nowMs = Date.now()
  ): number {
    const session = this.getOrCreateSession(sessionId, nowMs);
    session.consecutiveErrors++;
    session.lastErrorCode = statusCode;
    session.lastErrorReason = reason;

    // Exponential cooldown: 30s for 1st error, 60s for 2nd, 120s for 3rd+
    const multiplier = Math.pow(2, Math.min(2, session.consecutiveErrors - 1));
    const cooldownDuration = Math.min(this.config.maxCooldownMs, this.config.baseCooldownMs * multiplier);

    session.cooldownUntilMs = nowMs + cooldownDuration;
    return cooldownDuration;
  }

  public clearCooldown(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.cooldownUntilMs = 0;
      session.consecutiveErrors = 0;
    }
  }

  public resetSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  public getSessionState(sessionId: string, nowMs = Date.now()): SessionRateLimitState {
    return this.getOrCreateSession(sessionId, nowMs);
  }

  public pruneOldSessions(nowMs = Date.now()): void {
    for (const [id, session] of this.sessions.entries()) {
      if (nowMs - session.windowStartMs > this.config.windowMs * 2 && session.cooldownUntilMs <= nowMs) {
        this.sessions.delete(id);
      }
    }
  }
}

// Global singleton instance for the app
export const globalSessionRateLimiter = new SessionRateLimiter();
