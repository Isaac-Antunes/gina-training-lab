# Segurança

Este documento separa o que a Gina **garante por construção**, o que está **provado por teste** e o que **ainda não foi verificado**. Não há auditoria externa nem revisão de segurança da Salesforce até 14/10/2026.

## Garantias por construção

| Risco | Como a Gina evita | Onde |
|---|---|---|
| Mandar mensagem a cliente sem aprovação | Não existe nenhuma ação que envie mensagem. A única escrita é criar uma `Task` para o dono. | `GinaService.createOwnerTask`, as 3 ações |
| Contatar quem não autorizou | Consentimento ausente ou revogado bloqueia, inclusive VIP. Opt-out de e-mail também. | `GinaRules.readConsent`, `evaluate` |
| Ler dados que o usuário não pode ver | Contact lido com `stripInaccessible`; Order e Task com `WITH USER_MODE`; classes `with sharing`. | `GinaService` |
| Campo de consentimento ilegível liberar contato | Campo sem permissão de leitura conta como consentimento **ausente**. | `readConsent` |
| Tarefa duplicada ou decisão forjada | A ação recalcula a decisão lendo a org e não cria outra se já houver tarefa da Gina aberta. | `createOwnerTask`, `findOpenTask` |
| Escrever sem permissão | A `Task` é criada com `Database.insert(task, AccessLevel.USER_MODE)`. | `GinaService` |
| Agente "inventar" decisão | As instruções proíbem calcular e as decisões vêm das ações em Apex. | `Gina.agent`, `GinaRules` |
| Abuso de limite do Apex | Leitura limitada a 5.000 contatos e 20.000 pedidos. | `GinaService` |

## Quem pode usar

Dois conjuntos de permissão, separados de propósito:

- `Gina_Demo`: liberam as 3 ações e a leitura de `Gina_WhatsApp_Consent__c`, `Gina_Ignored_Contacts__c` e `HasOptedOutOfEmail`.
- `Gina_Agente`: dá acesso ao agente no painel do Agentforce.

Quem não tem `Gina_Demo` **não consegue ler o consentimento**, e a Gina trata isso como "sem consentimento": não sugere contato e não cria tarefa. Está provado em `withoutReadAccessToConsentTheGinaNeverSuggestsContact`.

## Como o agente se defende de instruções maliciosas

A defesa real **não está no texto do agente**, está nas ações. Mesmo que alguém convença o modelo de linguagem a desobedecer às instruções, ele só tem três ferramentas: listar, explicar e criar tarefa. Nenhuma envia mensagem, e a criação de tarefa recalcula a decisão e recusa sem consentimento. O cenário de injeção maliciosa do método está em `playground/cenario-6-violacao-de-consentimento-injecao-maliciosa.md`.

## Dados e segredos

- Dados de demonstração são **fictícios** (nenhum cliente real).
- Credenciais só em `.env.local`, ignorado pelo Git e excluído do ZIP. A vitrine pública não usa variáveis de ambiente.
- Instale dependências com `--frozen-lockfile`; não apague o `pnpm-lock.yaml` para "resolver" erro.
- Scripts de instalação: só `esbuild` liberado em `pnpm-workspace.yaml` (`allowBuilds`); `@google/genai` e `protobufjs` ficam negados de propósito.
- O site público `gina-crm` é estático (HTML e CSS), sem JavaScript, formulários ou cookies. Relatos de vulnerabilidade vão pelo **Security → Report a vulnerability** do GitHub. O CodeQL do repositório está desligado por escolha do dono.

## O que ainda não foi verificado

- **Revisão de segurança da Salesforce:** não feita. É obrigatória para anunciar no AppExchange.
- **Auditoria independente do Apex:** não feita; só os testes do próprio projeto.
- **Teste com muitos dados:** os testes usam dezenas de registros. O teto de 5.000/20.000 foi escolhido, não medido sob carga.
- **Chamadas reais a modelos de IA** no servidor Node: não validadas (ver `VALIDACAO.md`).
- **Idiomas:** o agente foi feito em português do Brasil.
- **Instalação do pacote gerenciado numa org limpa:** o pacote desbloqueado foi testado assim; a versão gerenciada `0.1.0.1` passou nos testes na criação, mas a instalação dela ainda não foi conferida em outra org.

## Alertas para quem instala

1. Atribua `Gina_Demo` só a quem pode ver o consentimento dos clientes.
2. Registre o consentimento **antes** de esperar sugestões. Sem ele, a Gina fica em silêncio, e isso é o comportamento correto.
3. Em produção, não use o `sf:seed`: ele existe só para Developer Edition e sandbox.
