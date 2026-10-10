/** Campos lidos do objeto padrão Contact (mais dois campos opcionais da Gina). */
export interface SalesforceContact {
  Id: string;
  Name: string;
  /** Campo padrão: o contato pediu para não receber e-mail. */
  HasOptedOutOfEmail?: boolean;
  /** Campo personalizado opcional: consentimento documentado para WhatsApp. */
  Gina_WhatsApp_Consent__c?: 'granted' | 'missing' | 'revoked' | null;
  /** Campo personalizado opcional: contatos recentes sem resposta (regra dos 3). */
  Gina_Ignored_Contacts__c?: number | null;
}

/** Campos lidos do objeto padrão Order. */
export interface SalesforceOrder {
  Id: string;
  BillToContactId: string | null;
  /** Data do pedido (YYYY-MM-DD). */
  EffectiveDate: string;
  TotalAmount: number | null;
  Status: string;
}

export interface SoqlResponse<T> {
  totalSize: number;
  done: boolean;
  records: T[];
  nextRecordsUrl?: string;
}
