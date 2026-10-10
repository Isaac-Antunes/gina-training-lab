import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { unzipSync, strFromU8 } from 'fflate';

test('source ZIP includes current code but excludes secrets, dependencies and nested ZIPs', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'gina-package-'));
  try {
    await mkdir(path.join(root, 'src'));
    await mkdir(path.join(root, 'node_modules'));
    await writeFile(path.join(root, 'src', 'App.tsx'), 'current-source');
    await writeFile(path.join(root, '.env.local'), 'SECRET=do-not-export');
    await writeFile(path.join(root, '.env.example'), 'GEMINI_API_KEY=');
    await writeFile(path.join(root, 'old.zip'), 'obsolete');
    await writeFile(path.join(root, 'node_modules', 'dependency.js'), 'exclude');
    const output = path.join(root, 'project.zip');
    const result = spawnSync(process.execPath, ['scripts/package-source.mjs', root, output], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    const entries = unzipSync(await readFile(output));
    assert.deepEqual(Object.keys(entries).sort(), ['.env.example', 'src/App.tsx']);
    assert.equal(strFromU8(entries['src/App.tsx']), 'current-source');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
