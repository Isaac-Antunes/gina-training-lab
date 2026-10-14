# Testes

Estado em 14/10/2026: **17 testes Apex passando, 99% de cobertura na org**. O Salesforce mostra "18" porque conta junto o método de preparação (`@TestSetup`) de `GinaActionsTest`.

## O que cada arquivo prova

| Arquivo | Testes | O que prova |
|---|---|---|
| `GinaRulesTest` | 7 | Regras isoladas: do registro à decisão, consentimento, VIP, dormência, mediana, entradas inválidas. Mesmos casos de `scripts/salesforce.test.mjs`, para Apex e Node decidirem igual. |
| `GinaActionsTest` | 5 | Ações contra registros de verdade: tarefa única e sem duplicata, nada quando a decisão não pede ação, nada sem leitura do consentimento. Rodam como dono com `Gina_Demo`. |
| `GinaJourneyTest` | 5 | **Jornadas**: o mesmo cliente em datas diferentes (ver abaixo). Só regras, sem DML, rápidos. |

## Jornadas (`GinaJourneyTest`)

| Jornada | História | O que confere |
|---|---|---|
| Cliente novo | Dia 6 boas-vindas → dia 15 em ritmo → dia 28 lembrete → 15/10 descanso | A decisão e a tarefa (ou o silêncio) a cada data. |
| VIP | Em ritmo → atrasada (contato humano, prioridade alta) → dormente | O descanso vence o VIP; a tarefa de VIP é `High`. |
| Consentimento revogado | VIP atrasada pede contato; depois opt-out ou revogação | Bloqueio total e nenhuma tarefa, apesar de VIP. |
| Sem consentimento | Cliente novo que nunca disse sim | Nem as boas-vindas viram tarefa. |
| Contatos ignorados | 2 ignorados ainda permitem lembrete; 3 levam ao descanso | A regra dos 3 contatos. |

Cada jornada confere também que **nenhuma tarefa nasce quando a decisão é silêncio**. Assim a regra "menos ruído" é testada ao longo do tempo, e não só num instante.

## Como rodar

```bash
cd salesforce
export PATH=~/.local/node/bin:$PATH

# Implantar e rodar tudo (org com Dev Hub, alias gina-dev)
sf project deploy start --source-dir force-app -o gina-dev
sf apex run test --test-level RunLocalTests --result-format human --code-coverage --wait 10 -o gina-dev

# Só as jornadas
sf apex run test --class-names GinaJourneyTest --result-format human --wait 10 -o gina-dev
```

Do lado Node: `npm test` e `npm run scan` antes de qualquer commit.

## Cobertura por classe (14/10/2026)

| Classe | Cobertura |
|---|---|
| GinaAnalyzeCustomerAction | 100% |
| GinaCreateOwnerTaskAction | 100% |
| GinaRules | 99% |
| GinaService | 98% |
| GinaCustomersNeedingActionAction | 95% |
| **Org (média)** | **99%** |

A versão gerenciada **0.1.0.1** também fechou em 99,00% (meta atingida).

## Como acrescentar uma jornada

1. Em `GinaJourneyTest`, monte os `Contact` e `Order` com os auxiliares `contact(...)` e `order(...)`. Não escreva o nome do campo à mão: use `GinaRules.CONSENT_FIELD` e `GinaRules.IGNORED_FIELD` (ver `o-que-deu-errado.md`, item 1).
2. Use `seenOn(nome, contatos, pedidos, hoje)` para ver o cliente em cada data.
3. Confira a **classificação**, a **ação** e se há tarefa (`ownerTaskTitle`).
4. Cuidado com as bordas: razão **exatamente 1,5** é "em ritmo"; **exatamente 3,0** ainda é "atraso".
5. Cenário de varejo bom para testar traz: datas dos pedidos, consentimento e a decisão esperada em cada data.

## O que os testes **não** cobrem

- Muitos registros ao mesmo tempo (limites do Apex sob carga).
- O agente conversando de verdade (a conversa foi conferida à mão, no painel).
- A instalação do pacote gerenciado numa org limpa.
