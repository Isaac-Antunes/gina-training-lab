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

import { buildGinaCustomers } from '../salesforce/toGina';
import type { SalesforceContact, SalesforceOrder } from '../salesforce/types';
import { normalizeTextKey as normalizeHeader, parseAmount, parseDateLike, parseFlexibleDate } from '../shared/parsing';
import {
  buildReviewQueue,
  renderQueueCsv,
  renderQueueHtml,
  renderQueueMarkdown,
  renderQueueWhatsApp,
  type QueueIssue,
  type QueueWarning,
  type ReviewQueue,
} from '../queue/reviewQueue';

export type { QueueItem, QueueWarning, ReviewQueue } from '../queue/reviewQueue';
export { buildReviewQueue, renderQueueCsv, renderQueueHtml, renderQueueMarkdown, renderQueueWhatsApp } from '../queue/reviewQueue';

export { normalizeHeader, parseAmount, parseFlexibleDate };

export type CsvConsent = 'granted' | 'missing' | 'revoked';
export type CsvWarning = QueueWarning;
export type CsvError = QueueIssue;

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
  /** Fail closed on `granted` consent without recorded proof (date + text). */
  requireConsentProof?: boolean;
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
  proofAt: string | null;
  proofText: string;
  proofChannel: string;
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
  proofAt: string | null;
  proofText: string;
  proofChannel: string;
  consents: Set<CsvConsent>;
  ignored: number;
  rows: PurchaseRow[];
}

const HEADER_ALIASES: Record<string, string[]> = {
  customerId: ['customer_id', 'customerid', 'cliente_id', 'clientid', 'id_cliente', 'codigo_cliente', 'cod_cliente', 'id', 'codigo'],
  name: ['name', 'nome', 'nome_cliente', 'cliente'],
  phone: ['phone', 'telefone', 'whatsapp', 'celular', 'fone'],
  consent: ['consent', 'consentimento', 'consent_status', 'status_consentimento', 'opt_in', 'optin'],
  proofAt: ['consent_proof_at', 'prova_consentimento_at', 'data_prova', 'consent_at', 'opt_in_at'],
  proofText: ['consent_proof_text', 'prova_consentimento_texto', 'texto_consentimento', 'consent_text'],
  proofChannel: ['consent_channel', 'canal_consentimento', 'consent_proof_channel'],
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
    const proofAtRaw = cellAt(row, index, 'proofAt').trim();
    const proofAt = proofAtRaw ? parseDateLike(proofAtRaw) : null;
    if (proofAtRaw && !proofAt) {
      warnings.push({ line: row.line, message: `Data de prova de consentimento inválida: "${proofAtRaw}".` });
    }
    const proofText = cellAt(row, index, 'proofText').trim();
    const proofChannel = cellAt(row, index, 'proofChannel').trim();
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
      proofAt,
      proofText,
      proofChannel,
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
      if (row.proofAt) existing.proofAt = row.proofAt;
      if (row.proofText) existing.proofText = row.proofText;
      if (row.proofChannel) existing.proofChannel = row.proofChannel;
    } else {
      byCustomer.set(row.customerId, {
        customerId: row.customerId,
        name: row.name,
        phone: row.phone,
        notes: row.notes,
        proofAt: row.proofAt,
        proofText: row.proofText,
        proofChannel: row.proofChannel,
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

/**
 * LGPD hardening: a granted consent without recorded proof (date + accepted
 * text) is downgraded to missing when `--require-proof` is on.
 */
function enforceConsentProof(
  customers: CustomerAggregate[],
  requireProof: boolean,
  warnings: CsvWarning[],
): void {
  if (!requireProof) return;
  for (const customer of customers) {
    if (mostRestrictiveConsent(customer.consents) !== 'granted') continue;
    if (customer.proofAt && customer.proofText) continue;
    customer.consents.add('missing');
    warnings.push({
      line: null,
      message: `Consentimento sem prova completa (data + texto) para ${customer.customerId}; tratado como ausente (--require-proof).`,
    });
  }
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
  enforceConsentProof(customers, options.requireConsentProof === true, warnings);
  const { contacts, orders } = toSalesforceShape(customers);
  const built = buildGinaCustomers(contacts, orders, today);

  return {
    queue: buildReviewQueue(built, today, warnings),
    errors,
    skippedRows: parsed.rows.length - rows.length,
  };
}
