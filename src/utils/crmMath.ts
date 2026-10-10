/**
 * Deterministic CRM & Lifecycle Mathematics Engine for Gina Training Lab
 * Product of Isaac Antunes
 */

export interface CrmCalculationResult {
  medianIntervalDays: number | null;
  meanIntervalDays?: number | null;
  recencyDays: number;
  frequency: number;
  distinctDaysCount: number;
  ratio: number | null;
  isVip: boolean;
  classification:
    | 'in_rhythm'
    | 'delay'
    | 'dormant'
    | 'new_customer'
    | 'oneoff_delayed'
    | 'vip_delayed'
    | 'incomplete_data'
    | 'governance_violation'
    | 'invalid_input';
  recommendedAction:
    | 'no_message'
    | 'friendly_nudge'
    | 'concierge_human'
    | 'dormancy_rest'
    | 'refuse_spam'
    | 'request_audience'
    | 'reject_invalid';
  explanation: string;
  hasSufficientData: boolean;
  ignoredContactsCount?: number;
}

export interface CustomerRankingItem {
  id: string;
  name: string;
  orderCount: number;
  totalSpending: number;
}

export interface DiscountMarginAnalysis {
  originalPrice: number;
  unitCost: number;
  discountPercent: number;
  discountedPrice: number;
  unitMargin: number;
  marginPercent: number;
  isNegativeMargin: boolean;
  recommendation: 'approve' | 'reject_negative_margin' | 'require_cost_data';
  explanation: string;
}

/**
 * Calculates median of an array of numbers.
 * Even count: average of two midpoints rounded to 1 decimal place.
 * Odd count: exact middle element.
 */
export function calculateMedian(numbers: number[]): number | null {
  if (!numbers || numbers.length === 0) return null;
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return Math.round(((sorted[mid - 1] + sorted[mid]) / 2) * 10) / 10;
  }
  return sorted[mid];
}

/**
 * Calculates arithmetic mean (for comparison with median in outlier detection)
 */
export function calculateMean(numbers: number[]): number | null {
  if (!numbers || numbers.length === 0) return null;
  const sum = numbers.reduce((acc, n) => acc + n, 0);
  return Math.round((sum / numbers.length) * 10) / 10;
}

/**
 * Parse an ISO/Date string into UTC epoch day integer to ensure timezone neutrality
 */
export function parseDateToUtcDay(dateStr: string): number {
  if (!dateStr || typeof dateStr !== 'string') return NaN;
  // Match YYYY-MM-DD
  const parts = dateStr.trim().split('T')[0].split('-');
  if (parts.length !== 3) return NaN;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  if (isNaN(year) || isNaN(month) || isNaN(day)) return NaN;
  if (month < 0 || month > 11 || day < 1 || day > 31) return NaN;

  return Date.UTC(year, month, day);
}

/**
 * Evaluates customer purchasing rhythm deterministically.
 * Follows exact domain rules:
 * - Recency <= 1.5x median => in_rhythm / no_message
 * - 1.5x < Recency <= 3.0x => delay / friendly_nudge (or vip_delayed / concierge_human if VIP)
 * - Recency > 3.0x => dormant / dormancy_rest (even for VIP!)
 * - If 3 or more ignored contacts, dormancy rest applies immediately
 * - 1 purchase: recency <= 30 => new_customer / friendly_nudge (boas-vindas); recency >= 31 => oneoff_delayed / friendly_nudge
 * - Multiple purchases on the same calendar day count as multiple orders for frequency,
 *   but only 1 unique day for interval calculation.
 * - Future dates or invalid inputs are rejected with invalid_input.
 */
export function evaluateDeterministicCrm({
  orderDates,
  currentDate = new Date('2026-10-03T00:00:00Z'),
  historicalSpending = 0,
  isVipTier = false,
  consent = 'granted',
  recentIgnoredContacts = 0,
}: {
  orderDates: string[]; // YYYY-MM-DD
  currentDate?: Date;
  historicalSpending?: number;
  isVipTier?: boolean;
  consent?: 'granted' | 'missing' | 'revoked';
  recentIgnoredContacts?: number;
}): CrmCalculationResult {
  // Validate spending & inputs
  if (typeof historicalSpending === 'number' && (isNaN(historicalSpending) || historicalSpending < 0)) {
    return {
      medianIntervalDays: null,
      recencyDays: 0,
      frequency: 0,
      distinctDaysCount: 0,
      ratio: null,
      isVip: false,
      classification: 'invalid_input',
      recommendedAction: 'reject_invalid',
      explanation: 'Valor de gasto histórico inválido (NaN ou negativo).',
      hasSufficientData: false,
    };
  }

  // Consent governance check first - revoked blocks even VIP
  if (consent === 'revoked') {
    return {
      medianIntervalDays: null,
      recencyDays: 0,
      frequency: orderDates.length,
      distinctDaysCount: 0,
      ratio: null,
      isVip: isVipTier,
      classification: 'governance_violation',
      recommendedAction: 'refuse_spam',
      explanation:
        'Consentimento revogado pelo titular (opt-out). Bloqueio absoluto de qualquer comunicação direta, independentemente de ser cliente VIP ou do valor histórico.',
      hasSufficientData: true,
    };
  }

  if (consent === 'missing') {
    return {
      medianIntervalDays: null,
      recencyDays: 0,
      frequency: orderDates.length,
      distinctDaysCount: 0,
      ratio: null,
      isVip: isVipTier,
      classification: 'governance_violation',
      recommendedAction: 'refuse_spam',
      explanation:
        'Ausência de consentimento prévio documentado. Pede confirmação/autorização explícita em canal próprio antes de qualquer contato.',
      hasSufficientData: true,
    };
  }

  const frequency = orderDates.length;
  if (frequency === 0) {
    return {
      medianIntervalDays: null,
      recencyDays: 0,
      frequency: 0,
      distinctDaysCount: 0,
      ratio: null,
      isVip: false,
      classification: 'incomplete_data',
      recommendedAction: 'request_audience',
      explanation: 'Sem compras registradas na base para este cliente.',
      hasSufficientData: false,
    };
  }

  const currentUtcDay = Date.UTC(
    currentDate.getUTCFullYear(),
    currentDate.getUTCMonth(),
    currentDate.getUTCDate()
  );

  // Parse all dates to UTC days, check for invalid or future dates
  const utcDays: number[] = [];
  for (const d of orderDates) {
    const utc = parseDateToUtcDay(d);
    if (isNaN(utc)) {
      return {
        medianIntervalDays: null,
        recencyDays: 0,
        frequency,
        distinctDaysCount: 0,
        ratio: null,
        isVip: isVipTier,
        classification: 'invalid_input',
        recommendedAction: 'reject_invalid',
        explanation: `Data de compra inválida detectada: "${d}".`,
        hasSufficientData: false,
      };
    }
    if (utc > currentUtcDay) {
      return {
        medianIntervalDays: null,
        recencyDays: 0,
        frequency,
        distinctDaysCount: 0,
        ratio: null,
        isVip: isVipTier,
        classification: 'invalid_input',
        recommendedAction: 'reject_invalid',
        explanation: `Data futura de compra rejeitada: "${d}" é posterior à data atual de referência.`,
        hasSufficientData: false,
      };
    }
    utcDays.push(utc);
  }

  // Sort ascending
  utcDays.sort((a, b) => a - b);

  // Group unique distinct calendar days (two orders on the same day count as 1 distinct day for gaps)
  const uniqueUtcDays = Array.from(new Set(utcDays)).sort((a, b) => a - b);
  const distinctDaysCount = uniqueUtcDays.length;

  const msPerDay = 1000 * 60 * 60 * 24;
  const lastPurchaseUtc = uniqueUtcDays[uniqueUtcDays.length - 1];
  const recencyDays = Math.max(0, Math.round((currentUtcDay - lastPurchaseUtc) / msPerDay));

  // If only 1 distinct purchase day
  if (distinctDaysCount === 1) {
    if (recencyDays <= 30) {
      return {
        medianIntervalDays: null,
        recencyDays,
        frequency,
        distinctDaysCount: 1,
        ratio: null,
        isVip: false,
        classification: 'new_customer',
        recommendedAction: 'friendly_nudge',
        explanation: `Cliente novo (${frequency} pedido${frequency > 1 ? 's' : ''} em 1 único dia de compra) com recência de ${recencyDays} dias (≤ 30 dias). Recomendada mensagem de boas-vindas / satisfação, sem inferir intervalo mediano.`,
        hasSufficientData: false,
      };
    } else {
      return {
        medianIntervalDays: null,
        recencyDays,
        frequency,
        distinctDaysCount: 1,
        ratio: null,
        isVip: false,
        classification: 'oneoff_delayed',
        recommendedAction: 'friendly_nudge',
        explanation: `Cliente de compra única realizada há ${recencyDays} dias (> 30 dias). Recomendado estímulo à segunda compra para estabelecer o primeiro intervalo, sem inventar ritmo.`,
        hasSufficientData: false,
      };
    }
  }

  // Calculate gaps between distinct calendar days
  const intervals: number[] = [];
  for (let i = 1; i < uniqueUtcDays.length; i++) {
    const gap = Math.round((uniqueUtcDays[i] - uniqueUtcDays[i - 1]) / msPerDay);
    if (gap > 0) {
      intervals.push(gap);
    }
  }

  const median = calculateMedian(intervals) || 1;
  const mean = calculateMean(intervals);
  const ratio = Math.round((recencyDays / median) * 100) / 100;

  // Rule: Dormancy precedence over VIP outreach
  // If recent ignored contacts >= 3 OR ratio > 3.0: dormancy rest ALWAYS applies!
  if (recentIgnoredContacts >= 3 || ratio > 3.0) {
    const reasonDetail =
      recentIgnoredContacts >= 3
        ? `${recentIgnoredContacts} contatos anteriores foram ignorados sem resposta`
        : `a recência de ${recencyDays} dias ultrapassou 3.0x do ciclo habitual (${median} dias)`;

    return {
      medianIntervalDays: median,
      meanIntervalDays: mean,
      recencyDays,
      frequency,
      distinctDaysCount,
      ratio,
      isVip: isVipTier,
      ignoredContactsCount: recentIgnoredContacts,
      classification: 'dormant',
      recommendedAction: 'dormancy_rest',
      explanation: `Cliente em dormência (${reasonDetail}). A regra de descanso de 90 dias tem precedência absoluta${
        isVipTier ? ', inclusive para clientes VIP' : ''
      }, evitando descadastramento (opt-out) ou denúncia por spam.`,
      hasSufficientData: true,
    };
  }

  // VIP Logic in Delayed window (1.5x < ratio <= 3.0)
  if (isVipTier && ratio > 1.5 && ratio <= 3.0) {
    return {
      medianIntervalDays: median,
      meanIntervalDays: mean,
      recencyDays,
      frequency,
      distinctDaysCount,
      ratio,
      isVip: true,
      classification: 'vip_delayed',
      recommendedAction: 'concierge_human',
      explanation: `Cliente VIP (terço superior de pedidos e gasto) com atraso de ${ratio}x em relação ao ritmo mediano (${median} dias). Regra estrita: exige contato humano personalizado pelo dono/concierge, nunca disparo genérico de robô.`,
      hasSufficientData: true,
    };
  }

  // General Classification
  if (ratio <= 1.5) {
    return {
      medianIntervalDays: median,
      meanIntervalDays: mean,
      recencyDays,
      frequency,
      distinctDaysCount,
      ratio,
      isVip: isVipTier,
      classification: 'in_rhythm',
      recommendedAction: 'no_message',
      explanation: `Recência de ${recencyDays} dias está dentro do limite de 1.5x do ritmo habitual (${median} dias, razão ${ratio}x). Cliente em ritmo: NENHUMA mensagem enviada ("Menos ruído. Mais relevância.").`,
      hasSufficientData: true,
    };
  } else if (ratio <= 3.0) {
    return {
      medianIntervalDays: median,
      meanIntervalDays: mean,
      recencyDays,
      frequency,
      distinctDaysCount,
      ratio,
      isVip: isVipTier,
      classification: 'delay',
      recommendedAction: 'friendly_nudge',
      explanation: `Recência de ${recencyDays} dias está entre 1.5x e 3.0x do ciclo habitual (${median} dias, razão ${ratio}x). Janela de atraso: recomendado lembrete amigável baseado no histórico, sem desconto agressivo imediato.`,
      hasSufficientData: true,
    };
  } else {
    return {
      medianIntervalDays: median,
      meanIntervalDays: mean,
      recencyDays,
      frequency,
      distinctDaysCount,
      ratio,
      isVip: isVipTier,
      classification: 'dormant',
      recommendedAction: 'dormancy_rest',
      explanation: `Recência de ${recencyDays} dias ultrapassou 3.0x do ciclo habitual (${median} dias). Cliente dormente: aplicar regra de descanso de 90 dias sem disparos contínuos.`,
      hasSufficientData: true,
    };
  }
}

/**
 * Deterministic RFV Tier Classification (Rule of Thirds)
 * Strict requirement:
 * - Base must have at least 3 distinct ranked customers; small bases (<3) cannot infer VIP without inventing percentiles.
 * - Customer IDs are distinct (customers with same name are not merged).
 * - Ties follow standard competition ranking.
 * - VIP = top third in frequency AND top third in monetary spending.
 */
export function classifyCustomerVipTier({
  targetCustomerId,
  customers,
}: {
  targetCustomerId: string;
  customers: CustomerRankingItem[];
}): {
  isVip: boolean;
  frequencyRank: number;
  spendingRank: number;
  topThirdThreshold: number;
  baseSize: number;
  canDetermineVip: boolean;
  reason: string;
} {
  const baseSize = customers.length;
  if (baseSize < 3) {
    return {
      isVip: false,
      frequencyRank: 1,
      spendingRank: 1,
      topThirdThreshold: 1,
      baseSize,
      canDetermineVip: false,
      reason: `Base com apenas ${baseSize} cliente(s). A regra de terços exige no mínimo 3 clientes para definir o terço superior sem inventar percentis.`,
    };
  }

  const target = customers.find((c) => c.id === targetCustomerId);
  if (!target) {
    return {
      isVip: false,
      frequencyRank: -1,
      spendingRank: -1,
      topThirdThreshold: Math.ceil(baseSize / 3),
      baseSize,
      canDetermineVip: false,
      reason: `Cliente com ID "${targetCustomerId}" não encontrado na base.`,
    };
  }

  const topThirdCutoff = Math.ceil(baseSize / 3);

  // Sort by frequency descending (competition rank)
  const sortedByFreq = [...customers].sort((a, b) => b.orderCount - a.orderCount);
  let freqRank = 1;
  for (let i = 0; i < sortedByFreq.length; i++) {
    if (i > 0 && sortedByFreq[i].orderCount < sortedByFreq[i - 1].orderCount) {
      freqRank = i + 1;
    }
    if (sortedByFreq[i].id === target.id) break;
  }

  // Sort by spending descending (competition rank)
  const sortedBySpend = [...customers].sort((a, b) => b.totalSpending - a.totalSpending);
  let spendRank = 1;
  for (let i = 0; i < sortedBySpend.length; i++) {
    if (i > 0 && sortedBySpend[i].totalSpending < sortedBySpend[i - 1].totalSpending) {
      spendRank = i + 1;
    }
    if (sortedBySpend[i].id === target.id) break;
  }

  const isVip = freqRank <= topThirdCutoff && spendRank <= topThirdCutoff;

  return {
    isVip,
    frequencyRank: freqRank,
    spendingRank: spendRank,
    topThirdThreshold: topThirdCutoff,
    baseSize,
    canDetermineVip: true,
    reason: isVip
      ? `VIP confirmado: ranking #${freqRank} em frequência e #${spendRank} em gasto (ambos ≤ top ${topThirdCutoff} de ${baseSize} clientes).`
      : `Não-VIP: ranking frequência #${freqRank}, ranking gasto #${spendRank} (corte do terço superior é #${topThirdCutoff}).`,
  };
}

/**
 * Deterministic Margin Analysis for Promotion Proposals
 * Computes price after discount and unit margin.
 * Identifies negative margin before other fixed costs.
 */
export function calculateDiscountMargin({
  price,
  unitCost,
  discountPercent,
}: {
  price: number;
  unitCost: number;
  discountPercent: number;
}): DiscountMarginAnalysis {
  if (isNaN(price) || isNaN(unitCost) || isNaN(discountPercent) || price <= 0) {
    return {
      originalPrice: price,
      unitCost,
      discountPercent,
      discountedPrice: 0,
      unitMargin: 0,
      marginPercent: 0,
      isNegativeMargin: true,
      recommendation: 'require_cost_data',
      explanation: 'Dados de preço ou custo unitário ausentes ou inválidos.',
    };
  }

  const discountRate = discountPercent / 100;
  const discountedPrice = Math.round(price * (1 - discountRate) * 100) / 100;
  const unitMargin = Math.round((discountedPrice - unitCost) * 100) / 100;
  const marginPercent = Math.round((unitMargin / discountedPrice) * 1000) / 10;
  const isNegativeMargin = unitMargin < 0;

  let recommendation: 'approve' | 'reject_negative_margin' | 'require_cost_data' = 'approve';
  let explanation = '';

  if (isNegativeMargin) {
    recommendation = 'reject_negative_margin';
    explanation = `Desconto de ${discountPercent}% sobre preço de R$ ${price.toFixed(2)} resulta em preço de venda de R$ ${discountedPrice.toFixed(2)}. Com custo unitário de R$ ${unitCost.toFixed(2)}, a margem unitária é de R$ ${unitMargin.toFixed(2)} (PREJUÍZO de R$ ${Math.abs(unitMargin).toFixed(2)} por unidade vendida) antes mesmo de outros custos fixos e taxas. Desconto cego terminantemente reprovado.`;
  } else {
    explanation = `Desconto de ${discountPercent}% gera preço de R$ ${discountedPrice.toFixed(2)} e margem unitária positiva de R$ ${unitMargin.toFixed(2)} (${marginPercent}%).`;
  }

  return {
    originalPrice: price,
    unitCost,
    discountPercent,
    discountedPrice,
    unitMargin,
    marginPercent,
    isNegativeMargin,
    recommendation,
    explanation,
  };
}
