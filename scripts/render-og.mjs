// Gera as miniaturas de prévia da vitrine (og-gina.jpg e og-gina-en.jpg, 1200x630).
// Só macOS: usa o Quick Look (qlmanage) para rasterizar o SVG e o sips para cortar.
// Precisa das fontes Bagel Fat One e Onest instaladas no Mac.
//   npm run og:render                      usa a Gina oficial da pasta de design
//   npm run og:render -- caminho/gina.png  outra imagem da Gina (pose Receber)
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const source =
  process.argv[2] || path.join(homedir(), 'Downloads/design-com-acabamento-refinado/project/assets/gina-intake.png');
const work = mkdtempSync(path.join(tmpdir(), 'gina-og-'));

const COPY = {
  pt: {
    out: 'og-gina.jpg',
    eyebrow: 'GINA INTELL · DEMONSTRAÇÃO',
    title: ['Cadastrou?', 'A Gina recebe.'],
    lines: ['Prova de consentimento, relatório do cadastro', 'e boas-vindas aprovada pelo time.'],
    url: 'gina-intell.vercel.app',
    copyright: '© 2026 Isaac Antunes. Personagem Gina, ilustrações e método Gina Intell: todos os direitos reservados.',
  },
  en: {
    out: 'og-gina-en.jpg',
    eyebrow: 'GINA INTELL · DEMO',
    title: ['Signed up?', 'Gina says hi.'],
    lines: ['Proof of consent, signup reports', 'and welcomes your team approves.'],
    url: 'gina-intell.vercel.app/en',
    copyright: '© 2026 Isaac Antunes. Gina character, illustrations and the Gina Intell method: all rights reserved.',
  },
};

const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

// A Gina em 700px: nítida no tamanho em que aparece (470x528).
const gina = path.join(work, 'gina.png');
execFileSync('sips', ['-Z', '700', source, '--out', gina], { stdio: 'ignore' });
const ginaB64 = readFileSync(gina).toString('base64');

for (const [lang, c] of Object.entries(COPY)) {
  const pillWidth = Math.round(c.url.length * 12.4 + 60);
  // O Quick Look desloca SVGs não quadrados: desenha num quadrado 1200x1200 e corta a faixa do meio.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1200" height="1200" viewBox="0 0 1200 1200">
  <rect width="1200" height="1200" fill="#1E6B2E"/>
  <g transform="translate(0,285)">
    <circle cx="960" cy="330" r="270" fill="#7FC453" opacity="0.18"/>
    <image x="720" y="52" width="470" height="528" xlink:href="data:image/png;base64,${ginaB64}"/>
    <text x="72" y="118" font-family="Onest" font-weight="700" font-size="22" letter-spacing="4" fill="#d4efbe">${escape(c.eyebrow)}</text>
    <text x="72" y="222" font-family="Bagel Fat One" font-size="84" fill="#f5f3ed">${escape(c.title[0])}</text>
    <text x="72" y="318" font-family="Bagel Fat One" font-size="84" fill="#9fdc6e">${escape(c.title[1])}</text>
    <text x="72" y="392" font-family="Onest" font-weight="500" font-size="28" fill="#d4efbe">${escape(c.lines[0])}</text>
    <text x="72" y="430" font-family="Onest" font-weight="500" font-size="28" fill="#d4efbe">${escape(c.lines[1])}</text>
    <rect x="72" y="476" width="${pillWidth}" height="52" rx="26" fill="#7FC453"/>
    <text x="${72 + pillWidth / 2}" y="510" text-anchor="middle" font-family="Onest" font-weight="700" font-size="22" fill="#061f16">${escape(c.url)}</text>
    <text x="72" y="592" font-family="Onest" font-weight="500" font-size="15" fill="#d4efbe" opacity="0.8">${escape(c.copyright)}</text>
  </g>
</svg>`;
  const svgPath = path.join(work, `og-${lang}.svg`);
  writeFileSync(svgPath, svg);
  execFileSync('qlmanage', ['-t', '-s', '1200', '-o', work, svgPath], { stdio: 'ignore' });
  const cropped = path.join(work, `og-${lang}.png`);
  execFileSync('sips', ['-c', '630', '1200', '--cropOffset', '285', '0', `${svgPath}.png`, '--out', cropped], { stdio: 'ignore' });
  const out = path.join(root, 'showcase-public', c.out);
  execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '85', cropped, '--out', out], { stdio: 'ignore' });
  console.log(`${c.out} gerada (${lang}).`);
}
console.log(`Arquivos de trabalho em ${work}`);
