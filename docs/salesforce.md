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

O acesso é feito por um aplicativo conectado criado pelo próprio Isaac na org; as credenciais ficam em `.env.local` e nunca no código.

## O que torna o projeto desejado

- **Encaixe real**: "ela vive no CRM que a loja já usa" deixa de ser promessa e vira demonstração na Salesforce.
- **Governança visível**: consentimento bloqueia, a dormência dá descanso, o dono aprova. Exatamente o que gestores temem em IA de marketing.
- **Resultado honesto**: holdout desde o primeiro dia, sem números inventados.
- **Dados fictícios**: nenhum dado de cliente real, nenhuma questão de LGPD no portfólio.

## Próximos passos

1. Criar uma Developer Edition gratuita (Isaac) e importar os 6 cenários da Gina como Contact + Order.
2. Escrever o conector de leitura e um teste com dados falsos, sem rede.
3. Tela "Gina na Salesforce" no lab: lista de clientes, decisão, botão "criar tarefa para o dono".
4. Depois, repetir no Coral Cloud e gravar um vídeo curto para o Behance.
