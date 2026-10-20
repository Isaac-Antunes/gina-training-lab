import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  importPurchaseCsv,
  normalizeHeader,
  parseAmount,
  parseFlexibleDate,
  renderQueueCsv,
  renderQueueMarkdown,
} from '../src/integrations/csv/purchaseCsv.ts';

const TODAY = new Date('2026-10-19T00:00:00Z');

const header = 'cliente_id,nome,consentimento,data_compra,valor,contatos_ignorados,observacoes';

function csv(...rows) {
  return [header, ...rows].join('\n');
}

test('parses PT headers, Brazilian dates, comma decimals and quoted fields', () => {
  assert.equal(normalizeHeader('Observações'), 'observacoes');
  assert.equal(normalizeHeader('Data da Compra'), 'data_da_compra');
  assert.equal(parseFlexibleDate('01/10/2026'), '2026-10-01');
  assert.equal(parseFlexibleDate('2026-10-01T12:00:00Z'), '2026-10-01');
  assert.equal(parseFlexibleDate('31/02/2026'), null);
  assert.equal(parseFlexibleDate('2028-02-29'), '2028-02-29');
  assert.equal(parseAmount('1.234,50'), 1234.5);
  assert.equal(parseAmount('28,50'), 28.5);
  assert.equal(parseAmount('1,234.56'), 1234.56);
  assert.equal(parseAmount(''), 0);

  const result = importPurchaseCsv(csv(
    'c-1,"Silva, Ana",sim,01/10/2026,"1.234,50",0,"nota, com vírgula"',
    'c-1,"Silva, Ana",sim,11/10/2026,100.00,0,',
  ), { today: TODAY });

  assert.equal(result.queue.customerCount, 1);
  const item = result.queue.silent[0] ?? result.queue.actionable[0] ?? result.queue.blocked[0];
  assert.equal(item.name, 'Silva, Ana');
  assert.equal(item.totalSpending, 1334.5);
  assert.equal(item.orderCount, 2);
});

test('flags deterministic delay and VIP escalation, ordering High first', () => {
  const result = importPurchaseCsv(csv(
    'c-roberto,Roberto Alves,sim,2026-07-20,120.00,0,',
    'c-roberto,Roberto Alves,sim,2026-08-03,120.00,0,',
    'c-roberto,Roberto Alves,sim,2026-08-17,120.00,0,',
    'c-roberto,Roberto Alves,sim,2026-08-31,120.00,0,',
    'c-roberto,Roberto Alves,sim,2026-09-14,120.00,0,',
    'c-ana,Ana Lima,sim,2026-08-24,28.50,0,',
    'c-ana,Ana Lima,sim,2026-09-03,28.50,0,',
    'c-ana,Ana Lima,sim,2026-09-13,28.50,0,',
    'c-ana,Ana Lima,sim,2026-09-23,28.50,0,',
    'c-ana,Ana Lima,sim,2026-10-03,28.50,0,',
    'c-bruno,Bruno Dias,sim,2026-09-01,200.00,0,',
    'c-bruno,Bruno Dias,sim,2026-09-11,200.00,0,',
    'c-carla,Carla Souza,sim,2026-09-20,25.00,0,',
  ), { today: TODAY });

  assert.deepEqual(result.errors, []);
  assert.equal(result.queue.customerCount, 4);
  assert.equal(result.queue.actionable.length, 3);
  assert.equal(result.queue.actionable[0].customerId, 'c-roberto');
  assert.equal(result.queue.actionable[0].classification, 'vip_delayed');
  assert.equal(result.queue.actionable[0].priority, 'High');
  assert.match(result.queue.actionable[0].task.Subject, /contato pessoal com cliente VIP/);
  assert.equal(result.queue.actionable[1].customerId, 'c-ana');
  assert.equal(result.queue.actionable[1].classification, 'delay');
  assert.equal(result.queue.actionable[1].priority, 'Normal');
  assert.equal(result.queue.actionable[2].customerId, 'c-carla');
  assert.equal(result.queue.actionable[2].classification, 'new_customer');
  assert.equal(result.queue.silent[0].customerId, 'c-bruno');
  assert.equal(result.queue.silent[0].classification, 'dormant');
});

test('fails closed on revoked consent and conflicting consent rows', () => {
  const result = importPurchaseCsv(csv(
    'c-carlos,Carlos Nunes,nao,2026-09-10,50.00,0,"pediu para sair"',
    'c-carlos,Carlos Nunes,sim,2026-09-20,50.00,0,',
    'c-pedro,Pedro Santos,,2026-09-05,20.00,0,',
  ), { today: TODAY });

  assert.equal(result.queue.actionable.length, 0);
  const blocked = Object.fromEntries(result.queue.blocked.map((item) => [item.customerId, item]));
  assert.equal(blocked['c-carlos'].consent, 'revoked');
  assert.equal(blocked['c-pedro'].consent, 'missing');
  assert.ok(result.queue.warnings.some((warning) => /conflitantes/.test(warning.message)));
  assert.match(renderQueueMarkdown(result), /A Gina não envia mensagens/);
});

test('removes exact duplicate rows and warns', () => {
  const result = importPurchaseCsv(csv(
    'c-dup,Duplicado,sim,2026-10-01,30.00,0,',
    'c-dup,Duplicado,sim,2026-10-01,30.00,0,',
  ), { today: TODAY });
  assert.equal(result.queue.customerCount, 1);
  const item = [...result.queue.actionable, ...result.queue.silent][0];
  assert.equal(item.orderCount, 1);
  assert.ok(result.queue.warnings.some((warning) => /duplicada/.test(warning.message)));
});

test('reports invalid rows and keeps valid ones with skip-invalid', () => {
  const input = csv(
    'c-ok,Ok,sim,2026-10-01,10.00,0,',
    'c-bad,Bad,sim,31/02/2026,10.00,0,',
  );
  const strict = importPurchaseCsv(input, { today: TODAY });
  assert.equal(strict.errors.length, 1);
  assert.match(strict.errors[0].message, /Data de compra inválida/);

  const lenient = importPurchaseCsv(input, { today: TODAY, skipInvalid: true });
  assert.equal(lenient.errors.length, 1);
  assert.equal(lenient.queue.customerCount, 1);
  assert.equal(lenient.skippedRows, 1);
});

test('routes future purchase dates to data issues, not to the queue', () => {
  const result = importPurchaseCsv(csv(
    'c-future,Futuro,sim,2027-01-01,10.00,0,',
  ), { today: TODAY });
  assert.equal(result.queue.actionable.length, 0);
  assert.equal(result.queue.dataIssues.length, 1);
  assert.equal(result.queue.dataIssues[0].classification, 'invalid_input');
});

test('renders actionable CSV with owner task subject and no customer messaging', () => {
  const result = importPurchaseCsv(csv(
    'c-1,Ana,sim,2026-08-24,28.50,0,',
    'c-1,Ana,sim,2026-09-03,28.50,0,',
    'c-1,Ana,sim,2026-09-13,28.50,0,',
    'c-1,Ana,sim,2026-09-23,28.50,0,',
    'c-1,Ana,sim,2026-10-03,28.50,0,',
    'c-2,Bruno,sim,2026-09-01,200.00,0,',
    'c-2,Bruno,sim,2026-09-11,200.00,0,',
    'c-3,Carla,sim,2026-09-20,25.00,0,',
    'c-4,Dora,sim,2026-09-01,500.00,0,',
    'c-4,Dora,sim,2026-09-11,500.00,0,',
    'c-4,Dora,sim,2026-09-21,500.00,0,',
  ), { today: TODAY });

  const csvOut = renderQueueCsv(result);
  assert.match(csvOut, /^priority,customer_id,name,classification/);
  assert.match(csvOut, /Normal,c-1,Ana,delay,friendly_nudge,granted/);
  assert.match(csvOut, /Gina: aprovar lembrete amigável/);
  assert.doesNotMatch(csvOut, /whatsapp|enviar mensagem/i);
});
