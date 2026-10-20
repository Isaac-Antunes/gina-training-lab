/**
 * HubSpot -> canonical Gina adapter.
 *
 * Maps HubSpot contacts and closed-won deals to the same canonical shapes used
 * by the Salesforce integration (`SalesforceContact[]` / `SalesforceOrder[]`),
 * then delegates to `buildGinaCustomers` (crmMath) and the shared review queue.
 *
 * Conservative consent: an explicit opt-out or an email opt-out blocks contact;
 * a WhatsApp consent is only granted by an explicit custom property. Absent or
 * unknown consent stays `missing` (fail-closed).
 */

import { buildGinaCustomers } from '../salesforce/toGina';
import type { SalesforceContact, SalesforceOrder } from '../salesforce/types';
import {
  buildReviewQueue,
  type QueueIssue,
  type QueueWarning,
  type ReviewQueue,
} from '../queue/reviewQueue';
import { normalizeTextKey, parseAmount, parseDateLike } from '../shared/parsing';

export interface HubSpotProperties {
  [key: string]: string | null | undefined;
}

export interface HubSpotContact {
  id: string;
  properties: HubSpotProperties;
}

export interface HubSpotAssociationRef {
  id: string;
}

export interface HubSpotDeal {
  id: string;
  properties: HubSpotProperties;
  /** Optional direct contact id (fixtures/CLI convenience). */
  contactId?: string;
  associations?: {
    contacts?: {
      results?: HubSpotAssociationRef[];
    };
  };
}

export interface HubSpotDataset {
  contacts: HubSpotContact[];
  deals: HubSpotDeal[];
}

export interface HubSpotImportOptions {
  /** Reference date for recency math. Defaults to the current UTC day. */
  today?: Date;
  /** Deal-stage internal values considered won. Defaults to common HubSpot values. */
  closedWonStages?: string[];
}

export interface HubSpotImportResult {
  queue: ReviewQueue;
  errors: QueueIssue[];
  skippedDeals: number;
}

export const DEFAULT_CLOSED_WON_STAGES = [
  'closedwon',
  'closed_won',
  'won',
  'ganho',
  'fechado_ganho',
  'fechadowon',
];

const GRANTED_VALUES = new Set([
  'granted', 'sim', 's', 'yes', 'true', '1', 'ativo', 'ativa', 'opt_in', 'optin', 'opt-in', 'autorizado',
]);
const REVOKED_VALUES = new Set([
  'revoked', 'revogado', 'revogada', 'opt_out', 'optout', 'opt-out', 'nao', 'não', 'no', 'false', '0',
  'recusado', 'descadastrado',
]);
const MISSING_VALUES = new Set(['missing', 'ausente', 'desconhecido', 'unknown', 'pendente', 'sem_registro', '']);

function readCustomConsent(value: string | null | undefined): 'granted' | 'missing' | 'revoked' {
  const key = normalizeTextKey(value ?? '');
  if (GRANTED_VALUES.has(key)) return 'granted';
  if (REVOKED_VALUES.has(key)) return 'revoked';
  if (MISSING_VALUES.has(key)) return 'missing';
  return 'missing';
}

function isEmailOptOut(value: string | null | undefined): boolean {
  const key = normalizeTextKey(value ?? '');
  return key === 'true' || key === 'yes' || key === 'sim' || key === '1';
}

/** Resolves consent conservatively: any explicit opt-out wins. */
export function resolveHubSpotConsent(contact: HubSpotContact): 'granted' | 'missing' | 'revoked' {
  if (isEmailOptOut(contact.properties.hs_email_optout)) return 'revoked';
  const custom = readCustomConsent(contact.properties.gina_whatsapp_consent);
  if (custom === 'revoked') return 'revoked';
  if (custom === 'granted') return 'granted';
  return 'missing';
}

function contactName(contact: HubSpotContact): string {
  const first = (contact.properties.firstname ?? '').trim();
  const last = (contact.properties.lastname ?? '').trim();
  const full = `${first} ${last}`.trim();
  return full || contact.id; // never invent a name
}

function ignoredContacts(contact: HubSpotContact): number {
  const raw = (contact.properties.gina_ignored_contacts ?? '').trim();
  if (!raw) return 0;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function dealContactId(deal: HubSpotDeal): string | null {
  if (deal.contactId) return deal.contactId;
  const associated = deal.associations?.contacts?.results?.[0]?.id;
  return associated ?? null;
}

function isClosedWon(stage: string | null | undefined, closedWonStages: string[]): boolean {
  return closedWonStages.includes(normalizeTextKey(stage ?? ''));
}

/**
 * Imports a HubSpot dataset (API response or fixture) into the deterministic
 * review queue. Invalid deals are reported and skipped; contacts without deals
 * are kept and surface as data issues.
 */
export function importHubSpotDataset(
  dataset: HubSpotDataset,
  options: HubSpotImportOptions = {},
): HubSpotImportResult {
  const today = options.today ?? new Date();
  const closedWonStages = (options.closedWonStages ?? DEFAULT_CLOSED_WON_STAGES).map(normalizeTextKey);
  const errors: QueueIssue[] = [];
  const warnings: QueueWarning[] = [];

  if (!Array.isArray(dataset.contacts) || !Array.isArray(dataset.deals)) {
    return {
      queue: buildReviewQueue([], today, [{ line: null, message: 'Dataset inválido: esperado { contacts: [], deals: [] }.' }]),
      errors: [{ line: null, message: 'Dataset inválido: esperado { contacts: [], deals: [] }.' }],
      skippedDeals: 0,
    };
  }

  const contactsById = new Map(dataset.contacts.map((contact) => [contact.id, contact]));
  const contacts: SalesforceContact[] = dataset.contacts.map((contact) => {
    const consent = resolveHubSpotConsent(contact);
    return {
      Id: contact.id,
      Name: contactName(contact),
      HasOptedOutOfEmail: consent === 'revoked',
      Gina_WhatsApp_Consent__c: consent,
      Gina_Ignored_Contacts__c: ignoredContacts(contact),
    };
  });

  const orders: SalesforceOrder[] = [];
  let skippedDeals = 0;
  let nonWonDeals = 0;
  for (const deal of dataset.deals) {
    const contactId = dealContactId(deal);
    if (!contactId) {
      errors.push({ line: null, message: `Deal ${deal.id} sem contato associado; ignorado.` });
      skippedDeals += 1;
      continue;
    }
    if (!contactsById.has(contactId)) {
      errors.push({ line: null, message: `Deal ${deal.id} aponta para contato ${contactId} inexistente; ignorado.` });
      skippedDeals += 1;
      continue;
    }
    if (!isClosedWon(deal.properties.dealstage, closedWonStages)) {
      nonWonDeals += 1;
      skippedDeals += 1;
      continue;
    }
    const date = parseDateLike(deal.properties.closedate);
    if (!date) {
      errors.push({ line: null, message: `Deal ${deal.id} com closedate inválido ("${deal.properties.closedate ?? ''}"); ignorado.` });
      skippedDeals += 1;
      continue;
    }
    const amount = parseAmount(deal.properties.amount);
    if (amount === null) {
      errors.push({ line: null, message: `Deal ${deal.id} com amount inválido ("${deal.properties.amount ?? ''}"); ignorado.` });
      skippedDeals += 1;
      continue;
    }
    orders.push({
      Id: `hubspot-${deal.id}`,
      BillToContactId: contactId,
      EffectiveDate: date,
      TotalAmount: amount,
      Status: 'activated',
    });
  }

  if (nonWonDeals > 0) {
    warnings.push({
      line: null,
      message: `${nonWonDeals} deal(s) fora de Closed Won ignorados (estágios configurados: ${closedWonStages.join(', ')}).`,
    });
  }
  if (skippedDeals > 0) {
    warnings.push({ line: null, message: `${skippedDeals} deal(s) ignorados no total.` });
  }

  const built = buildGinaCustomers(contacts, orders, today);
  return {
    queue: buildReviewQueue(built, today, warnings),
    errors,
    skippedDeals,
  };
}
