/**
 * Read-only HubSpot API client for the adapter.
 *
 * It only performs GET requests to the CRM objects API (contacts and deals) and
 * never writes. The access token is read from the environment by the CLI and is
 * never logged. Tests inject a fake `fetchImpl`, so the suite stays offline.
 */

import type { HubSpotContact, HubSpotDataset, HubSpotDeal } from './toGina';

export interface HubSpotFetchOptions {
  token: string;
  /** Hard cap on records per object type (default 1000). */
  maxRecords?: number;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}

const CONTACT_PROPERTIES = [
  'firstname', 'lastname', 'email', 'gina_whatsapp_consent', 'hs_email_optout',
  'hs_marketable_status', 'gina_ignored_contacts',
];
const DEAL_PROPERTIES = ['dealname', 'amount', 'closedate', 'dealstage'];

interface Page<T> {
  results?: T[];
  paging?: { next?: { after?: string } };
}

async function fetchPage<T>(
  fetchImpl: typeof fetch,
  url: string,
  token: string,
): Promise<Page<T>> {
  const response = await fetchImpl(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });
  if (!response.ok) {
    let detail = '';
    try {
      const body = await response.json() as { message?: string };
      detail = body?.message ? `: ${body.message}` : '';
    } catch {
      detail = '';
    }
    throw new Error(`HubSpot API returned HTTP ${response.status}${detail}`);
  }
  return await response.json() as Page<T>;
}

async function collect<T>(
  fetchImpl: typeof fetch,
  token: string,
  baseUrl: string,
  objectType: 'contacts' | 'deals',
  properties: string[],
  maxRecords: number,
): Promise<T[]> {
  const collected: T[] = [];
  const seen = new Set<string>();
  let after: string | undefined;

  while (collected.length < maxRecords) {
    const params = new URLSearchParams({
      limit: '100',
      properties: properties.join(','),
      archived: 'false',
    });
    if (objectType === 'deals') params.set('associations', 'contacts');
    if (after) params.set('after', after);
    const page = await fetchPage<T>(fetchImpl, `${baseUrl}/crm/v3/objects/${objectType}?${params.toString()}`, token);
    const results = Array.isArray(page.results) ? page.results : [];
    for (const record of results) {
      const id = (record as { id?: string }).id;
      if (!id || seen.has(id)) continue;
      seen.add(id);
      collected.push(record);
      if (collected.length >= maxRecords) break;
    }
    after = page.paging?.next?.after;
    if (!after) break;
  }
  return collected;
}

/**
 * Fetches contacts and deals (with contact associations) from HubSpot.
 * Requires a private-app access token with read scopes for both objects.
 */
export async function fetchHubSpotDataset(options: HubSpotFetchOptions): Promise<HubSpotDataset> {
  const { token } = options;
  if (!token || !token.trim()) {
    throw new Error('HUBSPOT_ACCESS_TOKEN is required for live mode.');
  }
  const maxRecords = options.maxRecords ?? 1000;
  if (!Number.isFinite(maxRecords) || maxRecords <= 0) {
    throw new Error('maxRecords must be a positive number.');
  }
  const baseUrl = (options.baseUrl ?? 'https://api.hubapi.com').replace(/\/+$/, '');
  const fetchImpl = options.fetchImpl ?? fetch;

  const contacts = await collect<HubSpotContact>(
    fetchImpl, token, baseUrl, 'contacts', CONTACT_PROPERTIES, maxRecords,
  );
  const deals = await collect<HubSpotDeal>(
    fetchImpl, token, baseUrl, 'deals', DEAL_PROPERTIES, maxRecords,
  );
  return { contacts, deals };
}
