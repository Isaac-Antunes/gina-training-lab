# Como a Gina funciona

A Gina é uma camada de lifecycle de CRM para pequeno varejo. Ela lê clientes e pedidos, decide **uma coisa por cliente** e, quando a decisão pede uma pessoa, cria uma **tarefa para o dono**. Ela **nunca envia mensagem a um cliente**.

## As quatro saídas possíveis

| Saída | Significa | Vira tarefa? |
|---|---|---|
| Silêncio | Cliente em ritmo, em descanso ou sem consentimento. | Não |
| Lembrete amigável | Atrasou um pouco, é cliente novo ou de compra única parada. | Sim, para o dono aprovar. |
| Contato humano | Cliente VIP em atraso. Alguém da loja fala pessoalmente. | Sim, prioridade alta. |
| Bloqueio | Sem consentimento, com opt-out, ou dado inválido. | Não |

Princípio do método: **"Menos ruído. Mais relevância."**

## Ordem das decisões

`GinaRules.evaluate` aplica as regras sempre nesta ordem; a primeira que vale encerra a decisão.

1. **Dado inválido** (gasto negativo): rejeita.
2. **Consentimento revogado**: bloqueio absoluto, mesmo para VIP.
3. **Consentimento ausente**: bloqueio; pede autorização em canal próprio.
4. **Sem compras**: pede dados; não é VIP.
5. **Datas inválidas ou futuras**: rejeita.
6. **Um único dia de compra**: até 30 dias é *cliente novo* (boas-vindas); depois disso, *compra única parada* (convite à 2ª compra). Não inventa ritmo.
7. **Dormência**: 3 ou mais contatos ignorados, **ou** recência acima de 3,0 vezes o ritmo. O descanso vence até o VIP.
8. **VIP atrasado**: VIP com recência acima de 1,5 vez o ritmo → contato humano.
9. **Em ritmo**: recência até 1,5 vez o ritmo → silêncio.
10. **Atraso**: entre 1,5 e 3,0 vezes → lembrete amigável.

O **ritmo** é a mediana dos intervalos entre dias de compra. A **razão** é recência dividida pelo ritmo. Razão exatamente 1,5 ainda conta como em ritmo.

## O que é VIP

Terço superior em **frequência e gasto ao mesmo tempo**, com ranking de competição para empates. A base precisa ter **pelo menos 3 compradores**; menos que isso não define VIP. Contato sem pedidos nunca entra no ranking. Pedidos cancelados ou em rascunho não contam como compra.

## Consentimento (conservador)

Nunca presume autorização.

| Situação | Resultado |
|---|---|
| Opt-out de e-mail do Contato | revogado |
| Campo `Gina_WhatsApp_Consent__c` = `revoked` | revogado |
| Campo = `granted` | concedido |
| Qualquer outro caso, inclusive campo sem permissão de leitura | ausente (bloqueia) |

## O que a Gina escreve

**Uma única coisa: uma `Task`** com assunto `Gina: <título> · <cliente>`, na data de hoje, com o motivo da decisão. Antes de criar, ela recalcula a decisão lendo a org (não confia no que o pedido diz) e **não cria outra se já houver uma tarefa da Gina aberta** para o contato. A descrição sempre termina deixando claro que nada foi enviado.

## Peças

| Peça | Papel |
|---|---|
| `GinaRules` | Só matemática e regras: sem consulta, sem escrita, sem IA. |
| `GinaService` | Lê Contact e Order com as permissões de quem pergunta; cria a Task. Teto de leitura de 5.000 contatos e 20.000 pedidos. |
| `GinaCustomersNeedingActionAction` | Lista quem pede ação (só leitura). |
| `GinaAnalyzeCustomerAction` | Explica a decisão de um cliente (só leitura). |
| `GinaCreateOwnerTaskAction` | Cria a tarefa para o dono. |
| Agente `Gina` (Agent Script) | Conversa em português no painel do Agentforce; só **explica** o que as ações devolvem. |

O agente não calcula nada. Toda decisão vem das ações em Apex; por isso Apex e Node dão o mesmo resultado (conferido em 29/29 contatos).

## Fluxo de um pedido

1. O dono pergunta no painel do Agentforce.
2. O agente chama uma ação.
3. A ação lê Contact e Order **como o usuário que perguntou**.
4. `GinaRules` calcula e devolve a decisão com a explicação.
5. Se o dono aceitar, `create_owner_task` recalcula, cria a `Task` e para por aí.
6. O dono aprova ou descarta e, se quiser, fala com o cliente por conta própria.
