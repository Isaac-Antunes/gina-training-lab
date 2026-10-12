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

const CONTACT_FIELDS = ['Id', 'Name'];
/**
 * Campos que podem não existir ou não estar visíveis para o usuário da org
 * (permissão de campo). Só entram na consulta se a descrição do objeto os listar.
 */
const OPTIONAL_CONTACT_FIELDS = ['HasOptedOutOfEmail', 'Gina_WhatsApp_Consent__c', 'Gina_Ignored_Contacts__c'];
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

  async function get<T>(pathAndQuery: string): Promise<T> {
    const response = await fetchImpl(new URL(pathAndQuery, base), {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
    });
    if (!response.ok) {
      // Não repassa o corpo: pode conter detalhes da org.
      throw new Error(`Salesforce respondeu ${response.status} na consulta.`);
    }
    return (await response.json()) as T;
  }

  async function query<T>(soql: string): Promise<T[]> {
    const records: T[] = [];
    let page = await get<SoqlResponse<T>>(`/services/data/${apiVersion}/query?q=${encodeURIComponent(soql)}`);
    records.push(...page.records);
    while (!page.done && page.nextRecordsUrl) {
      page = await get<SoqlResponse<T>>(page.nextRecordsUrl);
      records.push(...page.records);
    }
    return records;
  }

  /** Nomes dos campos que o usuário da org consegue ler no objeto. */
  async function readableFields(sobject: string): Promise<Set<string>> {
    const describe = await get<{ fields: { name: string }[] }>(`/services/data/${apiVersion}/sobjects/${sobject}/describe`);
    return new Set(describe.fields.map((field) => field.name));
  }

  return {
    query,

    /** Lê os contatos, com os campos opcionais que a org expõe para este usuário. */
    async listContacts(): Promise<SalesforceContact[]> {
      const readable = await readableFields('Contact');
      const fields = [...CONTACT_FIELDS, ...OPTIONAL_CONTACT_FIELDS.filter((name) => readable.has(name))];
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
