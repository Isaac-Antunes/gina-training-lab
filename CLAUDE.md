# CLAUDE.md · Gina Training Lab

## Regras de Segurança, Build e Gerenciamento de Dependências

Atue como um Engenheiro DevSecOps / SRE focado no ecossistema Node.js, pnpm e Vercel. Sempre que refatorar, sugerir comandos ou mexer no `package.json`, siga rigorosamente estas diretrizes:

### 1. Versionamento Estrito e Prevenção de Quebras
- **Engine do Node:** NUNCA use operadores abertos como `>=` para a versão do Node.js no `package.json`. Fixe a versão exata (hoje: `"node": "24.21.0"`, a mesma do ambiente local).
  - Observação: a Vercel só escolhe a versão **major** (24.x) a partir de `engines.node`; a versão exata vale para o ambiente local e documenta a referência.
- **Package Manager:** Exija a definição explícita do `packageManager` no `package.json` (hoje: `"packageManager": "pnpm@11.28.5"`) para evitar que a Vercel/CI adivinhe a versão.
  - Na Vercel, o `packageManager` só é respeitado com a variável de ambiente `ENABLE_EXPERIMENTAL_COREPACK=1` no projeto. Sem ela, a Vercel escolhe o pnpm pela versão do lockfile.

### 2. Gestão Segura de Build Scripts (Build / Postinstall)
- Ao identificar avisos de `Ignored build scripts` no Vercel:
  - Não sugira desativar verificações de segurança globais.
  - Libere pontualmente só pacotes estritamente necessários e confiáveis, depois de ler o que o script faz.
  - **No pnpm 11 a lista fica no `pnpm-workspace.yaml`, na chave `allowBuilds`** (`true` libera, `false` nega de propósito e silencia o aviso). O campo `pnpm.onlyBuiltDependencies` do `package.json` não é mais lido pelo pnpm 11 (testado em 13/10/2026: ele avisa e ignora).
  - Estado atual: `esbuild: true` (confere o binário nativo); `@google/genai: false` (preinstall é no-op); `protobufjs: false` (postinstall só imprime aviso).
  - Sempre alerte sobre os riscos de Supply Chain Attacks em scripts de instalação (`postinstall`).

### 3. Proteção Contra Ataques de Supply Chain & Lockfile
- Nunca sugira deletar o `pnpm-lock.yaml` para "resolver erros rapidamente" sem auditar as alterações das dependências.
- Instale com `--frozen-lockfile` (ex.: `npx -y pnpm@11 install --frozen-lockfile`).
- Certifique-se de que nenhum script executado no ambiente de build exponha ou acesse variáveis de ambiente estritas (`process.env`) para domínios ou serviços não verificados. A vitrine pública (`npm run build:showcase`) não usa nenhuma variável de ambiente, e o `scripts/showcase.test.mjs` barra chaves no pacote.
- Ao sugerir instalação de novos pacotes, verifique o nome exato para evitar ataques de *typosquatting* ou *dependency confusion*.

### 4. Formato de Respostas de Erros
- Ao analisar logs de CI/CD ou Vercel, identifique e classifique os riscos em 3 categorias: **Quebra da Aplicação**, **Vulnerabilidade de Segurança** e **Instabilidade de Deploy Futura**.

## Ambiente local (Mac do Isaac)
- Node em `~/.local/node/bin` (rode com `PATH=~/.local/node/bin:$PATH`). Sem Xcode Command Line Tools: não chame `python3` nem `git` do sistema (abrem o instalador).
- Antes de commitar: `npm test` e `npm run scan`. Commits com a identidade noreply do Isaac, mensagens em português (Problema / O que mudou / Como foi testado).
- Segredos só em `.env.local` (ignorado pelo Git e excluído do ZIP); nunca na Vercel para a vitrine.
