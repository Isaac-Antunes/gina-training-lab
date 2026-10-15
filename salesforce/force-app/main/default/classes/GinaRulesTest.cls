/**
 * Mesmos casos de scripts/salesforce.test.mjs e das regras do crmMath.ts:
 * a Gina decide igual no Node e no Apex.
 */
@IsTest
private class GinaRulesTest {
    private static final Date TODAY = Date.newInstance(2026, 10, 10);

    private static Id fakeId(Integer n) {
        return Id.valueOf('003' + String.valueOf(n).leftPad(12, '0'));
    }

    private static Contact contact(Integer n, String name, String consent, Boolean optOut) {
        Contact c = new Contact(Id = fakeId(n), LastName = name, HasOptedOutOfEmail = optOut, Gina_WhatsApp_Consent__c = consent);
        // Name é calculado pela Salesforce: só dá para preencher pela desserialização.
        Map<String, Object> fields = c.getPopulatedFieldsAsMap().clone();
        fields.put('Name', name);
        fields.put('attributes', new Map<String, Object>{ 'type' => 'Contact' });
        return (Contact) JSON.deserialize(JSON.serialize(fields), Contact.class);
    }

    private static Order order(Integer contactN, Date day, Decimal total, String status) {
        // TotalAmount é calculado pela Salesforce: só dá para preencher pela desserialização.
        return (Order) JSON.deserialize(
            JSON.serialize(new Map<String, Object>{
                'attributes' => new Map<String, Object>{ 'type' => 'Order' },
                'BillToContactId' => fakeId(contactN),
                'EffectiveDate' => day,
                'TotalAmount' => total,
                'Status' => status
            }),
            Order.class
        );
    }

    private static Map<String, GinaRules.Customer> byName(List<GinaRules.Customer> customers) {
        Map<String, GinaRules.Customer> result = new Map<String, GinaRules.Customer>();
        for (GinaRules.Customer c : customers) result.put(c.name, c);
        return result;
    }

    @IsTest
    static void recordsBecomeDecisionsThroughTheRules() {
        List<Contact> contacts = new List<Contact>{
            contact(1, 'Ana', 'granted', false),
            contact(2, 'Bruno', 'granted', false),
            contact(3, 'Carla', null, true),
            contact(4, 'Davi', null, false)
        };
        List<Order> orders = new List<Order>{
            // Ana: a cada 10 dias, última há 8 → em ritmo
            order(1, Date.newInstance(2026, 9, 12), 50, 'Activated'),
            order(1, Date.newInstance(2026, 9, 22), 50, 'Activated'),
            order(1, Date.newInstance(2026, 10, 2), 50, 'Activated'),
            // Bruno: a cada 10 dias, última há 20 → atraso (2x); o cancelado não conta
            order(2, Date.newInstance(2026, 8, 31), 40, 'Activated'),
            order(2, Date.newInstance(2026, 9, 10), 40, 'Activated'),
            order(2, Date.newInstance(2026, 9, 20), 40, 'Activated'),
            order(2, Date.newInstance(2026, 10, 5), 999, 'Cancelled'),
            // Carla: compradora frequente, mas fez opt-out
            order(3, Date.newInstance(2026, 9, 30), 300, 'Activated'),
            order(3, Date.newInstance(2026, 10, 5), 300, 'Activated'),
            // Davi: sem consentimento documentado
            order(4, Date.newInstance(2026, 10, 1), 20, 'Activated')
        };

        Map<String, GinaRules.Customer> customers = byName(GinaRules.buildCustomers(contacts, orders, TODAY));

        Assert.areEqual('in_rhythm', customers.get('Ana').facts.classification);
        Assert.areEqual('no_message', customers.get('Ana').facts.recommendedAction);
        Assert.areEqual(10, customers.get('Ana').facts.medianIntervalDays);

        Assert.areEqual(3, customers.get('Bruno').orderCount, 'pedido cancelado fora da contagem');
        Assert.areEqual(120, customers.get('Bruno').totalSpending);
        Assert.areEqual(20, customers.get('Bruno').facts.recencyDays);
        Assert.areEqual('delay', customers.get('Bruno').facts.classification);
        Assert.areEqual('aprovar lembrete amigável', GinaRules.ownerTaskTitle(customers.get('Bruno')));

        Assert.areEqual('revoked', customers.get('Carla').consent);
        Assert.areEqual('refuse_spam', customers.get('Carla').facts.recommendedAction);
        Assert.isNull(GinaRules.buildOwnerTask(customers.get('Carla'), TODAY), 'opt-out nunca vira tarefa');

        Assert.areEqual('missing', customers.get('Davi').consent);
        Assert.areEqual('refuse_spam', customers.get('Davi').facts.recommendedAction);
    }

    @IsTest
    static void consentIsNeverPresumed() {
        Assert.areEqual('revoked', GinaRules.readConsent(contact(1, 'x', 'granted', true))[0]);
        Assert.areEqual('revoked', GinaRules.readConsent(contact(1, 'x', 'revoked', false))[0]);
        Assert.areEqual('granted', GinaRules.readConsent(contact(1, 'x', 'granted', false))[0]);
        Assert.areEqual('missing', GinaRules.readConsent(contact(1, 'x', null, false))[0]);
        Assert.areEqual('missing', GinaRules.readConsent(new Contact(LastName = 'sem campos'))[0]);
    }

    @IsTest
    static void contactsWithoutPurchasesNeverBecomeVip() {
        List<Contact> contacts = new List<Contact>{
            contact(1, 'Sem compra 1', 'granted', false),
            contact(2, 'Sem compra 2', 'granted', false),
            contact(3, 'Sem compra 3', 'granted', false),
            contact(4, 'Eva', 'granted', false)
        };
        List<Order> orders = new List<Order>{ order(4, Date.newInstance(2026, 10, 1), 50, 'Activated') };
        for (GinaRules.Customer c : GinaRules.buildCustomers(contacts, orders, TODAY)) {
            if (c.orderCount == 0) {
                Assert.isFalse(c.isVip, c.name + ' não comprou e não pode ser VIP');
                Assert.areEqual('request_audience', c.facts.recommendedAction);
            }
        }
    }

    @IsTest
    static void delayedVipGetsHumanContactAndHighPriorityTask() {
        List<Contact> contacts = new List<Contact>{
            contact(1, 'Vera VIP', 'granted', false),
            contact(2, 'Leo', 'granted', false),
            contact(3, 'Mia', 'granted', false)
        };
        List<Order> orders = new List<Order>{
            // Vera: a cada 20 dias, última há 40 (2x) e a maior compradora → VIP atrasada
            order(1, Date.newInstance(2026, 7, 22), 500, 'Activated'),
            order(1, Date.newInstance(2026, 8, 11), 500, 'Activated'),
            order(1, Date.newInstance(2026, 8, 31), 500, 'Activated'),
            order(2, Date.newInstance(2026, 10, 1), 30, 'Activated'),
            order(3, Date.newInstance(2026, 10, 2), 20, 'Activated')
        };
        Map<String, GinaRules.Customer> customers = byName(GinaRules.buildCustomers(contacts, orders, TODAY));
        GinaRules.Customer vera = customers.get('Vera VIP');

        Assert.isTrue(vera.isVip, vera.vipReason);
        Assert.areEqual('vip_delayed', vera.facts.classification);
        Assert.areEqual('concierge_human', vera.facts.recommendedAction);

        Task task = GinaRules.buildOwnerTask(vera, TODAY);
        Assert.areEqual('Gina: contato pessoal com cliente VIP · Vera VIP', task.Subject);
        Assert.areEqual('High', task.Priority);
        Assert.areEqual(vera.contactId, task.WhoId);
        Assert.isTrue(task.Description.contains('A Gina não redige nem envia nada.'));
        Assert.isTrue(task.Description.contains('ritmo habitual de 20 dias'));

        Assert.areEqual('new_customer', customers.get('Leo').facts.classification);
        Assert.areEqual('aprovar boas-vindas', GinaRules.ownerTaskTitle(customers.get('Leo')));
    }

    @IsTest
    static void dormancyTakesPrecedenceEvenForVip() {
        List<Date> every10Days = new List<Date>{ Date.newInstance(2026, 6, 1), Date.newInstance(2026, 6, 11), Date.newInstance(2026, 6, 21) };
        GinaRules.Decision dormant = GinaRules.evaluate(every10Days, TODAY, 300, true, 'granted', 0);
        Assert.areEqual('dormant', dormant.classification);
        Assert.areEqual('dormancy_rest', dormant.recommendedAction);
        Assert.isTrue(dormant.explanation.contains('inclusive para clientes VIP'));

        List<Date> recent = new List<Date>{ Date.newInstance(2026, 9, 20), Date.newInstance(2026, 9, 30) };
        GinaRules.Decision ignored = GinaRules.evaluate(recent, TODAY, 100, false, 'granted', 3);
        Assert.areEqual('dormancy_rest', ignored.recommendedAction, 'regra dos 3 contatos ignorados');
        Assert.isTrue(ignored.explanation.contains('3 contatos anteriores foram ignorados'));
    }

    @IsTest
    static void singlePurchaseDayAndInvalidInputs() {
        GinaRules.Decision sameDay = GinaRules.evaluate(
            new List<Date>{ Date.newInstance(2026, 10, 1), Date.newInstance(2026, 10, 1) }, TODAY, 80, false, 'granted', 0);
        Assert.areEqual('new_customer', sameDay.classification);
        Assert.areEqual(2, sameDay.frequency, 'dois pedidos no mesmo dia contam na frequência');
        Assert.isTrue(sameDay.explanation.startsWith('Cliente novo (2 pedidos em 1 único dia'));

        GinaRules.Decision oneOff = GinaRules.evaluate(new List<Date>{ Date.newInstance(2026, 8, 1) }, TODAY, 80, false, 'granted', 0);
        Assert.areEqual('oneoff_delayed', oneOff.classification);
        Assert.areEqual(70, oneOff.recencyDays);

        GinaRules.Decision future = GinaRules.evaluate(new List<Date>{ Date.newInstance(2026, 10, 11) }, TODAY, 80, false, 'granted', 0);
        Assert.areEqual('reject_invalid', future.recommendedAction);

        GinaRules.Decision negative = GinaRules.evaluate(new List<Date>{ TODAY }, TODAY, -1, false, 'granted', 0);
        Assert.areEqual('invalid_input', negative.classification);
    }

    @IsTest
    static void medianAndVipRankingFollowTheMethod() {
        Assert.isNull(GinaRules.calculateMedian(new List<Decimal>()));
        Assert.areEqual(20, GinaRules.calculateMedian(new List<Decimal>{ 30, 10, 20 }));
        Assert.areEqual(22.5, GinaRules.calculateMedian(new List<Decimal>{ 10, 20, 25, 40 }));
        Assert.areEqual('30', GinaRules.fmt(30.0));
        Assert.areEqual('2.33', GinaRules.fmt(2.330));

        List<GinaRules.RankItem> two = new List<GinaRules.RankItem>{
            new GinaRules.RankItem(fakeId(1), 5, 500), new GinaRules.RankItem(fakeId(2), 1, 10)
        };
        Assert.isFalse(GinaRules.classifyVip(fakeId(1), two).isVip, 'base com menos de 3 não define VIP');

        List<GinaRules.RankItem> base = new List<GinaRules.RankItem>{
            new GinaRules.RankItem(fakeId(1), 5, 500),
            new GinaRules.RankItem(fakeId(2), 5, 100),
            new GinaRules.RankItem(fakeId(3), 1, 600),
            new GinaRules.RankItem(fakeId(4), 1, 10),
            new GinaRules.RankItem(fakeId(5), 1, 10),
            new GinaRules.RankItem(fakeId(6), 1, 10)
        };
        // corte = 2; empate em frequência divide a posição #1 (ranking de competição)
        Assert.isTrue(GinaRules.classifyVip(fakeId(1), base).isVip);
        Assert.isFalse(GinaRules.classifyVip(fakeId(2), base).isVip, 'gasto #3 fica fora do terço');
        Assert.isFalse(GinaRules.classifyVip(fakeId(3), base).isVip, 'frequência #3 fica fora do terço');
        Assert.isFalse(GinaRules.classifyVip(fakeId(9), base).isVip);
    }
}
