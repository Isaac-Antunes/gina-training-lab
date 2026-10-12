import type { GinaSalesforceCustomer } from './toGina';

/** Prefixo do assunto: identifica as tarefas da Gina (e evita duplicar). */
export const GINA_TASK_PREFIX = 'Gina:';

export interface OwnerTask {
  WhoId: string;
  Subject: string;
  Description: string;
  ActivityDate: string;
  Priority: 'High' | 'Normal';
  Status: 'Not Started';
}

/**
 * Só vira tarefa a decisão que pede uma ação do dono. "Não contatar",
 * "descanso" e "em ritmo" são decisões de não agir: não geram tarefa.
 */
function taskTitle(customer: GinaSalesforceCustomer): string | null {
  const { recommendedAction, classification } = customer.facts;
  if (recommendedAction === 'concierge_human') return 'contato pessoal com cliente VIP';
  if (recommendedAction !== 'friendly_nudge') return null;
  if (classification === 'new_customer') return 'aprovar boas-vindas';
  if (classification === 'oneoff_delayed') return 'aprovar convite para a 2ª compra';
  return 'aprovar lembrete amigável';
}

/**
 * Monta a tarefa para o dono revisar na Salesforce. Nenhuma mensagem é enviada
 * ao cliente: a tarefa é o pedido de aprovação. Devolve null se a decisão não
 * pede ação.
 */
export function buildOwnerTask(customer: GinaSalesforceCustomer, today: Date): OwnerTask | null {
  if (customer.consent !== 'granted') return null; // consentimento manda, mesmo se a regra mudar
  const title = taskTitle(customer);
  if (!title) return null;

  const { facts } = customer;
  const lines = [
    `Sugestão da Gina: ${title}.`,
    '',
    facts.explanation,
    '',
    `Pedidos: ${customer.orderCount} · última compra há ${facts.recencyDays} dias` +
      (facts.medianIntervalDays !== null ? ` · ritmo habitual de ${facts.medianIntervalDays} dias` : ''),
    customer.isVip ? `VIP: ${customer.vipReason}` : '',
    '',
    facts.recommendedAction === 'concierge_human'
      ? 'Cliente VIP: alguém da loja fala pessoalmente. A Gina não redige nem envia nada.'
      : 'Nada foi enviado ao cliente. Aprove ou descarte o texto antes de qualquer envio.',
  ];

  return {
    WhoId: customer.contactId,
    Subject: `${GINA_TASK_PREFIX} ${title} · ${customer.name}`.slice(0, 255),
    Description: lines.filter((line, i, all) => line !== '' || all[i - 1] !== '').join('\n').trim(),
    ActivityDate: today.toISOString().slice(0, 10),
    Priority: facts.recommendedAction === 'concierge_human' ? 'High' : 'Normal',
    Status: 'Not Started',
  };
}
