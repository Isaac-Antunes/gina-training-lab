/**
 * Ações do Agentforce contra registros de verdade: leitura, tarefa única para o
 * dono e nenhuma tarefa quando a decisão não pede ação.
 */
@IsTest
private class GinaActionsTest {
    @TestSetup
    static void setup() {
        Account store = new Account(Name = 'Loja de teste da Gina');
        insert store;
        List<Contact> contacts = new List<Contact>{
            new Contact(FirstName = 'Nina', LastName = 'Nova', AccountId = store.Id, Gina_WhatsApp_Consent__c = 'granted'),
            new Contact(FirstName = 'Otto', LastName = 'Optout', AccountId = store.Id, Gina_WhatsApp_Consent__c = 'granted', HasOptedOutOfEmail = true),
            new Contact(FirstName = 'Sem', LastName = 'Compra', AccountId = store.Id, Gina_WhatsApp_Consent__c = 'granted')
        };
        insert contacts;

        Product2 product = new Product2(Name = 'Peça de teste', IsActive = true);
        insert product;
        PricebookEntry price = new PricebookEntry(
            Pricebook2Id = Test.getStandardPricebookId(), Product2Id = product.Id, UnitPrice = 1, IsActive = true
        );
        insert price;

        List<Order> orders = new List<Order>();
        for (Contact c : new List<Contact>{ contacts[0], contacts[1] }) {
            orders.add(new Order(
                AccountId = store.Id, BillToContactId = c.Id, EffectiveDate = Date.today().addDays(-3),
                Status = 'Draft', Pricebook2Id = Test.getStandardPricebookId()
            ));
        }
        insert orders;
        List<OrderItem> items = new List<OrderItem>();
        for (Order o : orders) items.add(new OrderItem(OrderId = o.Id, PricebookEntryId = price.Id, Quantity = 1, UnitPrice = 90));
        insert items;
        for (Order o : orders) o.Status = 'Activated';
        update orders;
    }

    private static GinaAnalyzeCustomerAction.Result analyze(String contact) {
        GinaAnalyzeCustomerAction.Request request = new GinaAnalyzeCustomerAction.Request();
        request.contactIdOrName = contact;
        return GinaAnalyzeCustomerAction.analyze(new List<GinaAnalyzeCustomerAction.Request>{ request })[0];
    }

    private static GinaCreateOwnerTaskAction.Result createTask(String contact) {
        GinaCreateOwnerTaskAction.Request request = new GinaCreateOwnerTaskAction.Request();
        request.contactIdOrName = contact;
        return GinaCreateOwnerTaskAction.create(new List<GinaCreateOwnerTaskAction.Request>{ request })[0];
    }

    @IsTest
    static void analyzeExplainsTheDecisionByName() {
        GinaAnalyzeCustomerAction.Result nina = analyze('nina nova');
        Assert.areEqual('new_customer', nina.classification);
        Assert.isTrue(nina.needsOwnerAction);
        Assert.isTrue(nina.summary.contains('aprovar boas-vindas'), nina.summary);

        GinaAnalyzeCustomerAction.Result otto = analyze('Otto Optout');
        Assert.areEqual('refuse_spam', otto.recommendedAction);
        Assert.isFalse(otto.needsOwnerAction);

        GinaAnalyzeCustomerAction.Result missing = analyze('Ninguém');
        Assert.isNull(missing.contactId);
        Assert.isTrue(missing.summary.contains('não encontrado'));
    }

    @IsTest
    static void listShowsOnlyCustomersThatNeedTheOwner() {
        GinaCustomersNeedingActionAction.Request request = new GinaCustomersNeedingActionAction.Request();
        GinaCustomersNeedingActionAction.Result result = GinaCustomersNeedingActionAction.listCustomers(
            new List<GinaCustomersNeedingActionAction.Request>{ request }
        )[0];
        Assert.areEqual(1, result.total, result.summary);
        Assert.isTrue(result.summary.contains('Nina Nova'));
        Assert.isFalse(result.summary.contains('Otto'));
        Assert.isFalse(result.summary.contains('Sem Compra'));
    }

    @IsTest
    static void createsOneTaskForTheOwnerAndNeverDuplicates() {
        Contact nina = [SELECT Id FROM Contact WHERE LastName = 'Nova'];

        Test.startTest();
        GinaCreateOwnerTaskAction.Result first = createTask(nina.Id);
        GinaCreateOwnerTaskAction.Result second = createTask('Nina Nova');
        Test.stopTest();

        Assert.isTrue(first.created, first.message);
        Assert.isFalse(second.created, 'tarefa aberta não é duplicada');
        Assert.areEqual(first.taskId, second.taskId);

        Task task = [SELECT Subject, WhoId, Priority, Status, Description FROM Task WHERE Id = :first.taskId];
        Assert.areEqual('Gina: aprovar boas-vindas · Nina Nova', task.Subject);
        Assert.areEqual(nina.Id, task.WhoId);
        Assert.areEqual('Normal', task.Priority);
        Assert.isTrue(task.Description.contains('Nada foi enviado ao cliente.'));
    }

    @IsTest
    static void noTaskWhenTheDecisionDoesNotNeedTheOwner() {
        GinaCreateOwnerTaskAction.Result optOut = createTask('Otto Optout');
        GinaCreateOwnerTaskAction.Result noPurchases = createTask('Sem Compra');
        GinaCreateOwnerTaskAction.Result unknown = createTask('');

        Assert.isFalse(optOut.created);
        Assert.isFalse(noPurchases.created);
        Assert.isFalse(unknown.created);
        Assert.isTrue(unknown.message.contains('Informe o nome'));
        Assert.areEqual(0, [SELECT COUNT() FROM Task]);
    }
}
