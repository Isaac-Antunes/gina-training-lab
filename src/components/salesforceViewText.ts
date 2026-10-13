import type { GinaSalesforceCustomer } from '../integrations/salesforce/toGina';

/**
 * Textos da tela de ritmo (SalesforceView) nas duas línguas. O português é o
 * padrão do Lab; o inglês serve à vitrine pública. As decisões são as mesmas:
 * só a forma de dizer muda.
 */
export type Lang = 'pt' | 'en';
type Facts = GinaSalesforceCustomer['facts'];
type Action = Facts['recommendedAction'];
type Classification = Facts['classification'];

export const UI = {
  pt: {
    locale: 'pt-BR',
    demoEyebrow: 'Compra e recompra · exemplo lido da Salesforce',
    eyebrow: 'Gina na Salesforce',
    title: 'Ela lê o seu CRM.',
    intro:
      'Contatos e pedidos da Salesforce passam pelas regras do método Gina Intell: ritmo pela mediana, recência, VIP pela regra dos terços e consentimento. A Gina lê e decide; o envio é sempre uma decisão do time.',
    demoSource: 'Dados fictícios no formato Contact + Order da Salesforce',
    orgSource: 'Lido da sua org Salesforce',
    reference: 'Referência',
    readOnly: 'Somente leitura',
    stats: ['Pedidos', 'Gasto', 'Ritmo', 'Última'],
    xRhythm: 'x o ritmo',
    noOrders: 'Sem pedidos registrados',
    summary: 'Resumo das decisões',
    createTask: 'Criar tarefa para o time',
    preview: 'Prévia: na sua org, esta tarefa iria para o time',
    created: 'Tarefa criada para o time',
    exists: 'Já existe uma tarefa da Gina aberta',
    openInSalesforce: 'Abrir na Salesforce',
  },
  en: {
    locale: 'en-US',
    demoEyebrow: 'Purchase and repeat · example read from Salesforce',
    eyebrow: 'Gina on Salesforce',
    title: 'She reads your CRM.',
    intro:
      "Salesforce contacts and orders go through the Gina Intell rules: rhythm by the median, recency, VIP by the top-third rule, and consent. Gina reads and decides; sending is always your team's call.",
    demoSource: 'Made-up data in the Salesforce Contact + Order format',
    orgSource: 'Read from your Salesforce org',
    reference: 'Reference date',
    readOnly: 'Read-only',
    stats: ['Orders', 'Spent', 'Rhythm', 'Last'],
    xRhythm: 'x their rhythm',
    noOrders: 'No orders on record',
    summary: 'Decision summary',
    createTask: 'Create a task for your team',
    preview: 'Preview: in your org, this task would go to your team',
    created: 'Task created for your team',
    exists: "There's already an open Gina task",
    openInSalesforce: 'Open in Salesforce',
  },
} as const;

export const ACTION_EN: Record<Action, { label: string; next: string }> = {
  no_message: { label: 'No message', next: "Smart silence: they're on their own rhythm." },
  friendly_nudge: { label: 'Friendly reminder', next: 'Gina drafts the reminder and it goes into the approval queue.' },
  concierge_human: { label: 'Personal contact', next: 'VIP: someone from the shop reaches out in person, no automation.' },
  dormancy_rest: { label: '90-day rest', next: 'No messages for 90 days, so it never turns into spam or an opt-out.' },
  refuse_spam: { label: "Don't contact", next: 'Blocked by consent. No message, not even for a VIP.' },
  request_audience: { label: 'Ask for audience', next: 'Define the audience before any action.' },
  reject_invalid: { label: 'Invalid record', next: 'Fix the record in Salesforce before deciding.' },
};

export const NUDGE_EN: Partial<Record<Classification, { label: string; next: string }>> = {
  new_customer: { label: 'Welcome', next: 'Gina gets the welcome ready for your team to review.' },
  oneoff_delayed: { label: 'Nudge a 2nd purchase', next: 'Gina suggests a reason to come back; your team decides if and when to send it.' },
};

export const CLASSIFICATION_EN: Record<Classification, string> = {
  in_rhythm: 'In rhythm',
  delay: 'Late',
  dormant: 'Dormant',
  new_customer: 'New customer',
  oneoff_delayed: 'One-time buyer, late',
  vip_delayed: 'VIP, late',
  incomplete_data: 'Not enough data',
  governance_violation: 'Consent block',
  invalid_input: 'Invalid record',
};

export const CONSENT_EN = { granted: 'Consent', missing: 'No consent', revoked: 'Opt-out' } as const;

export const consentSourceEn = (source: string) => (source === 'sem registro de consentimento' ? 'no consent on record' : source);

/** A mesma explicação do motor de regras, escrita em inglês a partir dos números. */
export function explainEn(customer: GinaSalesforceCustomer): string {
  const { classification, recencyDays: r, medianIntervalDays: m, ratio } = customer.facts;
  const rhythm = m !== null && ratio !== null ? `their usual ${m}-day rhythm (${ratio}x)` : 'their usual rhythm';
  switch (classification) {
    case 'governance_violation':
      return customer.consent === 'revoked'
        ? 'They opted out. Nothing goes out, not even for a VIP.'
        : 'No documented prior consent. Ask for explicit permission on a separate channel before any contact.';
    case 'in_rhythm':
      return `Last purchase ${r} days ago, within 1.5x of ${rhythm}. They're in rhythm: no message. Less noise, more relevance.`;
    case 'delay':
      return `Last purchase ${r} days ago, between 1.5x and 3x of ${rhythm}. Late window: a friendly reminder based on their history, no aggressive discount.`;
    case 'dormant':
      return ratio !== null && ratio > 3
        ? `Last purchase ${r} days ago, past 3x of ${rhythm}. Dormant: 90 days of rest, no automated messages.`
        : "They've ignored 3 or more recent messages. Dormancy comes first: 90 days of rest so it doesn't turn into spam or an opt-out.";
    case 'vip_delayed':
      return `Top third in frequency and spend, last purchase ${r} days ago, at ${rhythm}. Personal contact from someone at the shop, no automation.`;
    case 'new_customer':
      return `First purchase ${r} days ago (30 days or less). New customer: time for a welcome.`;
    case 'oneoff_delayed':
      return `A single purchase ${r} days ago, over 30 days. Give them a reason for a second purchase.`;
    case 'incomplete_data':
      return 'Not enough purchase history to read a rhythm yet.';
    case 'invalid_input':
      return 'Invalid record: fix it in Salesforce before deciding.';
  }
}

/** Assunto da tarefa em inglês, para a prévia da vitrine. */
export function taskSubjectEn(customer: GinaSalesforceCustomer): string {
  const { recommendedAction, classification } = customer.facts;
  const title =
    recommendedAction === 'concierge_human'
      ? 'personal contact with a VIP'
      : classification === 'new_customer'
        ? 'approve the welcome'
        : classification === 'oneoff_delayed'
          ? 'approve the 2nd-purchase nudge'
          : 'approve the friendly reminder';
  return `Gina: ${title} · ${customer.name}`;
}
