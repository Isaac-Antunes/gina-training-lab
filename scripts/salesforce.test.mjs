import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSalesforceReader } from '../src/integrations/salesforce/client.ts';
import { buildGinaCustomers, readConsent } from '../src/integrations/salesforce/toGina.ts';

const INSTANCE = 'https://gina-dev.develop.my.salesforce.com';

/** fetch falso: registra as chamadas e responde por ordem. Nenhuma rede. */
function fakeFetch(pages) {
  const calls = [];
  const impl = async (url, init) => {
    calls.push({ url: String(url), init });
    const body = pages.shift();
    if (!body) return new Response('{"segredo":"detalhe da org"}', { status: 500 });
    return new Response(JSON.stringify(body), { status: 200 });
  };
  return { impl, calls };
}

test('reader only issues authenticated GET queries and follows pagination', async () => {
  const { impl, calls } = fakeFetch([
    { fields: [{ name: 'Id' }, { name: 'Name' }, { name: 'HasOptedOutOfEmail' }] },
    { totalSize: 2, done: false, nextRecordsUrl: '/services/data/v62.0/query/01gNEXT-2000', records: [{ Id: '003A', Name: 'Ana' }] },
    { totalSize: 2, done: true, records: [{ Id: '003B', Name: 'Bruno' }] },
  ]);
  const reader = createSalesforceReader({ instanceUrl: INSTANCE, accessToken: 'token-de-teste', fetchImpl: impl });
  const contacts = await reader.listContacts();

  assert.deepEqual(contacts.map((c) => c.Name), ['Ana', 'Bruno']);
  assert.equal(calls.length, 3);
  for (const call of calls) {
    assert.equal(call.init.method, 'GET');
    assert.equal(call.init.headers.Authorization, 'Bearer token-de-teste');
    assert.ok(call.url.startsWith(INSTANCE));
  }
  assert.ok(calls[0].url.endsWith('/sobjects/Contact/describe'));
  assert.match(decodeURIComponent(calls[1].url), /SELECT Id, Name, HasOptedOutOfEmail FROM Contact/);
  assert.ok(calls[2].url.endsWith('/query/01gNEXT-2000'));
});

test('reader only selects optional contact fields the org lets the user read', async () => {
  const { impl, calls } = fakeFetch([
    { fields: [{ name: 'Id' }, { name: 'Name' }, { name: 'Gina_WhatsApp_Consent__c' }] },
    { totalSize: 0, done: true, records: [] },
  ]);
  const reader = createSalesforceReader({ instanceUrl: INSTANCE, accessToken: 't', fetchImpl: impl });
  await reader.listContacts();

  const soql = decodeURIComponent(calls[1].url);
  assert.match(soql, /SELECT Id, Name, Gina_WhatsApp_Consent__c FROM Contact/);
  assert.equal(soql.includes('HasOptedOutOfEmail'), false);
  assert.equal(soql.includes('Gina_Ignored_Contacts__c'), false);
});

test('reader refuses plain http and missing tokens, and hides error bodies', async () => {
  assert.throws(() => createSalesforceReader({ instanceUrl: 'http://gina.example.com', accessToken: 't' }), /https/);
  assert.throws(() => createSalesforceReader({ instanceUrl: INSTANCE, accessToken: '' }), /accessToken/);

  const { impl } = fakeFetch([]);
  const reader = createSalesforceReader({ instanceUrl: INSTANCE, accessToken: 't', fetchImpl: impl });
  await assert.rejects(reader.listOrders(), (err) => {
    assert.match(err.message, /500/);
    assert.equal(err.message.includes('segredo'), false);
    return true;
  });
});

test('consent is never presumed', () => {
  assert.equal(readConsent({ Id: '1', Name: 'x', HasOptedOutOfEmail: true, Gina_WhatsApp_Consent__c: 'granted' }).consent, 'revoked');
  assert.equal(readConsent({ Id: '1', Name: 'x', Gina_WhatsApp_Consent__c: 'revoked' }).consent, 'revoked');
  assert.equal(readConsent({ Id: '1', Name: 'x', Gina_WhatsApp_Consent__c: 'granted' }).consent, 'granted');
  assert.equal(readConsent({ Id: '1', Name: 'x' }).consent, 'missing');
});

test('Salesforce records become Gina decisions through the deterministic rules', () => {
  const today = new Date('2026-10-10T00:00:00Z');
  const contacts = [
    { Id: 'ana', Name: 'Ana', Gina_WhatsApp_Consent__c: 'granted' },
    { Id: 'bruno', Name: 'Bruno', Gina_WhatsApp_Consent__c: 'granted' },
    { Id: 'carla', Name: 'Carla', HasOptedOutOfEmail: true },
    { Id: 'davi', Name: 'Davi' },
  ];
  const order = (id, contact, date, total, status = 'Activated') => ({
    Id: id, BillToContactId: contact, EffectiveDate: date, TotalAmount: total, Status: status,
  });
  const orders = [
    // Ana: a cada 10 dias, última há 8 → em ritmo
    order('a1', 'ana', '2026-09-12', 50), order('a2', 'ana', '2026-09-22', 50), order('a3', 'ana', '2026-10-02', 50),
    // Bruno: a cada 10 dias, última há 20 → atraso (2x); o cancelado não conta
    order('b1', 'bruno', '2026-08-31', 40), order('b2', 'bruno', '2026-09-10', 40), order('b3', 'bruno', '2026-09-20', 40),
    order('b4', 'bruno', '2026-10-05', 999, 'Cancelled'),
    // Carla: compradora frequente, mas fez opt-out
    order('c1', 'carla', '2026-09-30', 300), order('c2', 'carla', '2026-10-05', 300),
    // Davi: sem consentimento documentado
    order('d1', 'davi', '2026-10-01', 20),
  ];

  const byName = Object.fromEntries(buildGinaCustomers(contacts, orders, today).map((c) => [c.name, c]));

  assert.equal(byName.Ana.facts.classification, 'in_rhythm');
  assert.equal(byName.Ana.facts.recommendedAction, 'no_message');
  assert.equal(byName.Ana.facts.medianIntervalDays, 10);

  assert.equal(byName.Bruno.orderCount, 3, 'pedido cancelado fora da contagem');
  assert.equal(byName.Bruno.totalSpending, 120);
  assert.equal(byName.Bruno.facts.recencyDays, 20);
  assert.equal(byName.Bruno.facts.classification, 'delay');

  assert.equal(byName.Carla.consent, 'revoked');
  assert.equal(byName.Carla.facts.recommendedAction, 'refuse_spam');

  assert.equal(byName.Davi.consent, 'missing');
  assert.equal(byName.Davi.facts.recommendedAction, 'refuse_spam');
});

test('contacts without purchases never become VIP', () => {
  const today = new Date('2026-10-10T12:00:00Z');
  const contacts = [
    { Id: 'semcompra1', Name: 'Sem compra 1', Gina_WhatsApp_Consent__c: 'granted' },
    { Id: 'semcompra2', Name: 'Sem compra 2', Gina_WhatsApp_Consent__c: 'granted' },
    { Id: 'semcompra3', Name: 'Sem compra 3', Gina_WhatsApp_Consent__c: 'granted' },
    { Id: 'eva', Name: 'Eva', Gina_WhatsApp_Consent__c: 'granted' },
  ];
  const orders = [{ Id: 'e1', BillToContactId: 'eva', EffectiveDate: '2026-10-01', TotalAmount: 50, Status: 'Activated' }];

  for (const customer of buildGinaCustomers(contacts, orders, today)) {
    if (customer.orderCount === 0) {
      assert.equal(customer.isVip, false, `${customer.name} não comprou e não pode ser VIP`);
      assert.equal(customer.facts.isVip, false);
    }
  }
});
