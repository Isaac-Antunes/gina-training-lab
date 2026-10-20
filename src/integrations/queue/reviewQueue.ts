/**
 * Shared review-queue builder and renderers.
 *
 * Both the spreadsheet import and CRM adapters (Salesforce, HubSpot, ...) feed
 * `GinaSalesforceCustomer[]` into this module. The output is always a
 * human-approval queue: deterministic classification, reason, optional owner
 * task, and the invariant that Gina never messages a customer.
 */

import { buildOwnerTask, type OwnerTask } from '../salesforce/ownerTask';
import type { GinaSalesforceCustomer } from '../salesforce/toGina';

export interface QueueWarning {
  line: number | null;
  message: string;
}

export interface QueueIssue {
  line: number | null;
  message: string;
}

export interface QueueItem {
  customerId: string;
  name: string;
  consent: 'granted' | 'missing' | 'revoked';
  classification: string;
  recommendedAction: string;
  medianIntervalDays: number | null;
  recencyDays: number;
  ratio: number | null;
  isVip: boolean;
  priority: 'High' | 'Normal' | null;
  task: OwnerTask | null;
  reason: string;
  orderCount: number;
  totalSpending: number;
}

export interface ReviewQueue {
  referenceDate: string;
  customerCount: number;
  actionable: QueueItem[];
  blocked: QueueItem[];
  silent: QueueItem[];
  dataIssues: QueueItem[];
  warnings: QueueWarning[];
}

export interface QueueReport {
  queue: ReviewQueue;
  errors: QueueIssue[];
}

export function referenceDateOf(today: Date): string {
  return new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))
    .toISOString()
    .slice(0, 10);
}

function toQueueItem(customer: GinaSalesforceCustomer, today: Date): QueueItem {
  const task = buildOwnerTask(customer, today);
  return {
    customerId: customer.contactId,
    name: customer.name,
    consent: customer.consent,
    classification: customer.facts.classification,
    recommendedAction: customer.facts.recommendedAction,
    medianIntervalDays: customer.facts.medianIntervalDays,
    recencyDays: customer.facts.recencyDays,
    ratio: customer.facts.ratio,
    isVip: customer.isVip,
    priority: task?.Priority ?? null,
    task,
    reason: customer.facts.explanation,
    orderCount: customer.orderCount,
    totalSpending: customer.totalSpending,
  };
}

function sortActionable(items: QueueItem[]): QueueItem[] {
  return [...items].sort((a, b) => {
    if (a.priority !== b.priority) return a.priority === 'High' ? -1 : 1;
    if ((b.ratio ?? -1) !== (a.ratio ?? -1)) return (b.ratio ?? -1) - (a.ratio ?? -1);
    return b.recencyDays - a.recencyDays;
  });
}

/**
 * Categorizes evaluated customers into actionable / blocked / silent / data
 * issues. Blocked-by-consent is decided before classification: consent wins.
 */
export function buildReviewQueue(
  customers: GinaSalesforceCustomer[],
  today: Date,
  warnings: QueueWarning[] = [],
): ReviewQueue {
  const actionable: QueueItem[] = [];
  const blocked: QueueItem[] = [];
  const silent: QueueItem[] = [];
  const dataIssues: QueueItem[] = [];

  for (const customer of customers) {
    const item = toQueueItem(customer, today);
    if (item.consent !== 'granted') {
      blocked.push(item);
    } else if (item.classification === 'invalid_input' || item.classification === 'incomplete_data') {
      dataIssues.push(item);
    } else if (item.task) {
      actionable.push(item);
    } else {
      silent.push(item);
    }
  }

  return {
    referenceDate: referenceDateOf(today),
    customerCount: customers.length,
    actionable: sortActionable(actionable),
    blocked,
    silent,
    dataIssues,
    warnings,
  };
}

function escapeMarkdownCell(value: string | number | null): string {
  if (value === null) return '—';
  return String(value).replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

export function renderQueueMarkdown(result: QueueReport): string {
  const { queue } = result;
  const lines: string[] = [];
  lines.push(`# Gina review queue — ${queue.referenceDate}`);
  lines.push('');
  lines.push(
    `${queue.customerCount} cliente(s) avaliados · ${queue.actionable.length} pedem ação · ${queue.blocked.length} bloqueados · ${queue.silent.length} sem ação · ${queue.dataIssues.length} com problema de dados`,
  );
  lines.push('');

  lines.push('## Precisa de ação do dono');
  if (queue.actionable.length === 0) {
    lines.push('');
    lines.push('Nenhum cliente pede ação hoje.');
  } else {
    lines.push('');
    lines.push('| Prioridade | Cliente | Classificação | Ritmo (dias) | Recência (dias) | Razão | Consentimento | Ação |');
    lines.push('|---|---|---|---|---|---|---|---|');
    for (const item of queue.actionable) {
      lines.push(
        `| ${item.priority ?? '—'} | ${escapeMarkdownCell(item.name)} (${escapeMarkdownCell(item.customerId)}) | ${item.classification} | ${escapeMarkdownCell(item.medianIntervalDays)} | ${item.recencyDays} | ${item.ratio === null ? '—' : item.ratio.toFixed(2)} | ${item.consent} | ${item.recommendedAction} |`,
      );
    }
    lines.push('');
    lines.push('### Por que agora');
    for (const item of queue.actionable) {
      const task = item.task ? ` Tarefa sugerida: "${item.task.Subject}".` : '';
      lines.push(`- **${item.name}** — ${item.reason}${task}`);
    }
  }

  lines.push('');
  lines.push('## Bloqueados por consentimento');
  if (queue.blocked.length === 0) {
    lines.push('');
    lines.push('Nenhum cliente bloqueado.');
  } else {
    for (const item of queue.blocked) {
      lines.push(`- **${item.name}** (${item.consent}) — ${item.reason}`);
    }
  }

  if (queue.dataIssues.length > 0) {
    lines.push('');
    lines.push('## Problemas de dados');
    for (const item of queue.dataIssues) {
      lines.push(`- **${item.name}** — ${item.reason}`);
    }
  }

  lines.push('');
  lines.push('## Sem ação hoje');
  if (queue.silent.length === 0) {
    lines.push('');
    lines.push('—');
  } else {
    for (const item of queue.silent) {
      lines.push(`- **${item.name}** — ${item.classification} (${item.recommendedAction})`);
    }
  }

  if (queue.warnings.length > 0) {
    lines.push('');
    lines.push('## Avisos de importação');
    for (const warning of queue.warnings) {
      lines.push(`- ${warning.line === null ? 'arquivo' : `linha ${warning.line}`}: ${warning.message}`);
    }
  }

  if (result.errors.length > 0) {
    lines.push('');
    lines.push('## Linhas não importadas');
    for (const error of result.errors) {
      lines.push(`- ${error.line === null ? 'arquivo' : `linha ${error.line}`}: ${error.message}`);
    }
  }

  lines.push('');
  lines.push('> A Gina não envia mensagens. Esta fila é para o dono revisar e decidir; qualquer contato é humano.');
  lines.push('');
  return lines.join('\n');
}

function csvCell(value: string | number | null): string {
  const text = value === null ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function renderQueueCsv(result: QueueReport): string {
  const header = [
    'priority', 'customer_id', 'name', 'classification', 'recommended_action', 'consent',
    'median_interval_days', 'recency_days', 'ratio', 'owner_task_subject', 'reason',
  ];
  const lines = [header.join(',')];
  for (const item of result.queue.actionable) {
    lines.push([
      item.priority ?? '',
      item.customerId,
      item.name,
      item.classification,
      item.recommendedAction,
      item.consent,
      item.medianIntervalDays ?? '',
      item.recencyDays,
      item.ratio === null ? '' : item.ratio.toFixed(2),
      item.task?.Subject ?? '',
      item.reason,
    ].map(csvCell).join(','));
  }
  return `${lines.join('\n')}\n`;
}
