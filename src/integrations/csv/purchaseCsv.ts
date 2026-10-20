/**
 * CSV / spreadsheet import mode for Gina.
 *
 * The simplest CRM is often a spreadsheet. This module turns a purchase export
 * into the canonical Gina model and reuses the exact same deterministic engine
 * as the Salesforce integration (`buildGinaCustomers` -> `crmMath`) and the same
 * owner-task contract (`buildOwnerTask`). No LLM, no network, no customer message.
 *
 * Supported input (one row per purchase/visit):
 *
 *   cliente_id,nome,telefone,consentimento,data_compra,valor,contatos_ignorados,observacoes
 *   c-1,Ana Lima,+5511999990000,sim,2026-10-01,28.50,0,"compra na loja"
 *
 * Header aliases accept PT-BR and English, with or without accents. Dates accept
 * ISO (YYYY-MM-DD) or Brazilian DD/MM/YYYY. Amounts accept dot or comma decimals.
 */

import { buildGinaCustomers, type GinaSalesforceCustomer } from '../salesforce/toGina';
import { buildOwnerTask, type OwnerTask } from '../salesforce/ownerTask';
import type { SalesforceContact, SalesforceOrder } from '../salesforce/types';

export type CsvConsent = 'granted' | 'missing' | 'revoked';

export interface CsvWarning {
  line: number | null;
  message: string;
}

export interface CsvError {
  line: number | null;
  message: string;
}

export interface QueueItem {
  customerId: string;
  name: string;
  consent: CsvConsent;
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
  warnings: CsvWarning[];
}

export interface ImportResult {
  queue: ReviewQueue;
  errors: CsvError[];
  skippedRows: number;
}

export interface ImportOptions {
  /** Reference date for recency math. Defaults to the current UTC day. */
  today?: Date;
  /** Keep valid rows and report invalid ones instead of failing the whole file. */
  skipInvalid?: boolean;
}

interface CsvRow {
  line: number;
  cells: string[];
}

interface ParsedRows {
  headers: string[];
  rows: CsvRow[];
  errors: CsvError[];
}

interface PurchaseRow {
  line: number;
  customerId: string;
  name: string;
  phone: string;
  consent: CsvConsent;
  date: string;
  amount: number;
  ignored: number;
  notes: string;
}

interface CustomerAggregate {
  customerId: string;
  name: string;
  phone: string;
  notes: string;
  consents: Set<CsvConsent>;
  ignored: number;
  rows: PurchaseRow[];
}

const HEADER_ALIASES: Record<string, string[]> = {
  customerId: ['customer_id', 'customerid', 'cliente_id', 'clientid', 'id_cliente', 'codigo_cliente', 'cod_cliente', 'id', 'codigo'],
  name: ['name', 'nome', 'nome_cliente', 'cliente'],
  phone: ['phone', 'telefone', 'whatsapp', 'celular', 'fone'],
  consent: ['consent', 'consentimento', 'consent_status', 'status_consentimento', 'opt_in', 'optin'],
  purchaseDate: ['purchase_date', 'data_compra', 'data_da_compra', 'data', 'order_date', 'orderdate', 'data_pedido'],
  amount: ['amount', 'valor', 'valor_compra', 'valor_total', 'total', 'price', 'preco'],
  ignored: ['recent_ignored_contacts', 'contatos_ignorados', 'ignorados', 'ignored_contacts', 'ignored'],
  notes: ['notes', 'observacoes', 'observacao', 'notas', 'obs'],
};

const GRANTED_VALUES = new Set([
  'granted', 'sim', 's', 'yes', 'y', 'true', '1', 'ativo', 'ativa', 'opt_in', 'optin', 'opt-in',
  'autorizado', 'autorizada', 'aceito', 'aceite', 'consentido',
]);
const REVOKED_VALUES = new Set([
  'revoked', 'revogado', 'revogada', 'opt_out', 'optout', 'opt-out', 'nao', 'não', 'no', 'n', 'false',
  '0', 'recusado', 'recusada', 'descadastrado', 'descadastrada', 'unsubscribed',
]);
const MISSING_VALUES = new Set([
  'missing', 'ausente', 'desconhecido', 'desconhecida', 'unknown', 'pendente', 'sem_registro', '',
]);
const REQUIRED_FIELDS = ['customerId', 'purchaseDate'] as const;

/** Removes accents, lowercases and normalizes separators for header matching. */
export function normalizeHeader(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[\s-]+/g, '_');
}

function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/).find((line) => line.trim().length > 0) ?? '';
  let commas = 0;
  let semicolons = 0;
  let quoted = false;
  for (let i = 0; i < firstLine.length; i += 1) {
    const char = firstLine[i];
    if (char === '"') {
      if (quoted && firstLine[i + 1] === '"') {
        i += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }
    if (quoted) continue;
    if (char === ',') commas += 1;
    if (char === ';') semicolons += 1;
  }
  return semicolons > commas ? ';' : ',';
}

/** RFC 4180-ish parser: quotes, escaped quotes, embedded newlines, CRLF and BOM. */
function parseCsv(text: string): ParsedRows {
  const source = stripBom(text);
  const delimiter = detectDelimiter(source);
  const rows: CsvRow[] = [];
  let cells: string[] = [];
  let field = '';
  let inQuotes = false;
  let line = 1;
  let rowLine = 1;

  const pushCell = () => {
    cells.push(field.trim());
    field = '';
  };
  const pushRow = () => {
    pushCell();
    const isEmpty = cells.every((cell) => cell.length === 0);
    if (!isEmpty) rows.push({ line: rowLine, cells });
    cells = [];
    rowLine = line;
  };

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (inQuotes) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        if (char === '\n') line += 1;
        field += char;
      }
      continue;
    }
    if (char === '"' && field.length === 0) {
      inQuotes = true;
      continue;
    }
    if (char === delimiter) {
      pushCell();
      continue;
    }
    if (char === '\r') continue;
    if (char === '\n') {
      line += 1;
      pushRow();
      rowLine = line;
      continue;
    }
    field += char;
  }
  pushCell();
  if (cells.some((cell) => cell.length > 0)) rows.push({ line: rowLine, cells });

  const errors: CsvError[] = [];
  if (inQuotes) errors.push({ line: rowLine, message: 'Aspas não fechadas no fim do arquivo.' });
  if (rows.length === 0) {
    return { headers: [], rows: [], errors: [...errors, { line: 1, message: 'Arquivo CSV vazio.' }] };
  }
  return { headers: rows[0].cells, rows: rows.slice(1), errors };
}

function resolveHeaders(headers: string[], errors: CsvError[]): Record<string, number> {
  const normalized = headers.map(normalizeHeader);
  const index: Record<string, number> = {};
  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    const found = normalized.findIndex((header) => aliases.includes(header));
    if (found >= 0) index[field] = found;
  }
  for (const required of REQUIRED_FIELDS) {
    if (index[required] === undefined) {
      errors.push({
        line: 1,
        message: `Coluna obrigatória ausente: "${required === 'customerId' ? 'cliente_id/customer_id' : 'data_compra/purchase_date'}".`,
      });
    }
  }
  return index;
}

function cellAt(row: CsvRow, index: Record<string, number>, field: string): string {
  const position = index[field];
  if (position === undefined) return '';
  return row.cells[position] ?? '';
}

/** Parses ISO or Brazilian dates into YYYY-MM-DD, validating real calendar days. */
export function parseFlexibleDate(value: string): string | null {
  const raw = value.trim();
  if (!raw) return null;
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ].*)?$/);
  if (iso) {
    const [, year, month, day] = iso;
    return isValidCalendarDate(Number(year), Number(month), Number(day))
      ? `${year}-${month}-${day}`
      : null;
  }
  const br = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (br) {
    const [, day, month, year] = br;
    return isValidCalendarDate(Number(year), Number(month), Number(day))
      ? `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
      : null;
  }
  return null;
}

function isValidCalendarDate(year: number, month: number, day: number): boolean {
  if (year < 1900 || year > 9999 || month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

/** Parses dot-decimal or Brazilian comma-decimal amounts. Blank means 0. */
export function parseAmount(value: string): number | null {
  const cleaned = value.trim().replace(/R\$/gi, '').replace(/\s/g, '');
  if (!cleaned) return 0;
  let normalized = cleaned;
  if (cleaned.includes(',') && cleaned.includes('.')) {
    normalized = cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')
      ? cleaned.replace(/\./g, '').replace(',', '.')
      : cleaned.replace(/,/g, '');
  } else if (cleaned.includes(',')) {
    normalized = cleaned.replace(',', '.');
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeConsent(value: string): { consent: CsvConsent; known: boolean } {
  const key = normalizeHeader(value);
  if (GRANTED_VALUES.has(key)) return { consent: 'granted', known: true };
  if (REVOKED_VALUES.has(key)) return { consent: 'revoked', known: true };
  if (MISSING_VALUES.has(key)) return { consent: 'missing', known: true };
  return { consent: 'missing', known: false };
}

function mostRestrictiveConsent(consents: Set<CsvConsent>): CsvConsent {
  if (consents.has('revoked')) return 'revoked';
  if (consents.has('missing')) return 'missing';
  return 'granted';
}

function parseRows(parsed: ParsedRows, errors: CsvError[], warnings: CsvWarning[]): PurchaseRow[] {
  const index = resolveHeaders(parsed.headers, errors);
  if (REQUIRED_FIELDS.some((field) => index[field] === undefined)) return [];

  const rows: PurchaseRow[] = [];
  const seen = new Set<string>();
  for (const row of parsed.rows) {
    const customerId = cellAt(row, index, 'customerId').trim();
    const rawDate = cellAt(row, index, 'purchaseDate').trim();
    if (!customerId) {
      errors.push({ line: row.line, message: 'Linha sem cliente_id/customer_id.' });
      continue;
    }
    const date = parseFlexibleDate(rawDate);
    if (!date) {
      errors.push({ line: row.line, message: `Data de compra inválida: "${rawDate}". Use AAAA-MM-DD ou DD/MM/AAAA.` });
      continue;
    }
    const rawAmount = cellAt(row, index, 'amount');
    const amount = parseAmount(rawAmount);
    if (amount === null) {
      errors.push({ line: row.line, message: `Valor inválido: "${rawAmount}".` });
      continue;
    }
    if (!rawAmount.trim()) {
      warnings.push({ line: row.line, message: 'Valor em branco tratado como 0.' });
    }
    const consentValue = cellAt(row, index, 'consent');
    const { consent, known } = normalizeConsent(consentValue);
    if (!known && consentValue.trim()) {
      warnings.push({ line: row.line, message: `Consentimento "${consentValue}" não reconhecido; tratado como ausente (fail-closed).` });
    }
    const ignoredRaw = cellAt(row, index, 'ignored').trim();
    const ignored = ignoredRaw ? Number.parseInt(ignoredRaw, 10) : 0;
    if (ignoredRaw && (!Number.isFinite(ignored) || ignored < 0)) {
      errors.push({ line: row.line, message: `contatos_ignorados inválido: "${ignoredRaw}".` });
      continue;
    }
    const purchase: PurchaseRow = {
      line: row.line,
      customerId,
      name: cellAt(row, index, 'name').trim(),
      phone: cellAt(row, index, 'phone').trim(),
      consent,
      date,
      amount,
      ignored: Number.isFinite(ignored) ? ignored : 0,
      notes: cellAt(row, index, 'notes').trim(),
    };
    const duplicateKey = [purchase.customerId, purchase.date, purchase.amount, purchase.notes].join('|');
    if (seen.has(duplicateKey)) {
      warnings.push({ line: row.line, message: 'Linha idêntica duplicada removida.' });
      continue;
    }
    seen.add(duplicateKey);
    rows.push(purchase);
  }
  return rows;
}

function aggregate(rows: PurchaseRow[], warnings: CsvWarning[]): CustomerAggregate[] {
  const byCustomer = new Map<string, CustomerAggregate>();
  for (const row of rows) {
    const existing = byCustomer.get(row.customerId);
    if (existing) {
      existing.rows.push(row);
      if (row.name) existing.name = row.name;
      if (row.phone) existing.phone = row.phone;
      if (row.notes) existing.notes = row.notes;
      existing.consents.add(row.consent);
      existing.ignored = Math.max(existing.ignored, row.ignored);
    } else {
      byCustomer.set(row.customerId, {
        customerId: row.customerId,
        name: row.name,
        phone: row.phone,
        notes: row.notes,
        consents: new Set([row.consent]),
        ignored: row.ignored,
        rows: [row],
      });
    }
  }
  const customers = [...byCustomer.values()];
  for (const customer of customers) {
    if (customer.consents.size > 1) {
      const resolved = mostRestrictiveConsent(customer.consents);
      warnings.push({
        line: null,
        message: `Consentimentos conflitantes para ${customer.customerId}; prevaleceu o mais restritivo (${resolved}).`,
      });
    }
  }
  return customers;
}

function toSalesforceShape(customers: CustomerAggregate[]): {
  contacts: SalesforceContact[];
  orders: SalesforceOrder[];
} {
  const contacts: SalesforceContact[] = [];
  const orders: SalesforceOrder[] = [];
  for (const customer of customers) {
    const consent = mostRestrictiveConsent(customer.consents);
    contacts.push({
      Id: customer.customerId,
      Name: customer.name || customer.customerId,
      HasOptedOutOfEmail: consent === 'revoked',
      Gina_WhatsApp_Consent__c: consent,
      Gina_Ignored_Contacts__c: customer.ignored,
    });
    customer.rows.forEach((row, index) => {
      orders.push({
        Id: `csv-${customer.customerId}-${index + 1}`,
        BillToContactId: customer.customerId,
        EffectiveDate: row.date,
        TotalAmount: row.amount,
        Status: 'activated',
      });
    });
  }
  return { contacts, orders };
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

function referenceDateOf(today: Date): string {
  return new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))
    .toISOString()
    .slice(0, 10);
}

/**
 * Imports a purchase CSV and produces a deterministic review queue.
 * Valid rows are always evaluated; `errors` lists rows that could not be read.
 */
export function importPurchaseCsv(text: string, options: ImportOptions = {}): ImportResult {
  const today = options.today ?? new Date();
  const parsed = parseCsv(text);
  const errors: CsvError[] = [...parsed.errors];
  const warnings: CsvWarning[] = [];
  const rows = parseRows(parsed, errors, warnings);
  const customers = aggregate(rows, warnings);
  const { contacts, orders } = toSalesforceShape(customers);
  const built = buildGinaCustomers(contacts, orders, today);

  const actionable: QueueItem[] = [];
  const blocked: QueueItem[] = [];
  const silent: QueueItem[] = [];
  const dataIssues: QueueItem[] = [];

  for (const customer of built) {
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
    queue: {
      referenceDate: referenceDateOf(today),
      customerCount: built.length,
      actionable: sortActionable(actionable),
      blocked,
      silent,
      dataIssues,
      warnings,
    },
    errors,
    skippedRows: parsed.rows.length - rows.length,
  };
}

function escapeMarkdownCell(value: string | number | null): string {
  if (value === null) return '—';
  return String(value).replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

export function renderQueueMarkdown(result: ImportResult): string {
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

export function renderQueueCsv(result: ImportResult): string {
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
