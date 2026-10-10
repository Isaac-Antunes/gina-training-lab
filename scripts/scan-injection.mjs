// Varredura de prompt injection escondido em arquivos do projeto.
// Uso: npm run scan                              (varre a raiz do projeto)
//      node scripts/scan-injection.mjs <pasta|arquivo>...
// Sai com código 1 se houver achado fora da allowlist, 0 se não houver.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Pastas que nunca são varridas.
const SKIP = new Set(['node_modules', '.git', 'dist', 'public']);

// Extensões de texto lidas pelo varredor (binários ficam de fora).
const TEXT = /\.(md|txt|html?|tsx?|jsx?|mjs|cjs|json|ya?ml|css|svg|xml|env|example)$/i;

const KIND_FRASE = 'frase de comando';
const KIND_COMENTARIO = 'comentário HTML longo';
const LIMITE_LINHA = 20000;

// Caracteres invisíveis: são achados em qualquer arquivo, mesmo na allowlist.
const INVISIVEIS = [
  [/[\u200B-\u200F\u2060-\u2064\uFEFF]/g, 'caractere de largura zero / marca de direção'],
  [/[\u202A-\u202E\u2066-\u2069]/g, 'controle bidirecional (pode inverter texto)'],
  [/[\u{E0000}-\u{E007F}]/gu, 'Unicode "tag" (texto invisível)'],
  [/[\uE000-\uF8FF\u{F0000}-\u{FFFFD}\u{100000}-\u{10FFFD}]/gu, 'área de uso privado'],
];

// Frases típicas de comando embutido em conteúdo que uma IA pode ler.
const FRASES = /(ignore (all |any )?(previous|prior|above) (instructions|rules)|ignor(e|a|ar) (todas )?as (instruç|regras)|system (instruction )?override|disregard (the|all|your)|you are (now )?(claude|chatgpt|an ai)|voc[eê] (é|agora é) (o )?claude|new instructions:|<\/?(system|assistant|instructions?)>|\bassistant:\s|BEGIN (SYSTEM|PROMPT)|exfiltrat|send (the|your) (api )?key|revel(e|ar) (a )?(chave|senha|api)|curl\s+https?:\/\/|eval\(atob|base64 -d)/i;

// Arquivos que contêm ataques DE PROPÓSITO (cenários e detectores do lab).
// Nesses arquivos, frases de comando são esperadas; caracteres invisíveis não.
const ALLOWLIST_ARQUIVOS = new Set([
  'src/data/scenarios.ts',
  'src/data/challenges.ts',
  'src/data/challengesFixtures.ts',
  'src/utils/challengeRunner.ts',
  'src/utils/contextEngineering.ts',
  'src/utils/ginaPrompts.ts',
  'scripts/scan-injection.mjs',
]);
const ALLOWLIST_PADROES = [
  /^playground\/[^/]+\.md$/,
  /^scripts\/[^/]+\.test\.mjs$/,
];

export function estaNaAllowlist(relativo) {
  const caminho = relativo.split(path.sep).join('/');
  return ALLOWLIST_ARQUIVOS.has(caminho) || ALLOWLIST_PADROES.some((p) => p.test(caminho));
}

// Mostra cada caractere como código Unicode (U+200B), sem imprimir o invisível.
function codigos(texto) {
  return [...texto]
    .map((c) => 'U+' + c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0'))
    .join(' ');
}

// Procura achados em um texto. Não considera a allowlist: isso é decidido por quem chama.
export function scanText(text, fileName = '') {
  const achados = [];

  text.split('\n').forEach((linha, i) => {
    const numero = i + 1;
    for (const [re, rotulo] of INVISIVEIS) {
      const ocorrencias = [...linha.matchAll(re)].map((m) => m[0]);
      if (ocorrencias.length) {
        achados.push({
          line: numero,
          kind: rotulo,
          excerpt: `${ocorrencias.length}x ${codigos(ocorrencias.slice(0, 5).join(''))}`,
        });
      }
    }
    if (linha.length < LIMITE_LINHA) {
      const m = linha.match(FRASES);
      if (m) {
        achados.push({
          line: numero,
          kind: KIND_FRASE,
          excerpt: linha.slice(Math.max(0, m.index - 60), m.index + 90).trim(),
        });
      }
    }
  });

  // Comentários HTML longos podem esconder instruções para a IA.
  if (/\.html?$/i.test(fileName)) {
    for (const m of text.matchAll(/<!--([\s\S]*?)-->/g)) {
      const conteudo = m[1].trim();
      if (conteudo.length > 20) {
        achados.push({
          line: text.slice(0, m.index).split('\n').length,
          kind: KIND_COMENTARIO,
          excerpt: conteudo.slice(0, 140).replace(/\s+/g, ' '),
        });
      }
    }
  }

  return achados;
}

// Varre pastas e arquivos e devolve todos os achados, marcando os permitidos pela allowlist.
// Frases de comando em arquivos da allowlist saem com permitido: true; o resto é bloqueante.
export function collectFindings(alvos) {
  const resultado = [];

  const visitar = (caminho) => {
    if (fs.statSync(caminho).isDirectory()) {
      for (const entrada of fs.readdirSync(caminho)) {
        if (!SKIP.has(entrada)) visitar(path.join(caminho, entrada));
      }
      return;
    }
    if (!(TEXT.test(caminho) || path.basename(caminho) === 'CLAUDE.md')) return;

    let texto;
    try {
      texto = fs.readFileSync(caminho, 'utf8');
    } catch {
      return;
    }

    const relativo = path.relative(ROOT, caminho);
    const dentroDoProjeto = relativo !== '..' && !relativo.startsWith('..' + path.sep) && !path.isAbsolute(relativo);
    const arquivo = dentroDoProjeto ? relativo.split(path.sep).join('/') : caminho;
    const naAllowlist = dentroDoProjeto && estaNaAllowlist(relativo);

    for (const achado of scanText(texto, caminho)) {
      resultado.push({
        file: arquivo,
        ...achado,
        permitido: naAllowlist && achado.kind === KIND_FRASE,
      });
    }
  };

  for (const alvo of alvos) {
    const absoluto = path.resolve(alvo);
    if (fs.existsSync(absoluto)) visitar(absoluto);
  }
  return resultado;
}

function main() {
  const argumentos = process.argv.slice(2);
  const alvos = argumentos.length ? argumentos : [ROOT];

  const naoEncontrados = alvos.filter((a) => !fs.existsSync(path.resolve(a)));
  if (naoEncontrados.length) {
    for (const a of naoEncontrados) console.error(`Caminho não encontrado: ${a}`);
    process.exitCode = 1;
    return;
  }

  const todos = collectFindings(alvos);
  const bloqueantes = todos.filter((f) => !f.permitido);
  const permitidos = todos.length - bloqueantes.length;

  for (const f of bloqueantes) {
    console.log(`${f.file} | linha ${f.line} | ${f.kind} | ${f.excerpt}`);
  }

  if (bloqueantes.length) {
    console.log(`\n${bloqueantes.length} achado(s) fora da allowlist.`);
    process.exitCode = 1;
  } else {
    console.log('Nenhum achado fora da allowlist.');
  }
  if (permitidos) {
    console.log(`(${permitidos} frase(s) de comando em arquivos da allowlist, esperadas e ignoradas.)`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
