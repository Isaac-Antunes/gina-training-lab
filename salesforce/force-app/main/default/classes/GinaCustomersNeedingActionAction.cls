/**
 * Ação do Agentforce: lista os clientes cuja decisão pede ação do dono hoje. Só leitura.
 */
public with sharing class GinaCustomersNeedingActionAction {
    public class Request {
        @InvocableVariable(label='Máximo de clientes' description='Quantos clientes listar, no máximo. Padrão: 10.')
        public Integer maxResults;
    }

    public class Result {
        @InvocableVariable(label='Resumo' description='Lista dos clientes que pedem ação do dono, com o motivo de cada um.')
        public String summary;
        @InvocableVariable(label='Total' description='Quantos clientes pedem ação do dono no total.')
        public Integer total;
    }

    @InvocableMethod(
        label='Gina: clientes que pedem ação'
        description='Lista os clientes que pedem ação do dono hoje (boas-vindas, segunda compra, lembrete ou contato pessoal com VIP), aplicando as regras da Gina a todos os contatos. Clientes em ritmo, em descanso ou sem consentimento ficam de fora. Não envia nada e não altera dados.'
        category='Gina'
    )
    public static List<Result> listCustomers(List<Request> requests) {
        List<GinaRules.Customer> customers = GinaService.loadCustomers(Date.today());
        List<Result> results = new List<Result>();
        for (Request request : requests) {
            Integer max = request.maxResults == null || request.maxResults < 1 ? 10 : request.maxResults;
            List<String> lines = new List<String>();
            Integer total = 0;
            for (GinaRules.Customer customer : customers) {
                String ownerAction = GinaRules.ownerTaskTitle(customer);
                if (ownerAction == null) continue;
                total++;
                if (lines.size() < max) {
                    lines.add('- ' + customer.name + ' (Id ' + customer.contactId + '): ' + ownerAction
                        + '. Última compra há ' + customer.facts.recencyDays + ' dias.');
                }
            }
            Result result = new Result();
            result.total = total;
            result.summary = total == 0
                ? 'Nenhum cliente pede ação hoje. Menos ruído, mais relevância.'
                : total + ' cliente(s) pedem ação do dono:\n' + String.join(lines, '\n')
                    + (total > lines.size() ? '\n(+' + (total - lines.size()) + ' não listados)' : '');
            results.add(result);
        }
        return results;
    }
}