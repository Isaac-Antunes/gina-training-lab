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

function escapeHtml(value: string | number | null): string {
  if (value === null) return '—';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Self-contained, mobile-first HTML report for the store owner.
 * No external assets, no scripts; safe to print or open from a file.
 */
export function renderQueueHtml(result: QueueReport): string {
  const { queue } = result;
  const actionCards = queue.actionable.map((item) => `
      <article class="card">
        <div class="card-head">
          <span class="pill ${item.priority === 'High' ? 'pill-high' : 'pill-normal'}">${escapeHtml(item.priority ?? '—')}</span>
          <h3>${escapeHtml(item.name)}</h3>
          <span class="muted">${escapeHtml(item.customerId)}</span>
        </div>
        <p class="meta">${escapeHtml(item.classification)} · ${escapeHtml(item.recommendedAction)} · consentimento: ${escapeHtml(item.consent)}</p>
        <p class="meta">Ritmo ${escapeHtml(item.medianIntervalDays ?? '—')} dias · recência ${item.recencyDays} dias${item.ratio === null ? '' : ` · razão ${item.ratio.toFixed(2)}`}</p>
        <p>${escapeHtml(item.reason)}</p>
        ${item.task ? `<p class="task"><strong>Tarefa sugerida:</strong> ${escapeHtml(item.task.Subject)}</p>` : ''}
      </article>`).join('');

  const blocked = queue.blocked.map((item) =>
    `<li><strong>${escapeHtml(item.name)}</strong> (${escapeHtml(item.consent)}) — ${escapeHtml(item.reason)}</li>`,
  ).join('');
  const silent = queue.silent.map((item) =>
    `<li><strong>${escapeHtml(item.name)}</strong> — ${escapeHtml(item.classification)} (${escapeHtml(item.recommendedAction)})</li>`,
  ).join('');
  const warnings = [...queue.warnings.map((warning) => escapeHtml(warning.message)), ...result.errors.map((error) => escapeHtml(error.message))]
    .map((message) => `<li>${message}</li>`)
    .join('');

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Gina — fila de revisão ${escapeHtml(queue.referenceDate)}</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 24px 16px 48px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #f4f7f2; color: #12251b; }
  main { max-width: 760px; margin: 0 auto; }
  header { background: #14502a; color: #f4f7f2; border-radius: 18px; padding: 20px; margin-bottom: 18px; }
  header h1 { margin: 0 0 6px; font-size: 22px; }
  header p { margin: 0; opacity: .9; font-size: 14px; }
  h2 { font-size: 16px; margin: 26px 0 10px; text-transform: uppercase; letter-spacing: .06em; color: #14502a; }
  .card { background: #fff; border: 1px solid #dce6da; border-radius: 14px; padding: 14px 16px; margin-bottom: 10px; }
  .card-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .card-head h3 { margin: 0; font-size: 17px; }
  .muted { color: #5d6f63; font-size: 12px; }
  .pill { border-radius: 999px; padding: 2px 9px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
  .pill-high { background: #ffe2d6; color: #8a2d0a; }
  .pill-normal { background: #e4f2df; color: #14502a; }
  .meta { color: #5d6f63; font-size: 13px; margin: 6px 0; }
  .task { background: #f4f7f2; border-radius: 10px; padding: 8px 10px; font-size: 13px; }
  ul { padding-left: 20px; }
  li { margin: 6px 0; font-size: 14px; }
  footer { margin-top: 28px; padding: 14px 16px; background: #fff3e6; border: 1px solid #f0d8bc; border-radius: 12px; font-size: 13px; }
  @media print { body { background: #fff; } header { background: #14502a; } .card { break-inside: avoid; } }
</style>
</head>
<body>
<main>
  <header>
    <h1>Gina — fila de revisão</h1>
    <p>${escapeHtml(queue.referenceDate)} · ${queue.customerCount} cliente(s) avaliados · ${queue.actionable.length} pedem ação</p>
  </header>

  <h2>Precisa de ação do dono</h2>
  ${queue.actionable.length === 0 ? '<p>Nenhum cliente pede ação hoje.</p>' : actionCards}

  <h2>Bloqueados por consentimento</h2>
  ${queue.blocked.length === 0 ? '<p>Nenhum cliente bloqueado.</p>' : `<ul>${blocked}</ul>`}

  ${queue.silent.length === 0 ? '' : `<h2>Sem ação hoje</h2><ul>${silent}</ul>`}

  ${warnings === '' ? '' : `<h2>Avisos da importação</h2><ul>${warnings}</ul>`}

  <footer>
    <strong>A Gina não envia mensagens.</strong> Esta fila é para o dono revisar e decidir; qualquer contato é humano.
  </footer>
</main>
</body>
</html>
`;
}

/**
 * Short, copy-paste friendly text for WhatsApp (owner-to-owner, never customer).
 * It intentionally lists only the top items so the message stays readable.
 */
export function renderQueueWhatsApp(result: QueueReport, limit = 8): string {
  const { queue } = result;
  const lines: string[] = [];
  lines.push(`*Gina — fila de revisão ${queue.referenceDate}*`);
  lines.push(`${queue.customerCount} clientes avaliados · ${queue.actionable.length} pedem ação · ${queue.blocked.length} bloqueados`);
  lines.push('');
  if (queue.actionable.length === 0) {
    lines.push('Nenhum cliente pede ação hoje.');
  } else {
    lines.push('*Precisa de ação:*');
    queue.actionable.slice(0, limit).forEach((item, index) => {
      const why = item.priority === 'High'
        ? `${item.classification} · prioridade alta`
        : item.classification;
      lines.push(`${index + 1}. ${item.name} — ${why}${item.task ? ` · ${item.task.Subject.replace(/^Gina:\s*/, '')}` : ''}`);
    });
    if (queue.actionable.length > limit) {
      lines.push(`… e mais ${queue.actionable.length - limit} cliente(s) no relatório completo.`);
    }
  }
  if (queue.blocked.length > 0) {
    lines.push('');
    lines.push('*Bloqueados por consentimento:*');
    queue.blocked.slice(0, limit).forEach((item) => {
      lines.push(`- ${item.name} (${item.consent})`);
    });
  }
  lines.push('');
  lines.push('_A Gina não envia mensagens. Revise e decida._');
  return `${lines.join('\n')}\n`;
}
