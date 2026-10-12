// Importa os clientes de demonstração da Gina numa org Salesforce (Contact + Order).
// Escreve na org: rode só numa Developer Edition ou sandbox.
//   npm run sf:seed                  importa (alias padrão gina-dev)
//   npm run sf:seed -- --remove      apaga tudo o que a importação criou
// A autenticação fica com o Salesforce CLI; o token não passa por este script.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DEMO_CONTACTS, DEMO_ORDERS, DEMO_TODAY } from '../src/integrations/salesforce/demoData.ts';

const args = process.argv.slice(2);
const remove = args.includes('--remove');
const alias = args.find((a) => !a.startsWith('--')) || 'gina-dev';
const API = '/services/data/v62.0';

const ACCOUNT_NAME = 'Loja demo da Gina';
const PRODUCT_NAME = 'Kit demo da Gina';
const DEMO_NOTE = 'Demo da Gina: dado fictício, pode ser apagado com npm run sf:seed -- --remove';

function api(method, url, body) {
  let requestArgs;
  if (method === 'DELETE') {
    // O CLI exige um corpo no DELETE mesmo sem conteúdo ("No 'mode' found in
    // 'body' entry"); pelo arquivo de requisição dá para mandar um corpo vazio.
    const dir = mkdtempSync(join(tmpdir(), 'gina-sf-'));
    const file = join(dir, 'request.json');
    writeFileSync(file, JSON.stringify({ url, method, body: { mode: 'raw', raw: '' } }));
    requestArgs = ['-f', file];
  } else {
    // Sem corpo (GET), o -b fica de fora: o CLI recusa -b vazio.
    requestArgs = [url, '-X', method, ...(body ? ['-b', '-'] : [])];
  }
  const out = execFileSync('sf', ['api', 'request', 'rest', ...requestArgs, '-o', alias], {
    encoding: 'utf8',
    input: body ? JSON.stringify(body) : undefined,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  const data = out.trim() ? JSON.parse(out) : null;
  if (Array.isArray(data) && data[0]?.errorCode) {
    throw new Error(`${method} ${url}: ${data.map((e) => e.message).join('; ')}`);
  }
  return data;
}

const query = (soql) => api('GET', `${API}/query?q=${encodeURIComponent(soql)}`).records;

/** Salesforce aceita até 200 registros por chamada em /composite/sobjects. */
function inBatches(items, size, fn) {
  for (let i = 0; i < items.length; i += size) fn(items.slice(i, i + size));
}

function checkCollection(results, what) {
  const failed = results.filter((r) => !r.success);
  if (failed.length) throw new Error(`${what}: ${failed.map((r) => r.errors.map((e) => e.message).join(', ')).join('; ')}`);
}

function removeDemo() {
  const [account] = query(`SELECT Id FROM Account WHERE Name = '${ACCOUNT_NAME}'`);
  if (account) {
    const orders = query(`SELECT Id, Status FROM Order WHERE AccountId = '${account.Id}'`);
    // Pedido ativado não pode ser apagado: volta para rascunho antes.
    const active = orders.filter((o) => o.Status !== 'Draft');
    inBatches(active, 200, (batch) =>
      checkCollection(
        api('PATCH', `${API}/composite/sobjects`, {
          allOrNone: true,
          records: batch.map((o) => ({ attributes: { type: 'Order' }, id: o.Id, Status: 'Draft' })),
        }),
        'voltar pedidos para rascunho'
      )
    );
    inBatches(orders, 200, (batch) =>
      checkCollection(api('DELETE', `${API}/composite/sobjects?allOrNone=true&ids=${batch.map((o) => o.Id).join(',')}`), 'apagar pedidos')
    );
    // Apagar a conta apaga os contatos ligados a ela.
    api('DELETE', `${API}/sobjects/Account/${account.Id}`);
    console.log(`Removidos: ${orders.length} pedidos, a conta "${ACCOUNT_NAME}" e os contatos dela.`);
  }
  for (const product of query(`SELECT Id FROM Product2 WHERE Name = '${PRODUCT_NAME}'`)) {
    api('DELETE', `${API}/sobjects/Product2/${product.Id}`);
    console.log(`Removido o produto "${PRODUCT_NAME}".`);
  }
  if (!account) console.log('Nada da demonstração encontrado na org.');
}

function seedDemo() {
  if (query(`SELECT Id FROM Account WHERE Name = '${ACCOUNT_NAME}'`).length) {
    console.error(`A org já tem "${ACCOUNT_NAME}". Para recomeçar: npm run sf:seed -- --remove`);
    process.exit(1);
  }

  const [pricebook] = query('SELECT Id, IsActive FROM Pricebook2 WHERE IsStandard = true');
  if (!pricebook) throw new Error('A org não tem catálogo de preços padrão.');
  if (!pricebook.IsActive) api('PATCH', `${API}/sobjects/Pricebook2/${pricebook.Id}`, { IsActive: true });

  // As datas da demonstração são relativas a DEMO_TODAY; desloca para hoje,
  // assim cada cliente cai na mesma regra no dia da importação.
  const today = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z');
  const shiftDays = Math.round((today - DEMO_TODAY) / 86_400_000);
  const shift = (date) => new Date(Date.parse(date + 'T00:00:00Z') + shiftDays * 86_400_000).toISOString().slice(0, 10);

  const ref = (id) => id.replace(/\W/g, '');
  const requests = [
    { method: 'POST', url: `${API}/sobjects/Account`, referenceId: 'account', body: { Name: ACCOUNT_NAME, Description: DEMO_NOTE } },
    { method: 'POST', url: `${API}/sobjects/Product2`, referenceId: 'product', body: { Name: PRODUCT_NAME, IsActive: true, Description: DEMO_NOTE } },
    {
      method: 'POST',
      url: `${API}/sobjects/PricebookEntry`,
      referenceId: 'price',
      body: { Pricebook2Id: pricebook.Id, Product2Id: '@{product.id}', UnitPrice: 1, IsActive: true },
    },
  ];

  for (const contact of DEMO_CONTACTS) {
    const [firstName, ...rest] = contact.Name.split(' ');
    requests.push({
      method: 'POST',
      url: `${API}/sobjects/Contact`,
      referenceId: ref(contact.Id),
      body: {
        AccountId: '@{account.id}',
        FirstName: firstName,
        LastName: rest.join(' '),
        Description: DEMO_NOTE,
        HasOptedOutOfEmail: Boolean(contact.HasOptedOutOfEmail),
        Gina_WhatsApp_Consent__c: contact.Gina_WhatsApp_Consent__c ?? null,
        Gina_Ignored_Contacts__c: contact.Gina_Ignored_Contacts__c ?? null,
      },
    });
  }

  // Todo pedido nasce em rascunho com 1 item; os "Activated" são ativados depois.
  // O pedido "Cancelled" da demonstração fica em rascunho: também não conta como compra.
  for (const order of DEMO_ORDERS) {
    requests.push({
      method: 'POST',
      url: `${API}/sobjects/Order`,
      referenceId: ref(order.Id),
      body: {
        AccountId: '@{account.id}',
        BillToContactId: `@{${ref(order.BillToContactId)}.id}`,
        EffectiveDate: shift(order.EffectiveDate),
        Status: 'Draft',
        Pricebook2Id: pricebook.Id,
        Description: DEMO_NOTE,
      },
    });
    requests.push({
      method: 'POST',
      url: `${API}/sobjects/OrderItem`,
      referenceId: `${ref(order.Id)}item`,
      body: { OrderId: `@{${ref(order.Id)}.id}`, PricebookEntryId: '@{price.id}', Quantity: 1, UnitPrice: order.TotalAmount },
    });
  }

  const result = api('POST', `${API}/composite/graph`, { graphs: [{ graphId: 'gina', compositeRequest: requests }] });
  const graph = result.graphs[0];
  if (!graph.isSuccessful) {
    const errors = graph.graphResponse.compositeResponse
      .filter((r) => r.httpStatusCode >= 400)
      .flatMap((r) => (Array.isArray(r.body) ? r.body.map((e) => `${r.referenceId}: ${e.message}`) : []))
      .filter((m) => !m.includes('PROCESSING_HALTED'));
    throw new Error(`A importação foi desfeita (nada ficou na org). ${errors.join('; ')}`);
  }

  const idByRef = Object.fromEntries(graph.graphResponse.compositeResponse.map((r) => [r.referenceId, r.body?.id]));
  const toActivate = DEMO_ORDERS.filter((o) => o.Status === 'Activated').map((o) => idByRef[ref(o.Id)]);
  inBatches(toActivate, 200, (batch) =>
    checkCollection(
      api('PATCH', `${API}/composite/sobjects`, {
        allOrNone: true,
        records: batch.map((id) => ({ attributes: { type: 'Order' }, id, Status: 'Activated' })),
      }),
      'ativar pedidos'
    )
  );

  console.log(
    `Importados: 1 conta, ${DEMO_CONTACTS.length} contatos, ${DEMO_ORDERS.length} pedidos ` +
      `(${toActivate.length} ativados), datas deslocadas ${shiftDays} dia(s) para hoje.`
  );
}

try {
  remove ? removeDemo() : seedDemo();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
