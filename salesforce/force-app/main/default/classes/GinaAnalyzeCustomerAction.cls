/**
 * Ação do Agentforce: explica a decisão da Gina para um cliente. Só leitura.
 */
public with sharing class GinaAnalyzeCustomerAction {
    public class Request {
        @InvocableVariable(
            label='Contato (nome ou Id)'
            description='Nome completo ou Id do contato (Contact) que o dono quer analisar.'
            required=true
        )
        public String contactIdOrName;
    }

    public class Result {
        @InvocableVariable(label='Resumo' description='Decisão da Gina em linguagem simples, pronta para mostrar ao dono.')
        public String summary;
        @InvocableVariable(label='Id do contato' description='Id do contato analisado. Vazio se o contato não foi encontrado.')
        public Id contactId;
        @InvocableVariable(label='Classificação' description='in_rhythm, delay, dormant, new_customer, oneoff_delayed, vip_delayed, incomplete_data ou governance_violation.')
        public String classification;
        @InvocableVariable(label='Ação recomendada' description='no_message, friendly_nudge, concierge_human, dormancy_rest, refuse_spam ou request_audience.')
        public String recommendedAction;
        @InvocableVariable(label='Pede ação do dono' description='Verdadeiro quando a decisão pede uma tarefa para o dono aprovar.')
        public Boolean needsOwnerAction = false;
    }

    @InvocableMethod(
        label='Gina: analisar cliente'
        description='Calcula ritmo de compra, recência, VIP e consentimento de um cliente com as regras determinísticas da Gina e diz o que fazer. Não envia nada e não altera dados.'
        category='Gina'
    )
    public static List<Result> analyze(List<Request> requests) {
        Date today = Date.today();
        List<GinaRules.Customer> customers = GinaService.loadCustomers(today);
        List<Result> results = new List<Result>();
        for (Request request : requests) {
            Result result = new Result();
            try {
                GinaRules.Customer customer = GinaService.findCustomer(customers, request.contactIdOrName);
                String ownerAction = GinaRules.ownerTaskTitle(customer);
                result.contactId = customer.contactId;
                result.classification = customer.facts.classification;
                result.recommendedAction = customer.facts.recommendedAction;
                result.needsOwnerAction = ownerAction != null;
                result.summary = customer.name + ': ' + customer.facts.explanation
                    + '\nConsentimento: ' + customer.consent + ' (' + customer.consentSource + ').'
                    + '\nPedidos: ' + customer.orderCount + '. ' + customer.vipReason
                    + '\nAção para o dono: ' + (ownerAction == null ? 'nenhuma.' : ownerAction + '.');
            } catch (GinaService.GinaException e) {
                result.summary = e.getMessage();
            }
            results.add(result);
        }
        return results;
    }
}