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
4. Depois, repetir no Coral Cloud e gravar um vídeo curto para o Behance.
