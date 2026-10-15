# O que deu errado (e como evitar)

Registro honesto dos tropeços de 14/10/2026. Cada item tem **o que aconteceu**, **a causa** e **o que fazer**. Os dois primeiros são os que mais importam.

## 1. Num pacote gerenciado, todo cliente virava "sem consentimento" (grave)

- **O que aconteceu:** a primeira tentativa de criar a versão do pacote gerenciado falhou com 11 testes quebrados. Em todos, o consentimento lido era "ausente", e a Gina bloquearia todo mundo.
- **Causa:** com namespace, os campos personalizados mudam de nome em tempo de execução: `Gina_WhatsApp_Consent__c` vira `ginaintell__Gina_WhatsApp_Consent__c`. O código procurava as chaves sem prefixo em `getPopulatedFieldsAsMap()`.
- **Por que passava antes:** na org de desenvolvimento não há namespace, então o erro só aparece no pacote gerenciado.
- **Correção:** `GinaRules.CONSENT_FIELD` e `IGNORED_FIELD`, obtidos por `Contact.<campo>.getDescribe().getName()`, que devolvem o nome certo com ou sem prefixo.
- **Como evitar:** nunca escreva nome de campo personalizado como texto em `get('...')`, em JSON ou em mapas. Use `getDescribe().getName()`. Teste sempre também na criação de versão do pacote gerenciado.
- **Nota de segurança:** a falha era **segura** (bloqueava em vez de liberar), por causa da regra "sem consentimento documentado, nada sai".

## 2. Org Free Edition não registra namespace

- **O que aconteceu:** na org Free, a tela "Gerenciador de pacote" não mostrava o botão **Editar** em Configurações do namespace.
- **Causa:** o namespace só se registra numa org **Developer Edition**, e essa **não pode ser a org do Dev Hub**.
- **O que fazer:** criar uma terceira org Developer Edition só para guardar o namespace, e depois vinculá-la ao Dev Hub (Namespace Registries → Namespace do link). **Não apague essa org**: o namespace fica preso a ela.

## 3. O cadastro da Developer Edition recusou o e-mail repetido

- **O que aconteceu:** ao tentar criar outra org com o e-mail principal, a Salesforce respondeu que o e-mail **já tinha uma Developer Edition** e mandou o nome de usuário da existente.
- **Causa:** o cadastro reconhece o e-mail de contato. A afirmação de que "o e-mail de contato pode se repetir" estava **errada**.
- **O que fazer:** usar outro e-mail de contato para cada Developer Edition nova. O nome de usuário (`...@agentforce.com`) é gerado por org.

## 4. Pacote gerenciado exige namespace dentro do `sfdx-project.json`

- **O que aconteceu:** `sf package create --package-type Managed` falhou com "Você deve especificar um namespace".
- **Causa:** o namespace **não é uma opção do comando**; vem da chave `"namespace"` na raiz do `sfdx-project.json`.
- **Depois:** o comando deixou **duas entradas apontando para `force-app`** (a do pacote antigo e a do novo). Elas foram unificadas na entrada de `Gina Intell`.
- **O que fazer:** faça uma cópia do `sfdx-project.json` antes de `sf package create` e confira o arquivo depois: o comando o reescreve.

## 5. O agente em Agent Script não pode ir dentro do pacote

- **Causa:** o `AiAuthoringBundle` só tem Metadata API e Source Tracking no relatório de cobertura da v68.0; não é empacotável.
- **Consequência:** o pacote leva Apex, ações, campos e `Gina_Demo`. O agente fica em `salesforce/agent/` e quem instala o publica com `sf agent publish` e atribui `Gina_Agente`.
- **Caminho futuro:** refazer o agente no formato clássico (`GenAiPlannerBundle`, `GenAiPlugin`, `GenAiFunction`), que é empacotável.

## 6. Teste de jornada falhou por uma borda

- **O que aconteceu:** `threeIgnoredMessagesPutAnActiveCustomerToRest` esperava "atraso" e recebeu "em ritmo".
- **Causa:** 15 dias de recência com ritmo de 10 dá razão **exatamente 1,5**, que ainda conta como em ritmo. O erro estava no teste, não na regra.
- **Como evitar:** escolha datas que fiquem claramente dentro de cada faixa e teste as bordas de propósito.

## 7. Contagem de testes enganosa

Afirmei "18 testes" quando eram **17**; o 18º é o `@TestSetup`. Conferido pelo resultado de cada classe antes de escrever `testes.md`.

## 8. Buscar no lugar errado dentro da Salesforce

- **O que aconteceu:** buscas por "Package Manager" não achavam nada.
- **Causa:** a barra de cima é a **busca global** (registros e objetos). Configurações ficam na **Busca rápida** do menu à esquerda da Configuração. Em português o termo é **Gerenciador de pacote**.
- **Dica:** "Pacotes instalados" é outra página (pacotes de terceiros) e não tem o namespace.

## 9. Conta bloqueada por tentativas de senha

A org Free `iantunessp` travou depois de várias senhas erradas. Anote a senha ao criar a org e redefina uma única vez em vez de tentar variações.

## 10. Limites do ambiente de trabalho com o Claude

- O Claude **não digita senhas** e **não enxerga popups** nem abas fora do grupo dele no Chrome. A aprovação do vínculo do namespace, que abre um popup de login, ficou com a pessoa.
- Abas, janelas anônimas e contas já logadas pertencem ao navegador de quem usa.

## 11. Material externo que não era da Gina

Cenários pedidos a outra ferramenta (fluxo bancário de crédito, assistente de consultoria de flows) **não eram de varejo** e não foram aplicados. Peça cenários no formato: datas dos pedidos, consentimento e a decisão esperada em cada data.

## 12. Outros avisos que valem registro

- `sf agent preview` no CLI 2.153.5 falha em agente interno sem `default_agent_user` ("reading 'replace'"). Para o preview, ponha o seu usuário nessa linha temporariamente e tire antes de publicar.
- O Swift do Mac está quebrado: use `qlmanage -t` para miniatura de vídeo.
- O GitHub Desktop não envia tags criadas pelo terminal; elas dependem do login do `gh`.
- Chaves de Setup devem ser conferidas pela metadata (por exemplo `Settings:DevHub`), não só pela tela.
