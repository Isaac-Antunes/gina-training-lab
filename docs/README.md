# Documentação da Gina na Salesforce

Estado em **14/10/2026**. Cada documento responde a uma pergunta só.

| Documento | Pergunta que responde | Quando ler |
|---|---|---|
| [funcionamento.md](funcionamento.md) | Como a Gina decide e o que ela faz? | Para entender o produto ou mexer nas regras. |
| [seguranca.md](seguranca.md) | O que impede a Gina de causar dano e o que ainda não foi verificado? | Antes de instalar numa org de cliente. |
| [testes.md](testes.md) | O que está provado, como rodar e como acrescentar? | Antes de qualquer mudança no código. |
| [o-que-deu-errado.md](o-que-deu-errado.md) | Que erros aconteceram e como evitá-los? | Antes de empacotar, publicar ou configurar uma org nova. |
| [salesforce.md](salesforce.md) | Como conectar uma org, publicar o agente e gerar o pacote? | Para instalar e para gerar versões. |

## Mapa rápido do repositório

| Caminho | O que é |
|---|---|
| `src/utils/crmMath.ts` | As regras originais em TypeScript (fonte da verdade do método). |
| `salesforce/force-app/main/default/classes/` | As regras em Apex (`GinaRules`), a leitura da org (`GinaService`), as 3 ações do Agentforce e os testes. |
| `salesforce/force-app/main/default/permissionsets/` | `Gina_Demo`: campos e ações. |
| `salesforce/agent/` | O agente em Agent Script e o `Gina_Agente`. Fora do pacote. |
| `salesforce/sfdx-project.json` | Pacote **Gina Intell** (gerenciado, namespace `ginaintell`). |
| `playground/` | Seis cenários de referência do método, em texto. |

## Pacotes que existem

| Pacote | Tipo | Namespace | Situação |
|---|---|---|---|
| Gina | Desbloqueado | nenhum | 0.1.0-1, histórico. Não pode ir para o AppExchange. |
| **Gina Intell** | **Gerenciado (2GP)** | `ginaintell` | 0.1.0.1, 99% de cobertura, **ainda não promovido** (`Released: false`). |
