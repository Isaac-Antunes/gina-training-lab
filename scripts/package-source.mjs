import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { zipSync } from 'fflate';

const root = path.resolve(process.argv[2] || fileURLToPath(new URL('../', import.meta.url)));
const output = path.resolve(process.argv[3] || path.join(root, 'public/gina-training-lab-updated.zip'));
const excluded = new Set(['node_modules', 'dist', 'build', 'coverage', '.git', '.DS_Store']);
const files = {};

async function collect(directory, relative = '') {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (excluded.has(entry.name) || entry.isSymbolicLink()) continue;
    if ((entry.name.startsWith('.env') && entry.name !== '.env.example') || /\.(zip|log)$/i.test(entry.name)) continue;
    const name = relative ? `${relative}/${entry.name}` : entry.name;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) await collect(absolute, name);
    else if (entry.isFile()) files[name] = new Uint8Array(await readFile(absolute));
  }
}

await collect(root);
await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, zipSync(files, { level: 6 }));
console.log(`ZIP atualizado: ${Object.keys(files).length} arquivos → ${output}`);
