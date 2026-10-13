import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeSignup, analyzeSignups, isValidEmail, normalizeWhatsapp } from '../src/welcome/analyzeSignup.ts';
import { DEMO_SIGNUPS, DEMO_STORE } from '../src/welcome/demoSignups.ts';

const reports = Object.fromEntries(analyzeSignups(DEMO_SIGNUPS, DEMO_STORE).map((r) => [r.signup.id, r]));

test('complete signup with proven consent gets a welcome draft on WhatsApp', () => {
  const r = reports['cad-01'];
  assert.equal(r.decision, 'welcome_ready');
  assert.equal(r.consent.status, 'proven');
  assert.equal(r.channel, 'whatsapp');
  assert.deepEqual(r.pending, []);
  assert.match(r.draft, /^Oi, Camila!/);
  assert.match(r.draft, /SAIR/, 'toda boas-vindas mostra como parar de receber');
});

test('missing name never invents one: neutral greeting and a pending item', () => {
  const r = reports['cad-02'];
  assert.equal(r.decision, 'welcome_partial');
  assert.equal(r.fields.find((f) => f.field === 'nome').status, 'missing');
  assert.match(r.draft, /^Oi! Que bom ter você aqui\./);
  assert.deepEqual(r.pending, ['Peça o nome no primeiro contato e complete o cadastro.'], 'pendência diz o que fazer, sem repetir o relatório');
});

test('invalid WhatsApp falls back to e-mail only because e-mail was also authorized', () => {
  const r = reports['cad-03'];
  assert.equal(r.fields.find((f) => f.field === 'whatsapp').status, 'invalid');
  assert.equal(r.channel, 'email');
  assert.equal(r.decision, 'welcome_partial');
  assert.ok(r.pending.some((p) => /Autorizou WhatsApp, mas o contato está inválido/.test(p)));
  assert.match(r.draft, /link de descadastro/, 'e-mail ensina a sair pelo link');
  assert.doesNotMatch(r.draft, /SAIR/);
});

test('checked box without date or text is not proof: blocked, no draft', () => {
  const r = reports['cad-04'];
  assert.equal(r.consent.status, 'unproven');
  assert.deepEqual(r.consent.missing, ['data e hora do aceite', 'texto que a pessoa aceitou']);
  assert.equal(r.decision, 'blocked_no_proof');
  assert.equal(r.channel, null);
  assert.equal(r.draft, null);
});

test('unchecked consent means do not contact, even with valid contacts', () => {
  const r = reports['cad-05'];
  assert.equal(r.decision, 'do_not_contact');
  assert.equal(r.draft, null);
});

test('the newer duplicate waits for a merge; the original is untouched', () => {
  const r = reports['cad-06'];
  assert.equal(r.duplicateOf, 'cad-01');
  assert.equal(r.decision, 'merge_first');
  assert.equal(r.draft, null);
  assert.equal(r.fields.find((f) => f.field === 'nome').status, 'warn', 'nome em maiúsculas');
  assert.equal(reports['cad-01'].decision, 'welcome_ready');
});

test('consent is only used on authorized channels', () => {
  const signup = {
    id: 'x', name: 'Ana Souza', whatsapp: '(11) 91234-5678', email: 'ana@exemplo.com', source: 'site',
    createdAt: '2026-10-10T10:00:00-03:00',
    consent: { checked: true, channels: ['email'], acceptedAt: '2026-10-10T10:00:00-03:00', text: 'Aceito.' },
  };
  assert.equal(analyzeSignup(signup, [signup], DEMO_STORE).channel, 'email', 'WhatsApp válido, mas não autorizado');
});

test('phone and e-mail validation', () => {
  assert.equal(normalizeWhatsapp('+55 (11) 98765-4321'), '11987654321');
  assert.equal(normalizeWhatsapp('11 3456-7890'), null, 'fixo não é WhatsApp');
  assert.equal(normalizeWhatsapp('98765-4321'), null, 'sem DDD');
  assert.equal(isValidEmail('a@b.com'), true);
  assert.equal(isValidEmail('a@b'), false);
  assert.equal(isValidEmail('a b@c.com'), false);
});

test('English showcase gets the same decisions with English copy', async () => {
  const { getDemoSignups } = await import('../src/welcome/demoSignups.ts');
  const { store, signups } = getDemoSignups('en');
  const en = Object.fromEntries(analyzeSignups(signups, store, 'en').map((r) => [r.signup.id, r]));

  for (const id of Object.keys(reports)) assert.equal(en[id].decision, reports[id].decision, `${id}: mesma decisão`);
  assert.match(en['cad-01'].draft, /^Hi, Camila! So glad to have you at Demo Shop\..*reply STOP\.$/);
  assert.match(en['cad-03'].draft, /unsubscribe link/);
  assert.deepEqual(en['cad-02'].pending, ['Ask for their name on first contact and complete the record.']);
  assert.match(en['cad-04'].pending[0], /^Consent without proof: missing date and time of opt-in and the text they agreed to\./);
  assert.equal(en['cad-06'].pending[0], 'Same person as another signup (Website form): merge them before sending anything.');
});

test('English rhythm demo explains every demo customer without leftover Portuguese', async () => {
  const { buildGinaCustomers } = await import('../src/integrations/salesforce/toGina.ts');
  const { DEMO_CONTACTS, DEMO_ORDERS, DEMO_TODAY } = await import('../src/integrations/salesforce/demoData.ts');
  const { explainEn, taskSubjectEn } = await import('../src/components/salesforceViewText.ts');
  for (const customer of buildGinaCustomers(DEMO_CONTACTS, DEMO_ORDERS, DEMO_TODAY)) {
    const text = explainEn(customer);
    assert.ok(text && text.length > 20, `${customer.name}: explicação em inglês`);
    assert.doesNotMatch(text, /\b(dias|ritmo|cliente|consentimento)\b|\(\w[^()]*\([^)]*\)\)/i, `${customer.name}: ${text}`);
  }
  const roberto = buildGinaCustomers(DEMO_CONTACTS, DEMO_ORDERS, DEMO_TODAY).find((c) => c.name === 'Roberto Alves');
  assert.equal(taskSubjectEn(roberto), 'Gina: personal contact with a VIP · Roberto Alves');
});
