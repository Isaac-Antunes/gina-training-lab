import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isAllowedHost } from '../src/utils/hostGuard.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
let nextPort = 44931;

test('aceita só loopback no cabeçalho Host', () => {
  for (const host of ['localhost', 'localhost:3000', '127.0.0.1:3000', '[::1]:3000', 'LOCALHOST:3000']) {
    assert.equal(isAllowedHost(host), true, host);
  }
  for (const host of ['evil.example', 'evil.example:3000', '192.168.0.10:3000', 'localhost.evil.example', '', undefined]) {
    assert.equal(isAllowedHost(host), false, String(host));
  }
});

test('HOST configurado também é aceito', () => {
  assert.equal(isAllowedHost('meu-mac.local:3000', ['meu-mac.local']), true);
  assert.equal(isAllowedHost('meu-mac.local:3000'), false);
});

function request(port, host, address = '127.0.0.1') {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: address, port, path: '/api/health', headers: { Host: host } }, (res) => {
      res.resume();
      res.on('end', () => resolve(res.statusCode));
    });
    req.on('error', reject);
    req.end();
  });
}

test('o servidor escuta só em 127.0.0.1 e barra Host estranho (DNS rebinding)', async () => {
  const cwd = await mkdtemp(path.join(tmpdir(), 'gina-host-'));
  const port = nextPort++;
  const env = { ...process.env, NODE_ENV: 'production', PORT: String(port) };
  delete env.HOST;
  delete env.GEMINI_API_KEY;
  const child = spawn(process.execPath, ['--import', import.meta.resolve('tsx'), path.join(root, 'server.ts')], {
    cwd, env, stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  try {
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error(`Startup timed out: ${output}`)), 10000);
      child.once('exit', (code) => { clearTimeout(timeout); reject(new Error(`Server exited ${code}: ${output}`)); });
      child.stderr.on('data', (chunk) => { output += chunk; });
      child.stdout.on('data', (chunk) => {
        output += chunk;
        if (/http:\/\/localhost:\d+/.test(output)) { clearTimeout(timeout); resolve(); }
      });
    });
    assert.equal(await request(port, `localhost:${port}`), 200);
    assert.equal(await request(port, `evil.example:${port}`), 403);
  } finally {
    const exited = new Promise((resolve) => child.once('exit', resolve));
    if (child.exitCode === null) { child.kill(); await exited; }
    await rm(cwd, { recursive: true, force: true });
  }
});
