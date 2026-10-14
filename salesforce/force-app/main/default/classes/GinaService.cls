/**
 * Lê contatos e pedidos com as permissões de quem pergunta e aplica as regras da
 * Gina. A única escrita é criar uma Task para o dono aprovar; nada é enviado ao cliente.
 */
public with sharing class GinaService {
    /** Teto de leitura: suficiente para uma loja pequena, longe dos limites do Apex. */
    private static final Integer MAX_CONTACTS = 5000;
    private static final Integer MAX_ORDERS = 20000;

    public class TaskOutcome {
        public Boolean created = false;
        public Id taskId;
        public String message;
    }

    /**
     * Todos os clientes, porque o ranking VIP compara a base inteira. Campos que o
     * usuário não pode ler são removidos: sem consentimento legível, o envio fica bloqueado.
     */
    public static List<GinaRules.Customer> loadCustomers(Date today) {
        List<Contact> contacts = (List<Contact>) Security.stripInaccessible(
            AccessType.READABLE,
            [
                SELECT Id, Name, HasOptedOutOfEmail, Gina_WhatsApp_Consent__c, Gina_Ignored_Contacts__c
                FROM Contact
                ORDER BY Name
                LIMIT :MAX_CONTACTS
            ]
        ).getRecords();
        List<Order> orders = [
            SELECT Id, BillToContactId, EffectiveDate, TotalAmount, Status
            FROM Order
            WHERE BillToContactId != NULL
            WITH USER_MODE
            ORDER BY EffectiveDate
            LIMIT :MAX_ORDERS
        ];
        return GinaRules.buildCustomers(contacts, orders, today);
    }

    /**
     * Aceita o Id do contato ou o nome, como a pessoa escreve no chat. Nome ambíguo
     * não é resolvido: a Gina pede para escolher em vez de adivinhar.
     */
    public static GinaRules.Customer findCustomer(List<GinaRules.Customer> customers, String contactIdOrName) {
        String wanted = contactIdOrName == null ? '' : contactIdOrName.trim();
        if (wanted == '') throw new GinaException('Informe o nome ou o Id do contato.');

        List<GinaRules.Customer> byName = new List<GinaRules.Customer>();
        for (GinaRules.Customer customer : customers) {
            if (wanted == String.valueOf(customer.contactId) || wanted == String.valueOf(customer.contactId).left(15)) return customer;
            if (customer.name != null && customer.name.equalsIgnoreCase(wanted)) byName.add(customer);
        }
        if (byName.size() == 1) return byName[0];
        if (byName.size() > 1) {
            throw new GinaException('Há ' + byName.size() + ' contatos chamados "' + wanted + '". Informe o Id do contato.');
        }
        throw new GinaException('Contato "' + wanted + '" não encontrado na org.');
    }

    public class GinaException extends Exception {}

    /** Tarefa da Gina ainda aberta para este contato, se houver (evita duplicar). */
    public static Id findOpenTask(Id contactId) {
        String prefix = GinaRules.TASK_PREFIX + '%';
        List<Task> open = [
            SELECT Id
            FROM Task
            WHERE WhoId = :contactId AND IsClosed = FALSE AND Subject LIKE :prefix
            WITH USER_MODE
            LIMIT 1
        ];
        return open.isEmpty() ? null : open[0].Id;
    }

    /**
     * Recalcula a decisão lendo a org (nunca confia no que o pedido diz) e cria a
     * tarefa só quando a decisão pede ação do dono e não há outra aberta.
     */
    public static TaskOutcome createOwnerTask(String contactIdOrName, Date today) {
        TaskOutcome outcome = new TaskOutcome();
        GinaRules.Customer customer;
        try {
            customer = findCustomer(loadCustomers(today), contactIdOrName);
        } catch (GinaException e) {
            outcome.message = e.getMessage();
            return outcome;
        }
        Id contactId = customer.contactId;
        Task task = GinaRules.buildOwnerTask(customer, today);
        if (task == null) {
            outcome.message = 'Esta decisão não pede ação do dono: nenhuma tarefa criada. ' + customer.facts.explanation;
            return outcome;
        }
        Id existing = findOpenTask(contactId);
        if (existing != null) {
            outcome.taskId = existing;
            outcome.message = 'Já existe uma tarefa da Gina aberta para ' + customer.name + '. Nenhuma tarefa nova criada.';
            return outcome;
        }
        Database.insert(task, AccessLevel.USER_MODE);
        outcome.created = true;
        outcome.taskId = task.Id;
        outcome.message = 'Tarefa criada para o dono: "' + task.Subject + '". Nada foi enviado ao cliente.';
        return outcome;
    }
}
