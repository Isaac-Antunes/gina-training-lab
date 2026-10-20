# Gina para qualquer CRM — com mentoria

**Em uma frase:** a Gina não é um produto preso à Salesforce. O que ela entrega é
a camada de decisão — dados do cliente → regras determinísticas → explicação →
uma tarefa para uma pessoa aprovar — e isso funciona de CRM completo a planilha,
com a mentoria do Isaac na implantação.

## O que não muda em nenhum CRM

- **Ritmo de compra pela mediana**, recência, VIP por competição (RFV), janela de
  descanso e margem unitária: calculados por regras, nunca inventados por IA.
- **Consentimento falha fechado:** sem prova de opt-in, nada de contato.
- **Nenhuma mensagem automática ao cliente.** No máximo, uma tarefa/fila para o
  dono revisar.
- **Explicação visível:** por que esse cliente, por que hoje.
- **Testes:** paridade entre runtimes, casos adversariais e regressão.

## Caminhos por maturidade

| Seu cenário | Como a Gina entra | O que você recebe |
|---|---|---|
| **Salesforce (Sales/Service + Agentforce)** | Implementação de referência deste repositório | Agente dentro do Salesforce, ações Apex e testes oficiais |
| **HubSpot** | Adaptador implementado (leitura): contatos + deals ganhos | Mesmo motor de decisão, com `npm run hubspot:queue` |
| **Pipedrive, RD Station, Zoho, Dynamics** | Adaptador: mapeia contatos, negócios/atividades e consentimento | Mesmo motor de decisão, integrado ao seu CRM |
| **Planilha, Google Sheets, ERP com exportação** | Modo importação: CSV/XLSX semanal | Fila de revisão priorizada, sem dashboard extra |
| **Lista de WhatsApp / sem CRM** | Modo manual assistido: formulário + planilha | Rotina semanal de revisão e tarefas com trilha de auditoria |

O modo planilha já está implementado e testado: um CSV de compras vira fila de revisão com o mesmo motor determinístico do Salesforce. Na prática:

```bash
npm run crm:queue -- compras.csv --today 2026-10-19
```

A saída separa quem pede ação (VIP primeiro), quem está bloqueado por consentimento e quem está em ritmo/descanso — sem enviar nada a ninguém.

O adaptador HubSpot segue o mesmo desenho: lê contatos e deals ganhos (offline por fixture ou `--live` somente leitura) e devolve a mesma fila.

```bash
npm run hubspot:queue -- hubspot-exemplo.json --today 2026-10-19
```

## O que a mentoria entrega

1. **Diagnóstico:** CRM atual, qualidade dos dados, prova de consentimento,
   canais e processo de decisão.
2. **Mapeamento:** campos do seu CRM para o modelo canônico (cliente, compras,
   consentimento, notas) com as regras de LGPD.
3. **Implantação:** adaptador ou pipeline de planilha, configuração das regras e
   testes de paridade/segurança.
4. **Ritual semanal:** fila de revisão, tarefas aprovadas pelo dono, métricas e
   grupo de controle.
5. **Treinamento do time:** como ler as decisões e respeitar consentimento —
   sem automatizar contato com cliente.
6. **Governança:** revisão de prompts/segurança, trilha de auditoria,
   escalonamento e recalibração periódica.

**Formatos:** diagnóstico, implantação assistida e mentoria recorrente.

## Limites honestos

- Não é plug-and-play em qualquer ferramenta: cada CRM precisa de mapeamento,
  semântica de consentimento e testes.
- Sem histórico de compras/atividades, o motor pede dados; sem prova de
  consentimento, ele falha fechado.
- Não há escrita silenciosa no CRM: integração de escrita exige adaptador e
  permissão explícita.
- A camada de linguagem é opcional; o modo determinístico funciona offline.
- Nenhum resultado é prometido sem escopo, baseline e critério de sucesso.

## Como começar

Um diagnóstico de 45–60 minutos respondendo:

1. Qual CRM/planilha você usa hoje?
2. O que você tem de histórico de compra ou visita?
3. Onde está registrado o consentimento (e a prova dele)?
4. Quem decide e quem executa o contato?
5. Como você mede sucesso em 6–12 meses?

A partir daí definimos o caminho — nativo, adaptador, planilha ou manual — e o
que fica dentro da mentoria.
