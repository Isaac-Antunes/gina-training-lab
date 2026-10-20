import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_CLOSED_WON_STAGES,
  importHubSpotDataset,
  resolveHubSpotConsent,
} from '../src/integrations/hubspot/toGina.ts';
import { fetchHubSpotDataset } from '../src/integrations/hubspot/client.ts';
import { renderQueueMarkdown } from '../src/integrations/queue/reviewQueue.ts';

const TODAY = new Date('2026-10-19T00:00:00Z');

const contact = (id, properties = {}) => ({ id, properties });
const deal = (id, contactId, properties = {}) => ({
  id,
  properties: { dealstage: 'closedwon', ...properties },
  associations: contactId ? { contacts: { results: [{ id: contactId }] } } : undefined,
});

test('resolves consent conservatively (opt-out wins, absent stays missing)', () => {
  assert.equal(resolveHubSpotConsent(contact('c', { hs_email_optout: 'true', gina_whatsapp_consent: 'granted' })), 'revoked');
  assert.equal(resolveHubSpotConsent(contact('c', { gina_whatsapp_consent: 'granted' })), 'granted');
  assert.equal(resolveHubSpotConsent(contact('c', { gina_whatsapp_consent: 'revoked' })), 'revoked');
  assert.equal(resolveHubSpotConsent(contact('c', { gina_whatsapp_consent: '' })), 'missing');
  assert.equal(resolveHubSpotConsent(contact('c', { gina_whatsapp_consent: 'talvez' })), 'missing');
  assert.equal(resolveHubSpotConsent(contact('c', { hs_marketable_status: 'MARKETABLE' })), 'missing');
});

test('routes closed-won deals to the deterministic queue with VIP priority', () => {
  const roberto = contact('hs-roberto', { firstname: 'Roberto', lastname: 'Alves', gina_whatsapp_consent: 'granted' });
  const ana = contact('hs-ana', { firstname: 'Ana', lastname: 'Lima', gina_whatsapp_consent: 'granted' });
  const bruno = contact('hs-bruno', { firstname: 'Bruno', lastname: 'Dias', gina_whatsapp_consent: 'granted' });
  const carla = contact('hs-carla', { firstname: 'Carla', lastname: 'Souza', gina_whatsapp_consent: 'granted' });

  const dataset = {
    contacts: [roberto, ana, bruno, carla],
    deals: [
      deal('r1', 'hs-roberto', { amount: '120', closedate: '2026-07-20' }),
      deal('r2', 'hs-roberto', { amount: '120', closedate: '2026-08-03' }),
      deal('r3', 'hs-roberto', { amount: '120', closedate: '2026-08-17' }),
      deal('r4', 'hs-roberto', { amount: '120', closedate: '2026-08-31' }),
      deal('r5', 'hs-roberto', { amount: '120', closedate: '2026-09-14' }),
      deal('a1', 'hs-ana', { amount: '28.50', closedate: '2026-08-24' }),
      deal('a2', 'hs-ana', { amount: '28.50', closedate: '2026-09-03' }),
      deal('a3', 'hs-ana', { amount: '28.50', closedate: '2026-09-13' }),
      deal('a4', 'hs-ana', { amount: '28.50', closedate: '2026-09-23' }),
      deal('a5', 'hs-ana', { amount: '28.50', closedate: '2026-10-03' }),
      deal('b1', 'hs-bruno', { amount: '200', closedate: '2026-09-01' }),
      deal('b2', 'hs-bruno', { amount: '200', closedate: '2026-09-11' }),
      deal('c1', 'hs-carla', { amount: '25', closedate: '2026-09-20' }),
      deal('c2', 'hs-carla', { amount: '999', closedate: '2026-10-01', dealstage: 'appointmentscheduled' }),
    ],
  };

  const result = importHubSpotDataset(dataset, { today: TODAY });
  assert.deepEqual(result.errors, []);
  assert.equal(result.queue.customerCount, 4);
  assert.equal(result.queue.actionable.length, 3);
  assert.equal(result.queue.actionable[0].customerId, 'hs-roberto');
  assert.equal(result.queue.actionable[0].classification, 'vip_delayed');
  assert.equal(result.queue.actionable[0].priority, 'High');
  assert.equal(result.queue.actionable[1].customerId, 'hs-ana');
  assert.equal(result.queue.actionable[1].classification, 'delay');
  assert.equal(result.queue.actionable[2].customerId, 'hs-carla');
  assert.equal(result.queue.actionable[2].classification, 'new_customer');
  assert.equal(result.queue.silent[0].customerId, 'hs-bruno');
  assert.equal(result.queue.silent[0].classification, 'dormant');
  assert.ok(result.queue.warnings.some((warning) => /fora de Closed Won/.test(warning.message)));
  assert.match(renderQueueMarkdown(result), /A Gina não envia mensagens/);
});

test('supports custom won stages and reports unmapped deals', () => {
  const dataset = {
    contacts: [contact('hs-1', { firstname: 'A', gina_whatsapp_consent: 'granted' })],
    deals: [
      deal('d1', 'hs-1', { amount: '100', closedate: '2026-09-01', dealstage: 'custom_won' }),
      deal('d2', null, { amount: '50', closedate: '2026-09-02', dealstage: 'closedwon' }),
      deal('d3', 'hs-ghost', { amount: '50', closedate: '2026-09-03', dealstage: 'closedwon' }),
    ],
  };
  const result = importHubSpotDataset(dataset, { today: TODAY, closedWonStages: ['custom_won'] });
  assert.equal(result.queue.actionable.length, 1);
  assert.equal(result.errors.length, 2);
  assert.equal(result.skippedDeals, 2);
  assert.ok(DEFAULT_CLOSED_WON_STAGES.includes('closedwon'));
});

test('parses epoch dates and comma decimals, and keeps contacts without deals as data issues', () => {
  const epoch = String(Date.UTC(2026, 8, 1));
  const dataset = {
    contacts: [
      contact('hs-1', { firstname: 'Epoch', gina_whatsapp_consent: 'granted' }),
      contact('hs-empty', { firstname: 'SemCompras', gina_whatsapp_consent: 'granted' }),
    ],
    deals: [deal('d1', 'hs-1', { amount: '1.234,50', closedate: epoch })],
  };
  const result = importHubSpotDataset(dataset, { today: TODAY });
  assert.equal(result.errors.length, 0);
  assert.equal(result.queue.dataIssues.length, 1);
  assert.equal(result.queue.dataIssues[0].customerId, 'hs-empty');
  const item = result.queue.silent[0] ?? result.queue.actionable[0] ?? result.queue.blocked[0];
  assert.equal(item.totalSpending, 1234.5);
});

test('live client paginates, sends the bearer token and honors maxRecords', async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, auth: init?.headers?.Authorization });
    const parsed = new URL(url);
    if (parsed.pathname.endsWith('/contacts')) {
      const after = parsed.searchParams.get('after');
      const results = after
        ? [contact('c3', { firstname: 'C3' })]
        : [contact('c1', { firstname: 'C1' }), contact('c2', { firstname: 'C2' })];
      return {
        ok: true,
        status: 200,
        json: async () => ({ results, ...(after ? {} : { paging: { next: { after: 'page-2' } } }) }),
      };
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({
        results: [{ id: 'd1', properties: { dealstage: 'closedwon' }, associations: { contacts: { results: [{ id: 'c1' }] } } }],
      }),
    };
  };

  const dataset = await fetchHubSpotDataset({ token: 'tok-123', fetchImpl, maxRecords: 2 });
  assert.equal(dataset.contacts.length, 2);
  assert.equal(dataset.deals.length, 1);
  assert.equal(calls[0].auth, 'Bearer tok-123');
  assert.ok(calls[0].url.includes('/crm/v3/objects/contacts'));
  assert.ok(calls[0].url.includes('properties='));
  const dealCall = calls.find((call) => call.url.includes('/deals'));
  assert.ok(dealCall.url.includes('associations=contacts'));
});

test('live client surfaces HTTP errors without leaking the token', async () => {
  const fetchImpl = async () => ({ ok: false, status: 401, json: async () => ({ message: 'bad token' }) });
  await assert.rejects(
    () => fetchHubSpotDataset({ token: 'super-secret-token', fetchImpl }),
    (error) => {
      assert.match(error.message, /HubSpot API returned HTTP 401/);
      assert.doesNotMatch(error.message, /super-secret-token/);
      return true;
    },
  );
});
