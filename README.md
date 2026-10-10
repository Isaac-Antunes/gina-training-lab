# Gina Training Lab

Laboratório de treinamento de CRM e lifecycle para pequeno varejo, criado por Isaac Antunes. Combina seis cenários progressivos, prática com rubrica, regras determinísticas de CRM e acompanhamento de progresso no navegador.

## Rodar no Mac

Requisito: Node.js 24 LTS (inclui npm).

```bash
npm install
cp .env.example .env.local
npm run dev
```

Abra http://localhost:3000. Sem chave Gemini, o servidor inicia em modo manual: navegação, cenários, regras locais e avaliação manual continuam disponíveis. Ao tentar uma função de IA, o aplicativo informa a indisponibilidade e oferece a alternativa manual onde implementada.

Para habilitar IA, edite `.env.local` e preencha `GEMINI_API_KEY` com sua própria chave. Reinicie o servidor. Chamadas reais dependem do modelo, acesso e cota da sua conta; os testes locais não fazem chamadas de IA. Não coloque chaves no frontend ou no pacote enviado a terceiros.

Variáveis definidas no processo têm prioridade; depois são lidos `.env.local` e `.env`. Para outra porta, configure `PORT=3001` e abra http://localhost:3001.

## Verificar

```bash
npm run lint
npm test
npm run build
npm start
```

`lint` verifica tipos TypeScript. `test` executa os 47 testes locais existentes e os testes de integração adicionados. `build` gera o frontend em `dist`; `start` serve o frontend compilado e a API Express. `npm run preview` serve apenas o frontend e não substitui o servidor para treinos com IA.

O relatório existente de desafios de IA contém registros herdados da exportação do AI Studio; não representa uma nova validação de chamadas reais. Cinco desses registros estão bloqueados e um aguarda revisão humana.

## Exportar o código atual

```bash
npm run package:source
```

Gera `public/gina-training-lab-updated.zip`. O ZIP exclui arquivos `.env` privados, dependências, builds, logs, links simbólicos e outros ZIPs. O comando também roda antes de `npm run dev` e `npm run build`. Ao editar o código com o servidor em execução, rode-o novamente antes de baixar pelo botão do aplicativo.

A rota `/api/download-zip` usa esse pacote. O diagnóstico `/api/health` informa se a IA está configurada sem retornar a chave. Rotas de API desconhecidas retornam JSON 404, evitando que o HTML da aplicação seja recebido como se fosse um arquivo.

## Estrutura

- `server.ts`: API Express, integração Gemini e controles de requisições.
- `src/components`: interface React, cenários, prática, histórico e método.
- `src/utils`: regras de CRM, histórico, limites e tratamento de contexto.
- `src/data`: cenários e fixtures da suíte.
- `scripts`: testes locais e empacotamento do código-fonte.

## Limitações

O histórico fica no armazenamento do navegador; não há sincronização entre computadores. Limites de sessão do backend são mantidos em memória e reiniciam com o servidor. Os testes de contexto existentes não constituem uma auditoria de segurança completa nem uma certificação legal. Autenticação, banco persistente, cobrança e configuração de implantação precisam de trabalho específico antes de operar como serviço público.

A personagem Gina, as ilustrações e o método Gina Intell mantêm os créditos e direitos de Isaac Antunes. Esta revisão preserva a identidade visual e concentra-se em execução local e entrega técnica.
