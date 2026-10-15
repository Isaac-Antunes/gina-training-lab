/**
 * Jornadas: o mesmo cliente visto em datas diferentes, do primeiro pedido à
 * dormência. Cada teste conta uma história inteira e confere, a cada passo, a
 * decisão da Gina e se ela pede ou não uma tarefa para o dono. Em nenhum passo
 * alguém fala com o cliente sem a aprovação do dono.
 */
@IsTest
private class GinaJourneyTest {
    private static Id fakeId(Integer n) {
        return Id.valueOf('003' + String.valueOf(n).leftPad(12, '0'));
    }

    private static Contact contact(Integer n, String name, String consent, Boolean optOut, Integer ignored) {
        // Name é calculado pela Salesforce: só dá para preencher pela desserialização.
        return (Contact) JSON.deserialize(
            JSON.serialize(new Map<String, Object>{
                'attributes' => new Map<String, Object>{ 'type' => 'Contact' },
                'Id' => fakeId(n),
                'Name' => name,
                'LastName' => name,
                'HasOptedOutOfEmail' => optOut,
                GinaRules.CONSENT_FIELD => consent,
                GinaRules.IGNORED_FIELD => ignored
            }),
            Contact.class
        );
    }

    private static Order order(Integer contactN, Date day, Decimal total) {
        // TotalAmount é calculado pela Salesforce: só dá para preencher pela desserialização.
        return (Order) JSON.deserialize(
            JSON.serialize(new Map<String, Object>{
                'attributes' => new Map<String, Object>{ 'type' => 'Order' },
                'BillToContactId' => fakeId(contactN),
                'EffectiveDate' => day,
                'TotalAmount' => total,
                'Status' => 'Activated'
            }),
            Order.class
        );
    }

    /** O cliente `name` como a Gina o vê em `today`, dentro da base dada. */
    private static GinaRules.Customer seenOn(String name, List<Contact> contacts, List<Order> orders, Date today) {
        for (GinaRules.Customer c : GinaRules.buildCustomers(contacts, orders, today)) {
            if (c.name == name) return c;
        }
        return null;
    }

    private static void assertQuiet(GinaRules.Customer customer, Date today, String why) {
        Assert.isNull(GinaRules.ownerTaskTitle(customer), why);
        Assert.isNull(GinaRules.buildOwnerTask(customer, today), why);
    }

    @IsTest
    static void newCustomerBecomesRegularThenDelaysThenRests() {
        List<Contact> contacts = new List<Contact>{ contact(1, 'Leo', 'granted', false, 0) };
        Order first = order(1, Date.newInstance(2026, 9, 1), 80);
        Order second = order(1, Date.newInstance(2026, 9, 11), 80);

        // 1. Dia 6: um único dia de compra → boas-vindas, aprovadas pelo dono.
        Date day6 = Date.newInstance(2026, 9, 6);
        GinaRules.Customer welcome = seenOn('Leo', contacts, new List<Order>{ first }, day6);
        Assert.areEqual('new_customer', welcome.facts.classification);
        Assert.areEqual('aprovar boas-vindas', GinaRules.ownerTaskTitle(welcome));
        Task welcomeTask = GinaRules.buildOwnerTask(welcome, day6);
        Assert.isTrue(welcomeTask.Description.contains('Nada foi enviado ao cliente.'));

        // 2. Dia 15: voltou e já tem ritmo de 10 dias → em ritmo, silêncio.
        Date day15 = Date.newInstance(2026, 9, 15);
        GinaRules.Customer inRhythm = seenOn('Leo', contacts, new List<Order>{ first, second }, day15);
        Assert.areEqual('in_rhythm', inRhythm.facts.classification);
        Assert.areEqual('no_message', inRhythm.facts.recommendedAction);
        Assert.areEqual(10, inRhythm.facts.medianIntervalDays);
        assertQuiet(inRhythm, day15, 'cliente em ritmo não gera tarefa');

        // 3. Dia 28: 17 dias sem comprar (1,7x o ritmo) → lembrete amigável.
        Date day28 = Date.newInstance(2026, 9, 28);
        GinaRules.Customer late = seenOn('Leo', contacts, new List<Order>{ first, second }, day28);
        Assert.areEqual('delay', late.facts.classification);
        Assert.areEqual('aprovar lembrete amigável', GinaRules.ownerTaskTitle(late));
        Assert.areEqual('Normal', GinaRules.buildOwnerTask(late, day28).Priority);

        // 4. 15/10: 34 dias sem comprar (3,4x o ritmo) → descanso, sem tarefa.
        Date oct15 = Date.newInstance(2026, 10, 15);
        GinaRules.Customer dormant = seenOn('Leo', contacts, new List<Order>{ first, second }, oct15);
        Assert.areEqual('dormant', dormant.facts.classification);
        Assert.areEqual('dormancy_rest', dormant.facts.recommendedAction);
        assertQuiet(dormant, oct15, 'cliente em descanso não gera tarefa');
    }

    @IsTest
    static void vipIsServedByAPersonAndThenLeftAlone() {
        List<Contact> contacts = new List<Contact>{
            contact(1, 'Vera VIP', 'granted', false, 0),
            contact(2, 'Leo', 'granted', false, 0),
            contact(3, 'Mia', 'granted', false, 0)
        };
        List<Order> orders = new List<Order>{
            order(1, Date.newInstance(2026, 7, 22), 500),
            order(1, Date.newInstance(2026, 8, 11), 500),
            order(1, Date.newInstance(2026, 8, 31), 500),
            order(2, Date.newInstance(2026, 9, 1), 30),
            order(3, Date.newInstance(2026, 9, 2), 20)
        };

        // 1. 10/09: 10 dias da última compra, ritmo de 20 → em ritmo, mesmo sendo VIP.
        Date sep10 = Date.newInstance(2026, 9, 10);
        GinaRules.Customer calm = seenOn('Vera VIP', contacts, orders, sep10);
        Assert.isTrue(calm.isVip, calm.vipReason);
        Assert.areEqual('in_rhythm', calm.facts.classification);
        assertQuiet(calm, sep10, 'VIP em ritmo também recebe silêncio');

        // 2. 10/10: 40 dias sem comprar (2x) → o dono fala pessoalmente, prioridade alta.
        Date oct10 = Date.newInstance(2026, 10, 10);
        GinaRules.Customer delayed = seenOn('Vera VIP', contacts, orders, oct10);
        Assert.areEqual('vip_delayed', delayed.facts.classification);
        Assert.areEqual('concierge_human', delayed.facts.recommendedAction);
        Task task = GinaRules.buildOwnerTask(delayed, oct10);
        Assert.areEqual('High', task.Priority);
        Assert.isTrue(task.Description.contains('A Gina não redige nem envia nada.'));

        // 3. 01/12: 92 dias sem comprar → o descanso vence até o VIP.
        Date dec1 = Date.newInstance(2026, 12, 1);
        GinaRules.Customer dormant = seenOn('Vera VIP', contacts, orders, dec1);
        Assert.areEqual('dormant', dormant.facts.classification);
        Assert.areEqual('dormancy_rest', dormant.facts.recommendedAction);
        assertQuiet(dormant, dec1, 'a regra de descanso precede o VIP');
    }

    @IsTest
    static void revokingConsentStopsEverySuggestionEvenForVip() {
        List<Order> orders = new List<Order>{
            order(1, Date.newInstance(2026, 7, 22), 500),
            order(1, Date.newInstance(2026, 8, 11), 500),
            order(1, Date.newInstance(2026, 8, 31), 500),
            order(2, Date.newInstance(2026, 9, 1), 30),
            order(3, Date.newInstance(2026, 9, 2), 20)
        };
        Date oct10 = Date.newInstance(2026, 10, 10);

        // Antes: consentimento dado, VIP atrasada → pede contato humano.
        List<Contact> granted = new List<Contact>{
            contact(1, 'Vera VIP', 'granted', false, 0), contact(2, 'Leo', 'granted', false, 0), contact(3, 'Mia', 'granted', false, 0)
        };
        Assert.areEqual('contato pessoal com cliente VIP', GinaRules.ownerTaskTitle(seenOn('Vera VIP', granted, orders, oct10)));

        // Depois: opt-out de e-mail → bloqueio total, apesar de VIP e do atraso.
        List<Contact> optedOut = new List<Contact>{
            contact(1, 'Vera VIP', 'granted', true, 0), contact(2, 'Leo', 'granted', false, 0), contact(3, 'Mia', 'granted', false, 0)
        };
        GinaRules.Customer blocked = seenOn('Vera VIP', optedOut, orders, oct10);
        Assert.isTrue(blocked.isVip, 'continua VIP; o consentimento é que manda');
        Assert.areEqual('governance_violation', blocked.facts.classification);
        Assert.areEqual('refuse_spam', blocked.facts.recommendedAction);
        assertQuiet(blocked, oct10, 'sem consentimento não há tarefa de contato');

        // Revogação pelo campo da Gina tem o mesmo efeito.
        List<Contact> revoked = new List<Contact>{
            contact(1, 'Vera VIP', 'revoked', false, 0), contact(2, 'Leo', 'granted', false, 0), contact(3, 'Mia', 'granted', false, 0)
        };
        GinaRules.Customer revokedVera = seenOn('Vera VIP', revoked, orders, oct10);
        Assert.areEqual('refuse_spam', revokedVera.facts.recommendedAction);
        assertQuiet(revokedVera, oct10, 'revogado pelo campo da Gina');
    }

    @IsTest
    static void consentIsNeverPresumedForANewCustomer() {
        // Cliente que nunca disse sim: nem as boas-vindas viram tarefa.
        List<Contact> contacts = new List<Contact>{ contact(1, 'Nina', null, false, 0) };
        Date today = Date.newInstance(2026, 10, 10);
        GinaRules.Customer nina = seenOn('Nina', contacts, new List<Order>{ order(1, Date.newInstance(2026, 10, 7), 90) }, today);
        Assert.areEqual('missing', nina.consent);
        Assert.areEqual('refuse_spam', nina.facts.recommendedAction);
        assertQuiet(nina, today, 'sem consentimento documentado não há boas-vindas');
    }

    @IsTest
    static void threeIgnoredMessagesPutAnActiveCustomerToRest() {
        List<Order> orders = new List<Order>{
            order(1, Date.newInstance(2026, 9, 20), 60),
            order(1, Date.newInstance(2026, 9, 30), 60)
        };
        Date today = Date.newInstance(2026, 10, 10);

        // Compra de 10 em 10 dias, última há 18 (1,8x): 2 contatos ignorados ainda permitem um lembrete.
        GinaRules.Customer twoIgnored = seenOn('Rui', new List<Contact>{ contact(1, 'Rui', 'granted', false, 2) }, orders, today.addDays(8));
        Assert.areEqual('delay', twoIgnored.facts.classification);
        Assert.areEqual('aprovar lembrete amigável', GinaRules.ownerTaskTitle(twoIgnored));

        // O terceiro contato ignorado leva ao descanso, mesmo com a compra recente.
        GinaRules.Customer threeIgnored = seenOn('Rui', new List<Contact>{ contact(1, 'Rui', 'granted', false, 3) }, orders, today);
        Assert.areEqual('dormancy_rest', threeIgnored.facts.recommendedAction);
        Assert.isTrue(threeIgnored.facts.explanation.contains('3 contatos anteriores foram ignorados'));
        assertQuiet(threeIgnored, today, 'a Gina para de insistir em quem ignora três vezes');
    }
}
