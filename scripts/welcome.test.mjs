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
  assert.ok(r.pending.some((p) => /Sem nome/.test(p)));
});

test('invalid WhatsApp falls back to e-mail only because e-mail was also authorized', () => {
  const r = reports['cad-03'];
  assert.equal(r.fields.find((f) => f.field === 'whatsapp').status, 'invalid');
  assert.equal(r.channel, 'email');
  assert.equal(r.decision, 'welcome_partial');
  assert.ok(r.pending.some((p) => /Autorizou WhatsApp, mas o contato está inválido/.test(p)));
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
