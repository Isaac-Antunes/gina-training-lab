import { classifyCustomerVipTier, CrmCalculationResult, evaluateDeterministicCrm } from '../../utils/crmMath';
import { SalesforceContact, SalesforceOrder } from './types';

/** Status de pedido que não contam como compra. */
const NON_PURCHASE_STATUSES = new Set(['cancelled', 'canceled', 'cancelado', 'draft', 'rascunho']);

export interface GinaSalesforceCustomer {
  contactId: string;
  name: string;
  consent: 'granted' | 'missing' | 'revoked';
  /** De onde veio o consentimento, para a tela mostrar a origem da decisão. */
  consentSource: string;
  orderDates: string[];
  orderCount: number;
  totalSpending: number;
  isVip: boolean;
  vipReason: string;
  facts: CrmCalculationResult;
}

/**
 * Consentimento conservador: nunca presume autorização.
 * - opt-out de e-mail ou campo Gina "revoked" → revogado;
 * - campo Gina "granted" → concedido;
 * - qualquer outro caso → ausente (sem consentimento documentado).
 */
export function readConsent(contact: SalesforceContact): Pick<GinaSalesforceCustomer, 'consent' | 'consentSource'> {
  if (contact.HasOptedOutOfEmail) return { consent: 'revoked', consentSource: 'HasOptedOutOfEmail' };
  if (contact.Gina_WhatsApp_Consent__c === 'revoked') return { consent: 'revoked', consentSource: 'Gina_WhatsApp_Consent__c' };
  if (contact.Gina_WhatsApp_Consent__c === 'granted') return { consent: 'granted', consentSource: 'Gina_WhatsApp_Consent__c' };
  return { consent: 'missing', consentSource: 'sem registro de consentimento' };
}

/**
 * Converte contatos e pedidos da Salesforce em clientes da Gina e aplica as regras
 * determinísticas (crmMath). Nenhuma IA aqui: só matemática testada.
 */
export function buildGinaCustomers(
  contacts: SalesforceContact[],
  orders: SalesforceOrder[],
  today: Date
): GinaSalesforceCustomer[] {
  const purchasesByContact = new Map<string, SalesforceOrder[]>();
  for (const order of orders) {
    if (!order.BillToContactId) continue;
    if (NON_PURCHASE_STATUSES.has(order.Status.trim().toLowerCase())) continue;
    const list = purchasesByContact.get(order.BillToContactId) || [];
    list.push(order);
    purchasesByContact.set(order.BillToContactId, list);
  }

  const ranking = contacts.map((contact) => {
    const purchases = purchasesByContact.get(contact.Id) || [];
    return {
      id: contact.Id,
      name: contact.Name,
      orderCount: purchases.length,
      totalSpending: purchases.reduce((sum, o) => sum + (o.TotalAmount || 0), 0),
    };
  });

  return contacts.map((contact, index) => {
    const purchases = purchasesByContact.get(contact.Id) || [];
    const orderDates = purchases.map((o) => o.EffectiveDate).sort();
    const { totalSpending, orderCount } = ranking[index];
    const vip = classifyCustomerVipTier({ targetCustomerId: contact.Id, customers: ranking });
    const { consent, consentSource } = readConsent(contact);

    return {
      contactId: contact.Id,
      name: contact.Name,
      consent,
      consentSource,
      orderDates,
      orderCount,
      totalSpending,
      isVip: vip.isVip,
      vipReason: vip.reason,
      facts: evaluateDeterministicCrm({
        orderDates,
        currentDate: today,
        historicalSpending: totalSpending,
        isVipTier: vip.isVip,
        consent,
        recentIgnoredContacts: contact.Gina_Ignored_Contacts__c || 0,
      }),
    };
  });
}
