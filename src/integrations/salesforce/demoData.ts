import { SalesforceContact, SalesforceOrder } from './types';

/**
 * Base fictícia no formato da Salesforce (Contact + Order) para o modo demonstração.
 * Uma loja de cosméticos de bairro; um cliente para cada regra do método.
 * Nenhum dado real. A data de referência é fixa para a demonstração ser reproduzível.
 */
export const DEMO_TODAY = new Date('2026-10-10T00:00:00Z');

export const DEMO_CONTACTS: SalesforceContact[] = [
  { Id: '003DEMO01', Name: 'Marina Souza', Gina_WhatsApp_Consent__c: 'granted' },
  { Id: '003DEMO02', Name: 'Ana Lima', Gina_WhatsApp_Consent__c: 'granted' },
  { Id: '003DEMO03', Name: 'Roberto Alves', Gina_WhatsApp_Consent__c: 'granted' },
  { Id: '003DEMO04', Name: 'Helena Costa', Gina_WhatsApp_Consent__c: 'granted' },
  { Id: '003DEMO05', Name: 'Paulo Mendes', Gina_WhatsApp_Consent__c: 'granted' },
  { Id: '003DEMO06', Name: 'Júlia Rocha', Gina_WhatsApp_Consent__c: 'granted' },
  { Id: '003DEMO07', Name: 'Carlos Nunes', HasOptedOutOfEmail: true, Gina_WhatsApp_Consent__c: 'granted' },
  { Id: '003DEMO08', Name: 'Beatriz Ramos' },
  { Id: '003DEMO09', Name: 'Fernanda Dias', Gina_WhatsApp_Consent__c: 'granted', Gina_Ignored_Contacts__c: 3 },
];

let seq = 0;
const order = (contactId: string, date: string, total: number, status = 'Activated'): SalesforceOrder => ({
  Id: `801DEMO${String(++seq).padStart(3, '0')}`,
  BillToContactId: contactId,
  EffectiveDate: date,
  TotalAmount: total,
  Status: status,
});

export const DEMO_ORDERS: SalesforceOrder[] = [
  // Marina: hidratante a cada 30 dias; última compra há 46 dias → atraso (lembrete amigável)
  order('003DEMO01', '2026-06-26', 89),
  order('003DEMO01', '2026-07-26', 89),
  order('003DEMO01', '2026-08-25', 89),
  order('003DEMO01', '2026-09-30', 89, 'Cancelled'), // cancelado: não conta

  // Ana: compra toda semana; última há 7 dias → em ritmo (nenhuma mensagem)
  order('003DEMO02', '2026-09-12', 35),
  order('003DEMO02', '2026-09-19', 35),
  order('003DEMO02', '2026-09-26', 35),
  order('003DEMO02', '2026-10-03', 35),

  // Roberto: maior comprador, a cada 10 dias; última há 25 → VIP em atraso (contato humano)
  order('003DEMO03', '2026-08-06', 420),
  order('003DEMO03', '2026-08-16', 380),
  order('003DEMO03', '2026-08-26', 450),
  order('003DEMO03', '2026-09-05', 400),
  order('003DEMO03', '2026-09-15', 410),

  // Helena: a cada 15 dias; última há 60 → dormência (descanso de 90 dias)
  order('003DEMO04', '2026-07-12', 120),
  order('003DEMO04', '2026-07-27', 110),
  order('003DEMO04', '2026-08-11', 130),

  // Paulo: primeira compra há 12 dias → cliente novo (boas-vindas)
  order('003DEMO05', '2026-09-28', 60),

  // Júlia: compra única há 50 dias → estimular a 2ª compra
  order('003DEMO06', '2026-08-21', 75),

  // Carlos: compra bem, mas fez opt-out → bloqueio total
  order('003DEMO07', '2026-09-01', 300),
  order('003DEMO07', '2026-09-15', 280),
  order('003DEMO07', '2026-09-29', 310),

  // Beatriz: compra, mas sem consentimento registrado → bloqueio até autorizar
  order('003DEMO08', '2026-09-20', 50),
  order('003DEMO08', '2026-10-04', 55),

  // Fernanda: atraso, mas ignorou 3 contatos → descanso de 90 dias
  order('003DEMO09', '2026-08-01', 90),
  order('003DEMO09', '2026-08-21', 95),
  order('003DEMO09', '2026-09-10', 85),
];
