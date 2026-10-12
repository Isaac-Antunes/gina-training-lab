import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const root = fileURLToPath(new URL('../', import.meta.url));
const outDir = path.join(root, 'dist-showcase');

// O que nunca pode ir para a vitrine pública.
const FORBIDDEN = [
  'GEMINI_API_KEY',
  'SALESFORCE_ACCESS_TOKEN',
  'SALESFORCE_INSTANCE_URL',
  'download-zip',
  '/api/train',
  '/api/challenges',
  'GINA_SYSTEM_PROMPT',
  'resposta_do_aluno',
  'expectedCriteria',
  'agentforce.com',
  'orgfarm',
  '@gmail.com',
  '99135',
];

async function listFiles(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await listFiles(full)));
    else out.push(full);
  }
  return out;
}

test('public showcase ships only the demos: no source ZIP, keys, prompts or personal contacts', async () => {
  await build({ configFile: path.join(root, 'vite.showcase.config.ts'), root, logLevel: 'silent' });
  const files = await listFiles(outDir);

  assert.ok(files.some((f) => f.endsWith('showcase.html')));
  assert.deepEqual(
    files.filter((f) => !/\.(html|js|css)$/.test(f)).map((f) => path.relative(outDir, f)),
    [],
    'só HTML, JS e CSS: nada da pasta public/ (onde fica o ZIP)'
  );

  for (const file of files) {
    const text = await readFile(file, 'utf8');
    for (const term of FORBIDDEN) {
      assert.equal(text.includes(term), false, `${path.relative(outDir, file)} contém "${term}"`);
    }
  }

  const html = await readFile(path.join(outDir, 'showcase.html'), 'utf8');
  assert.match(html, /© 2026 Isaac Antunes\. Personagem Gina, ilustrações e método Gina Intell: todos os direitos reservados\./);
});
