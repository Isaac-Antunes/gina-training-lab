/**
 * Ação do Agentforce: cria a tarefa para o dono aprovar. É a única escrita da Gina;
 * nenhuma mensagem é enviada ao cliente.
 */
public with sharing class GinaCreateOwnerTaskAction {
    public class Request {
        @InvocableVariable(
            label='Contato (nome ou Id)'
            description='Nome completo ou Id do contato (Contact) para quem o dono quer a tarefa.'
            required=true
        )
        public String contactIdOrName;
    }

    public class Result {
        @InvocableVariable(label='Mensagem' description='O que aconteceu, em linguagem simples.')
        public String message;
        @InvocableVariable(label='Tarefa criada' description='Verdadeiro só quando uma tarefa nova foi criada agora.')
        public Boolean created = false;
        @InvocableVariable(label='Id da tarefa' description='Id da tarefa criada ou da tarefa da Gina que já estava aberta.')
        public Id taskId;
    }

    @InvocableMethod(
        label='Gina: criar tarefa para o dono'
        description='Cria uma tarefa (Task) para o dono aprovar o contato sugerido pela Gina. Recalcula a decisão antes; não cria nada se a decisão não pedir ação, se faltar consentimento ou se já houver tarefa da Gina aberta. Nunca envia mensagem ao cliente.'
        category='Gina'
    )
    public static List<Result> create(List<Request> requests) {
        Date today = Date.today();
        List<Result> results = new List<Result>();
        for (Request request : requests) {
            GinaService.TaskOutcome outcome = GinaService.createOwnerTask(request.contactIdOrName, today);
            Result result = new Result();
            result.message = outcome.message;
            result.created = outcome.created;
            result.taskId = outcome.taskId;
            results.add(result);
        }
        return results;
    }
}