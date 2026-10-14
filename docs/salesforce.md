# Gina + Salesforce — engenharia reversa e recomendação

Estudo dos 29 repositórios públicos de [trailheadapps](https://github.com/trailheadapps) (10/10/2026) para decidir onde a Gina se conecta à Salesforce. Nada foi instalado nem criado em nenhuma conta.

## Resumo

A Gina deve aparecer como **uma camada de lifecycle em cima da Salesforce**: lê clientes e compras, decide com as regras do método Gina Intell, redige a mensagem e **não envia nada sem o dono aprovar**. É isso que torna o projeto desejado: funciona no CRM que as empresas já usam, mostra governança de verdade e mede resultado com grupo de controle.

Recomendo dois passos:

1. **MVP numa Developer Edition gratuita**, com objetos padrão (Contact e Order) e os dados de varejo da própria Gina. Sem licença paga, cara de loja.
2. **Vitrine no Coral Cloud**, o app de exemplo de Agentforce da Salesforce, para mostrar a Gina decidindo sobre os dados oficiais deles.

## O que cada app de exemplo oferece

| App | Caso | Serve para a Gina? | Por quê |
|---|---|---|---|
| **coral-cloud** | Resort (hospitalidade), Agentforce, Data Cloud, Prompts | **Sim, como vitrine** | Tem `Booking__c` com contato, data, valor, status e cancelamento: dá para calcular ritmo, recência, frequência e gasto por hóspede. É o exemplo oficial de agentes da Salesforce. Exige Data Cloud e Agentforce (org obtida pelo projeto Trailhead "Quick Start: Explore the Coral Cloud Sample App"). |
| **ebikes-lwc** | Fabricante de bicicletas, pedidos de revendedores | Não | Os pedidos são B2B (revendedores). Não há cliente final com histórico de compras para medir ritmo. |
| **agent-script-recipes** | Exemplos de Agent Script (Agentforce) | Referência futura | Útil se um dia a Gina virar um agente nativo do Agentforce. |
| **apex-recipes**, **lwc-recipes** | Receitas de código | Referência | Padrões de integração e de tela, não dados. |
| dreamhouse, easy-spaces, az-insurance, ecars e outros | Imobiliária, eventos, seguros… | Não | Fora do varejo; vários estão arquivados. |

## Mapeamento: método Gina → campos do Coral Cloud

Lidos em `cc-base-app/main/default/objects`.

| Conceito da Gina | Campo | Observação |
|---|---|---|
| Datas de compra (ritmo pela mediana) | `Booking__c.Date__c` | Uma reserva = uma compra. Ignorar `Is_Canceled__c = true`. |
| Frequência | contagem de `Booking__c` por `Contact__c` | Também existe `Contact.Lifetime_Experience_Bookings__c`. |
| Gasto | soma de `Booking__c.Total_Price__c` | Também existe `Contact.Lifetime_Value__c`. |
| Recência | hoje − última `Date__c` | |
| VIP (terço superior em frequência e gasto) | calculado pela Gina | `Contact.Level__c` pode servir de conferência. |
| Consentimento | `Contact.HasOptedOutOfEmail` (campo padrão) | O Coral Cloud não modela consentimento por canal; para WhatsApp seria preciso um campo próprio. |
| Contatos ignorados (regra dos 3) | não existe | Precisa de um objeto de interações ou de `Task`. |
| Custo e margem | não existe | O exemplo não tem custo; a regra 9 cai no ramo "peça os custos". |

Hospitalidade não é varejo, mas a lógica é a mesma: o hóspede que voltava a cada 60 dias e sumiu há 150 é um caso de atraso.

## Como a integração funciona

1. **Ler** contatos e compras pela API REST da Salesforce, com permissão **só de leitura**.
2. **Calcular** ritmo, recência, VIP e consentimento com `src/utils/crmMath.ts` — matemática fora da IA, já testada.
3. **Decidir e redigir** com o prompt único da Gina (`src/utils/ginaPrompts.ts`), recebendo os fatos calculados no passo 2.
4. **Pedir aprovação**: a única escrita permitida é criar uma `Task` para o dono revisar. Nenhuma mensagem é enviada pela Gina.
5. **Medir**: separar um grupo de controle (holdout) antes de qualquer campanha, como manda a regra 10.

O acesso usa o login do Salesforce CLI, sem aplicativo conectado; as credenciais ficam em `.env.local` e nunca no código.

### Conectar uma org (Developer Edition)

1. `sf org login web --alias gina-dev --browser chrome` e autorizar no navegador.
2. `npm run sf:env`: copia a URL e o token do CLI para o `.env.local`, sem imprimir o token. O token expira com a sessão; se a tela der 401, rode de novo.
3. Uma vez por org: `cd salesforce && sf project deploy start -o gina-dev -d force-app` (cria os campos `Gina_WhatsApp_Consent__c` e `Gina_Ignored_Contacts__c`) e `sf org assign permset -n Gina_Demo -o gina-dev` (libera a leitura deles e do opt-out).
4. Opcional, só em Developer Edition ou sandbox: `npm run sf:seed` importa os 9 clientes de demonstração (conta "Loja demo da Gina", 26 pedidos, datas puxadas para hoje). `npm run sf:seed -- --remove` apaga tudo. A importação é atômica: se algo falha, nada fica na org.
5. `npm run dev` e abrir a aba **Salesforce → Minha org**.

O conector pergunta à org quais campos o usuário pode ler (`/sobjects/Contact/describe`) e só pede esses. Sem `HasOptedOutOfEmail` ou sem os campos da Gina, a leitura continua; o consentimento fica "ausente" e o envio é bloqueado. Contatos sem pedidos ficam fora do ranking VIP.

## O que torna o projeto desejado

- **Encaixe real**: "ela vive no CRM que a loja já usa" deixa de ser promessa e vira demonstração na Salesforce.
- **Governança visível**: consentimento bloqueia, a dormência dá descanso, o dono aprova. Exatamente o que gestores temem em IA de marketing.
- **Resultado honesto**: holdout desde o primeiro dia, sem números inventados.
- **Dados fictícios**: nenhum dado de cliente real, nenhuma questão de LGPD no portfólio.

## Próximos passos

1. ~~Criar uma Developer Edition gratuita e ligar a tela à org.~~ Feito em 12/10/2026 (20 contatos de exemplo, nenhum pedido).
2. ~~Importar os clientes de demonstração da Gina como Contact + Order na org.~~ Feito em 12/10/2026: os 9 clientes caem na mesma regra na org e no modo demonstração.
3. ~~Botão "criar tarefa para o dono".~~ Feito em 12/10/2026: só lembrete, boas-vindas, 2ª compra e contato humano com VIP viram `Task` (assunto "Gina: …"); o servidor recalcula a decisão lendo a org e não duplica tarefa aberta. Na demonstração, só a prévia.
4. ~~Gina como agente nativo do Agentforce.~~ Feito em 14/10/2026 (ver abaixo).
5. ~~Empacotar.~~ Feito em 14/10/2026: pacote desbloqueado "Gina" 0.1.0-1, instalado numa org limpa (ver "Pacote").
6. Entrar no Partner Program, criar o pacote gerenciado com namespace e publicar no AppExchange/AgentExchange.
7. Repetir no Coral Cloud e gravar um vídeo curto para o Behance e para o anúncio.

## Gina no Agentforce

A Gina também roda dentro da Salesforce, sem o servidor Node: é um agente interno (Employee Agent) que o dono abre no painel do Agentforce.

- **Regras em Apex.** `GinaRules.cls` é o porte de `crmMath.ts`, `toGina.ts` e `ownerTask.ts`. Em 14/10/2026, nos 29 contatos da org, Apex e Node deram a mesma classificação, a mesma ação e o mesmo texto de explicação.
- **Leitura com as permissões de quem pergunta.** `GinaService.cls` lê Contact e Order com `stripInaccessible` e `USER_MODE`. Campo de consentimento sem permissão de leitura conta como consentimento ausente, e o envio fica bloqueado.
- **Três ações** (`@InvocableMethod`, categoria "Gina"): clientes que pedem ação, analisar cliente (por nome ou Id) e criar tarefa para o dono. A tarefa é a única escrita, recalcula a decisão e não duplica tarefa aberta.
- **Agente em Agent Script:** `aiAuthoringBundles/Gina/Gina.agent`, em português, com as regras de governança nas instruções (nunca redige nem envia mensagem; consentimento manda).
- **Testes Apex:** `GinaRulesTest` (mesmos casos de `salesforce.test.mjs`) e `GinaActionsTest` (registros de verdade, tarefa única, nada sem consentimento). 12 testes passando.

Publicar numa org (uma vez):

```bash
cd salesforce
sf project deploy start -o gina-dev -d force-app -d agent --test-level RunSpecifiedTests --tests GinaRulesTest --tests GinaActionsTest
sf agent publish authoring-bundle -o gina-dev --api-name Gina
sf agent activate -o gina-dev -n Gina
sf org assign permset -n Gina_Demo -o gina-dev     # ações e campos
sf org assign permset -n Gina_Agente -o gina-dev   # o agente no painel
```

O Agentforce precisa estar ligado em Configuração → Agentes do Agentforce. O `sf agent publish` gera `aiAgents/` e `aiAgentDefinitionVersions/` com referências da org; esses arquivos ficam fora do Git e do pacote (`.gitignore` e `.forceignore`), porque a fonte é o `.agent`.

Para testar sem abrir a org: `sf agent preview start -o gina-dev --authoring-bundle Gina --use-live-actions`. O CLI 2.153.5 falha no preview de agente interno sem `default_agent_user` ("reading 'replace'"); para o preview, ponha o seu usuário nessa linha temporariamente e tire antes de publicar.

## Pacote

A pasta `salesforce/force-app` é o pacote desbloqueado **Gina** (Dev Hub na org `gina-dev`): regras em Apex, as 3 ações, os 2 campos de Contact e o `Gina_Demo`. A versão 0.1.0-1 (`04tgK000000RlIzQAK`) passou nos 12 testes com 99% de cobertura e foi instalada numa org temporária limpa, onde a ação classificou uma cliente nova igual à org de desenvolvimento.

O agente fica fora do pacote, em `salesforce/agent/`: o Agent Script (`AiAuthoringBundle`) não pode ser empacotado. No relatório de cobertura de metadados da v68.0 ele só tem Metadata API e Source Tracking. Quem instala publica o agente com `sf agent publish` e atribui o `Gina_Agente`. Para ir dentro do pacote, o agente teria de ser refeito no formato clássico (`GenAiPlannerBundle`, `GenAiPlugin`, `GenAiFunction`), que é empacotável inclusive como gerenciado.

Os testes das ações rodam como um dono com `Gina_Demo`. Sem ele, os campos de consentimento não são legíveis, o consentimento conta como ausente e a Gina não sugere contato; `withoutReadAccessToConsentTheGinaNeverSuggestsContact` prova isso.

Nova versão:

```bash
cd salesforce
sf package version create -v gina-dev --package Gina --installation-key-bypass --code-coverage --wait 30
```

O `sf package create` reescreve o `sfdx-project.json` (tira `default` e `definitionFile`); confira o arquivo depois dele.

Este pacote não tem namespace e por isso não pode ser anunciado no AppExchange. Para isso é preciso um pacote gerenciado de 2ª geração, com namespace registrado numa outra Developer Edition e ligado a este Dev Hub, e a revisão de segurança da Salesforce.
