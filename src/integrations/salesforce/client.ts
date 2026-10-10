import { SalesforceContact, SalesforceOrder, SoqlResponse } from './types';

export interface SalesforceConnection {
  /** Ex.: https://minha-org.develop.my.salesforce.com */
  instanceUrl: string;
  accessToken: string;
  apiVersion?: string;
  /** Injetável para testes; por padrão usa o fetch global. */
  fetchImpl?: typeof fetch;
}

const DEFAULT_API_VERSION = 'v62.0';

const CONTACT_FIELDS = ['Id', 'Name', 'HasOptedOutOfEmail'];
const GINA_CONTACT_FIELDS = ['Gina_WhatsApp_Consent__c', 'Gina_Ignored_Contacts__c'];
const ORDER_FIELDS = ['Id', 'BillToContactId', 'EffectiveDate', 'TotalAmount', 'Status'];

/**
 * Cliente só de leitura. Faz apenas GET em /query; não existe método de escrita.
 * As credenciais vêm de quem chama (servidor, a partir de .env.local) e nunca são registradas.
 */
export function createSalesforceReader(connection: SalesforceConnection) {
  const { instanceUrl, accessToken } = connection;
  const apiVersion = connection.apiVersion || DEFAULT_API_VERSION;
  const fetchImpl = connection.fetchImpl || fetch;

  const base = new URL(instanceUrl);
  if (base.protocol !== 'https:') {
    throw new Error('instanceUrl da Salesforce precisa usar https.');
  }
  if (!accessToken) {
    throw new Error('accessToken da Salesforce não informado.');
  }

  async function get<T>(pathAndQuery: string): Promise<SoqlResponse<T>> {
    const response = await fetchImpl(new URL(pathAndQuery, base), {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
    });
    if (!response.ok) {
      // Não repassa o corpo: pode conter detalhes da org.
      throw new Error(`Salesforce respondeu ${response.status} na consulta.`);
    }
    return (await response.json()) as SoqlResponse<T>;
  }

  async function query<T>(soql: string): Promise<T[]> {
    const records: T[] = [];
    let page = await get<T>(`/services/data/${apiVersion}/query?q=${encodeURIComponent(soql)}`);
    records.push(...page.records);
    while (!page.done && page.nextRecordsUrl) {
      page = await get<T>(page.nextRecordsUrl);
      records.push(...page.records);
    }
    return records;
  }

  return {
    query,

    /** Lê os contatos. Com withGinaFields, inclui os dois campos personalizados opcionais. */
    listContacts(withGinaFields = false): Promise<SalesforceContact[]> {
      const fields = withGinaFields ? [...CONTACT_FIELDS, ...GINA_CONTACT_FIELDS] : CONTACT_FIELDS;
      return query<SalesforceContact>(`SELECT ${fields.join(', ')} FROM Contact ORDER BY Name`);
    },

    /** Lê os pedidos ligados a um contato. */
    listOrders(): Promise<SalesforceOrder[]> {
      return query<SalesforceOrder>(
        `SELECT ${ORDER_FIELDS.join(', ')} FROM Order WHERE BillToContactId != null ORDER BY EffectiveDate`
      );
    },
  };
}
