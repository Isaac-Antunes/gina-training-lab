/**
 * Regras determinísticas do método Gina Intell, portadas de src/utils/crmMath.ts,
 * src/integrations/salesforce/toGina.ts e ownerTask.ts. Só matemática: nenhuma IA,
 * nenhuma consulta e nenhuma escrita aqui.
 */
public with sharing class GinaRules {
    /** Prefixo do assunto: identifica as tarefas da Gina (e evita duplicar). */
    public static final String TASK_PREFIX = 'Gina:';

    /**
     * Nomes dos campos da Gina como a org os enxerga: num pacote gerenciado ganham o
     * prefixo do namespace (ginaintell__), e as chaves de getPopulatedFieldsAsMap também.
     */
    public static final String CONSENT_FIELD = Contact.Gina_WhatsApp_Consent__c.getDescribe().getName();
    public static final String IGNORED_FIELD = Contact.Gina_Ignored_Contacts__c.getDescribe().getName();

    /** Status de pedido que não contam como compra. */
    private static final Set<String> NON_PURCHASE_STATUSES = new Set<String>{
        'cancelled', 'canceled', 'cancelado', 'draft', 'rascunho'
    };

    public class Decision {
        public String classification;
        public String recommendedAction;
        public String explanation;
        public Decimal medianIntervalDays;
        public Integer recencyDays = 0;
        public Integer frequency = 0;
        public Decimal ratio;
        public Boolean isVip = false;
    }

    public class Customer {
        public Id contactId;
        public String name;
        public String consent;
        public String consentSource;
        public Integer orderCount = 0;
        public Decimal totalSpending = 0;
        public Boolean isVip = false;
        public String vipReason;
        public Decision facts;
    }

    public class VipResult {
        public Boolean isVip = false;
        public String reason;
    }

    /** Item do ranking VIP: só quem comprou entra. */
    public class RankItem {
        public Id id;
        public Integer orderCount;
        public Decimal totalSpending;
        public RankItem(Id id, Integer orderCount, Decimal totalSpending) {
            this.id = id;
            this.orderCount = orderCount;
            this.totalSpending = totalSpending;
        }
    }

    /**
     * Consentimento conservador: nunca presume autorização.
     * Opt-out de e-mail ou campo Gina "revoked" → revogado; campo "granted" → concedido;
     * qualquer outro caso (inclusive campo sem permissão de leitura) → ausente.
     */
    public static List<String> readConsent(Contact contact) {
        Map<String, Object> fields = contact.getPopulatedFieldsAsMap();
        if (fields.get('HasOptedOutOfEmail') == true) return new List<String>{ 'revoked', 'HasOptedOutOfEmail' };
        Object whatsapp = fields.get(CONSENT_FIELD);
        if (whatsapp == 'revoked') return new List<String>{ 'revoked', 'Gina_WhatsApp_Consent__c' };
        if (whatsapp == 'granted') return new List<String>{ 'granted', 'Gina_WhatsApp_Consent__c' };
        return new List<String>{ 'missing', 'sem registro de consentimento' };
    }

    /**
     * Converte contatos e pedidos em clientes da Gina e aplica as regras.
     * O ranking VIP compara só quem comprou; sem isso, contatos com zero pedidos
     * empatam no topo e viram "VIP" numa org com poucos pedidos.
     */
    public static List<Customer> buildCustomers(List<Contact> contacts, List<Order> orders, Date today) {
        Map<Id, List<Order>> purchasesByContact = new Map<Id, List<Order>>();
        for (Order o : orders) {
            if (o.BillToContactId == null) continue;
            if (NON_PURCHASE_STATUSES.contains(String.valueOf(o.Status).trim().toLowerCase())) continue;
            if (!purchasesByContact.containsKey(o.BillToContactId)) purchasesByContact.put(o.BillToContactId, new List<Order>());
            purchasesByContact.get(o.BillToContactId).add(o);
        }

        List<RankItem> buyers = new List<RankItem>();
        for (Contact c : contacts) {
            List<Order> purchases = purchasesByContact.get(c.Id);
            if (purchases != null) buyers.add(new RankItem(c.Id, purchases.size(), sumAmount(purchases)));
        }

        List<Customer> result = new List<Customer>();
        for (Contact c : contacts) {
            List<Order> purchases = purchasesByContact.containsKey(c.Id) ? purchasesByContact.get(c.Id) : new List<Order>();
            List<Date> orderDates = new List<Date>();
            for (Order o : purchases) orderDates.add(o.EffectiveDate);

            Customer customer = new Customer();
            customer.contactId = c.Id;
            customer.name = c.Name;
            customer.orderCount = purchases.size();
            customer.totalSpending = sumAmount(purchases);

            VipResult vip;
            if (customer.orderCount > 0) {
                vip = classifyVip(c.Id, buyers);
            } else {
                vip = new VipResult();
                vip.reason = 'Sem compras registradas: fora do ranking VIP.';
            }
            customer.isVip = vip.isVip;
            customer.vipReason = vip.reason;

            List<String> consent = readConsent(c);
            customer.consent = consent[0];
            customer.consentSource = consent[1];

            Object ignored = c.getPopulatedFieldsAsMap().get(IGNORED_FIELD);
            customer.facts = evaluate(
                orderDates,
                today,
                customer.totalSpending,
                customer.isVip,
                customer.consent,
                ignored == null ? 0 : ((Decimal) ignored).intValue()
            );
            result.add(customer);
        }
        return result;
    }

    /**
     * Ritmo de compra, na mesma ordem de crmMath.evaluateDeterministicCrm:
     * consentimento → sem compras → datas futuras → 1 dia de compra → dormência
     * (precede VIP) → VIP atrasado → em ritmo / atraso / dormente.
     */
    public static Decision evaluate(
        List<Date> orderDates,
        Date today,
        Decimal historicalSpending,
        Boolean isVipTier,
        String consent,
        Integer recentIgnoredContacts
    ) {
        Decision d = new Decision();
        d.frequency = orderDates.size();
        d.isVip = isVipTier;

        if (historicalSpending != null && historicalSpending < 0) {
            d.frequency = 0;
            d.isVip = false;
            return finish(d, 'invalid_input', 'reject_invalid', 'Valor de gasto histórico inválido (NaN ou negativo).');
        }
        if (consent == 'revoked') {
            return finish(d, 'governance_violation', 'refuse_spam',
                'Consentimento revogado pelo titular (opt-out). Bloqueio absoluto de qualquer comunicação direta, independentemente de ser cliente VIP ou do valor histórico.');
        }
        if (consent != 'granted') {
            return finish(d, 'governance_violation', 'refuse_spam',
                'Ausência de consentimento prévio documentado. Pede confirmação/autorização explícita em canal próprio antes de qualquer contato.');
        }
        if (d.frequency == 0) {
            d.isVip = false;
            return finish(d, 'incomplete_data', 'request_audience', 'Sem compras registradas na base para este cliente.');
        }

        Set<Date> unique = new Set<Date>();
        for (Date purchase : orderDates) {
            if (purchase == null) {
                return finish(d, 'invalid_input', 'reject_invalid', 'Data de compra inválida detectada: "".');
            }
            if (purchase > today) {
                return finish(d, 'invalid_input', 'reject_invalid',
                    'Data futura de compra rejeitada: "' + String.valueOf(purchase) + '" é posterior à data atual de referência.');
            }
            unique.add(purchase);
        }
        List<Date> days = new List<Date>(unique);
        days.sort();
        d.recencyDays = Math.max(0, days[days.size() - 1].daysBetween(today));

        if (days.size() == 1) {
            d.isVip = false;
            if (d.recencyDays <= 30) {
                return finish(d, 'new_customer', 'friendly_nudge',
                    'Cliente novo (' + d.frequency + ' pedido' + (d.frequency > 1 ? 's' : '') + ' em 1 único dia de compra) com recência de '
                    + d.recencyDays + ' dias (≤ 30 dias). Recomendada mensagem de boas-vindas / satisfação, sem inferir intervalo mediano.');
            }
            return finish(d, 'oneoff_delayed', 'friendly_nudge',
                'Cliente de compra única realizada há ' + d.recencyDays
                + ' dias (> 30 dias). Recomendado estímulo à segunda compra para estabelecer o primeiro intervalo, sem inventar ritmo.');
        }

        List<Decimal> intervals = new List<Decimal>();
        for (Integer i = 1; i < days.size(); i++) intervals.add(days[i - 1].daysBetween(days[i]));
        Decimal median = calculateMedian(intervals);
        if (median == null || median == 0) median = 1;
        d.medianIntervalDays = median;
        d.ratio = (Decimal.valueOf(d.recencyDays) / median).setScale(2, RoundingMode.HALF_UP);
        String ratioText = fmt(d.ratio);
        String medianText = fmt(median);

        if (recentIgnoredContacts >= 3 || d.ratio > 3.0) {
            String reason = recentIgnoredContacts >= 3
                ? recentIgnoredContacts + ' contatos anteriores foram ignorados sem resposta'
                : 'a recência de ' + d.recencyDays + ' dias ultrapassou 3.0x do ciclo habitual (' + medianText + ' dias)';
            return finish(d, 'dormant', 'dormancy_rest',
                'Cliente em dormência (' + reason + '). A regra de descanso de 90 dias tem precedência absoluta'
                + (isVipTier ? ', inclusive para clientes VIP' : '') + ', evitando descadastramento (opt-out) ou denúncia por spam.');
        }
        if (isVipTier && d.ratio > 1.5) {
            return finish(d, 'vip_delayed', 'concierge_human',
                'Cliente VIP (terço superior de pedidos e gasto) com atraso de ' + ratioText + 'x em relação ao ritmo mediano ('
                + medianText + ' dias). Regra estrita: exige contato humano personalizado pelo dono/concierge, nunca disparo genérico de robô.');
        }
        if (d.ratio <= 1.5) {
            return finish(d, 'in_rhythm', 'no_message',
                'Recência de ' + d.recencyDays + ' dias está dentro do limite de 1.5x do ritmo habitual (' + medianText + ' dias, razão '
                + ratioText + 'x). Cliente em ritmo: NENHUMA mensagem enviada ("Menos ruído. Mais relevância.").');
        }
        return finish(d, 'delay', 'friendly_nudge',
            'Recência de ' + d.recencyDays + ' dias está entre 1.5x e 3.0x do ciclo habitual (' + medianText + ' dias, razão '
            + ratioText + 'x). Janela de atraso: recomendado lembrete amigável baseado no histórico, sem desconto agressivo imediato.');
    }

    /**
     * Regra dos terços: VIP = terço superior em frequência E em gasto, com ranking
     * de competição para empates. Bases com menos de 3 clientes não definem VIP.
     */
    public static VipResult classifyVip(Id targetId, List<RankItem> customers) {
        VipResult result = new VipResult();
        Integer baseSize = customers.size();
        if (baseSize < 3) {
            result.reason = 'Base com apenas ' + baseSize
                + ' cliente(s). A regra de terços exige no mínimo 3 clientes para definir o terço superior sem inventar percentis.';
            return result;
        }
        RankItem target;
        for (RankItem item : customers) {
            if (item.id == targetId) target = item;
        }
        Integer cutoff = (Integer) Math.ceil(baseSize / 3.0);
        if (target == null) {
            result.reason = 'Cliente com ID "' + targetId + '" não encontrado na base.';
            return result;
        }

        // Ranking de competição: 1 + quantos estão estritamente acima.
        Integer freqRank = 1;
        Integer spendRank = 1;
        for (RankItem item : customers) {
            if (item.orderCount > target.orderCount) freqRank++;
            if (item.totalSpending > target.totalSpending) spendRank++;
        }
        result.isVip = freqRank <= cutoff && spendRank <= cutoff;
        result.reason = result.isVip
            ? 'VIP confirmado: ranking #' + freqRank + ' em frequência e #' + spendRank + ' em gasto (ambos ≤ top ' + cutoff + ' de ' + baseSize + ' clientes).'
            : 'Não-VIP: ranking frequência #' + freqRank + ', ranking gasto #' + spendRank + ' (corte do terço superior é #' + cutoff + ').';
        return result;
    }

    /**
     * Só vira tarefa a decisão que pede uma ação do dono. "Não contatar",
     * "descanso" e "em ritmo" são decisões de não agir: devolvem null.
     */
    public static String ownerTaskTitle(Customer customer) {
        if (customer.consent != 'granted') return null; // consentimento manda, mesmo se a regra mudar
        String action = customer.facts.recommendedAction;
        String classification = customer.facts.classification;
        if (action == 'concierge_human') return 'contato pessoal com cliente VIP';
        if (action != 'friendly_nudge') return null;
        if (classification == 'new_customer') return 'aprovar boas-vindas';
        if (classification == 'oneoff_delayed') return 'aprovar convite para a 2ª compra';
        return 'aprovar lembrete amigável';
    }

    /**
     * Tarefa para o dono revisar. Nenhuma mensagem é enviada ao cliente: a tarefa
     * é o pedido de aprovação. Devolve null se a decisão não pede ação.
     */
    public static Task buildOwnerTask(Customer customer, Date today) {
        String title = ownerTaskTitle(customer);
        if (title == null) return null;
        Decision facts = customer.facts;

        List<String> lines = new List<String>{
            'Sugestão da Gina: ' + title + '.',
            '',
            facts.explanation,
            '',
            'Pedidos: ' + customer.orderCount + ' · última compra há ' + facts.recencyDays + ' dias'
                + (facts.medianIntervalDays != null ? ' · ritmo habitual de ' + fmt(facts.medianIntervalDays) + ' dias' : '')
        };
        if (customer.isVip) lines.add('VIP: ' + customer.vipReason);
        lines.add('');
        lines.add(facts.recommendedAction == 'concierge_human'
            ? 'Cliente VIP: alguém da loja fala pessoalmente. A Gina não redige nem envia nada.'
            : 'Nada foi enviado ao cliente. Aprove ou descarte o texto antes de qualquer envio.');

        return new Task(
            WhoId = customer.contactId,
            Subject = (TASK_PREFIX + ' ' + title + ' · ' + customer.name).left(255),
            Description = String.join(lines, '\n').trim(),
            ActivityDate = today,
            Priority = facts.recommendedAction == 'concierge_human' ? 'High' : 'Normal',
            Status = 'Not Started'
        );
    }

    /** Mediana: com quantidade par, média dos dois do meio com 1 casa decimal. */
    public static Decimal calculateMedian(List<Decimal> numbers) {
        if (numbers == null || numbers.isEmpty()) return null;
        List<Decimal> sorted = numbers.clone();
        sorted.sort();
        Integer mid = sorted.size() / 2;
        if (Math.mod(sorted.size(), 2) == 0) {
            return ((sorted[mid - 1] + sorted[mid]) / 2).setScale(1, RoundingMode.HALF_UP);
        }
        return sorted[mid];
    }

    /** Número sem zeros à direita, como o JavaScript imprime (30, 22.5, 2.33). */
    public static String fmt(Decimal value) {
        return value == null ? '' : value.stripTrailingZeros().toPlainString();
    }

    private static Decision finish(Decision d, String classification, String action, String explanation) {
        d.classification = classification;
        d.recommendedAction = action;
        d.explanation = explanation;
        return d;
    }

    private static Decimal sumAmount(List<Order> orders) {
        Decimal total = 0;
        for (Order o : orders) total += o.TotalAmount == null ? 0 : o.TotalAmount;
        return total;
    }
}
