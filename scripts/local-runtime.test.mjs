import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { unzipSync } from 'fflate';

const root = fileURLToPath(new URL('../', import.meta.url));
let nextPort = 43931;

async function withServer(envText, run) {
  const cwd = await mkdtemp(path.join(tmpdir(), 'gina-runtime-'));
  await writeFile(path.join(cwd, '.env.local'), envText);
  const env = { ...process.env, NODE_ENV: 'production', PORT: String(nextPort++) };
  delete env.GEMINI_API_KEY;
  const child = spawn(process.execPath, ['--import', import.meta.resolve('tsx'), path.join(root, 'server.ts')], {
    cwd, env, stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  try {
    const url = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error(`Startup timed out: ${output}`)), 10000);
      child.once('exit', (code) => { clearTimeout(timeout); reject(new Error(`Server exited ${code}: ${output}`)); });
      child.stderr.on('data', (chunk) => { output += chunk; });
      child.stdout.on('data', (chunk) => {
        output += chunk;
        const match = output.match(/http:\/\/localhost:(\d+)/);
        if (match) { clearTimeout(timeout); resolve(match[0]); }
      });
    });
    await run(url);
  } finally {
    const exited = new Promise((resolve) => child.once('exit', resolve));
    if (child.exitCode === null) { child.kill(); await exited; }
    await rm(cwd, { recursive: true, force: true });
  }
}

test('starts without an API key and permits manual evaluation', async () => {
  await withServer('', async (url) => {
    const response = await fetch(`${url}/api/train/gina-response`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario: { id: 'scen-1-briefing-incompleto' } }),
    });
    assert.equal(response.status, 503);
    const body = await response.json();
    assert.equal(body.canFallbackManual, true);
    assert.equal(body.code, 'ai_not_configured');
    assert.match(body.error, /\.env\.local/);
  });
});

test('loads .env.local without exposing the API key in health output', async () => {
  await withServer('GEMINI_API_KEY=local-test-key-never-sent\n', async (url) => {
    const response = await fetch(`${url}/api/health`);
    assert.equal(response.status, 200);
    const text = await response.text();
    assert.equal(JSON.parse(text).aiConfigured, true);
    assert.equal(text.includes('local-test-key-never-sent'), false);
  });
});

test('unknown API routes return JSON rather than downloading the SPA as HTML', async () => {
  await withServer('', async (url) => {
    const response = await fetch(`${url}/api/not-a-route`);
    assert.equal(response.status, 404);
    assert.match(response.headers.get('content-type'), /application\/json/);
  });
});

test('training routes reject scenarios that are not in the server list', async () => {
  await withServer('', async (url) => {
    const forged = { id: 'cenario-inventado', briefing: 'Briefing forjado', expectedCriteria: {} };
    for (const [route, body] of [
      ['gina-response', { scenario: forged }],
      ['evaluate-practice', { scenario: forged, userSubmission: 'resposta' }],
    ]) {
      const response = await fetch(`${url}/api/train/${route}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      assert.equal(response.status, 400, route);
    }
  });
});

test('challenge solver rejects ids that are not in the server fixtures', async () => {
  await withServer('', async (url) => {
    const response = await fetch(`${url}/api/challenges/solve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        challengeId: 'desafio-inventado',
        briefing: 'Qualquer briefing enviado pelo navegador',
        deterministicFacts: { consentStatus: 'granted' },
      }),
    });
    assert.equal(response.status, 400);
  });
});

test('challenge solver accepts a known id without trusting client facts', async () => {
  await withServer('', async (url) => {
    const response = await fetch(`${url}/api/challenges/solve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challengeId: 'desafio-1-vip-consentimento-revogado' }),
    });
    // Um desafio conhecido passa da validação; o bloqueio seguinte é de orçamento ou de chave.
    assert.notEqual(response.status, 400);
    assert.equal((await response.json()).blocked, true);
  });
});

test('challenge budget starts empty when the server starts', async () => {
  await withServer('', async (url) => {
    const status = await (await fetch(`${url}/api/challenges/status`)).json();
    assert.equal(status.budgetConsumed, 0);
    assert.equal(status.budgetExhausted, false);
    assert.equal(status.circuitBreakerOpen, false);
  });
});

test('Salesforce demo mode returns Gina decisions without any org', async () => {
  await withServer('', async (url) => {
    const body = await (await fetch(`${url}/api/salesforce/customers`)).json();
    assert.equal(body.source, 'demo');
    assert.equal(body.referenceDate, '2026-10-10');
    const actions = Object.fromEntries(body.customers.map((c) => [c.name, c.facts.recommendedAction]));
    assert.equal(actions['Marina Souza'], 'friendly_nudge');
    assert.equal(actions['Ana Lima'], 'no_message');
    assert.equal(actions['Roberto Alves'], 'concierge_human');
    assert.equal(actions['Helena Costa'], 'dormancy_rest');
    assert.equal(actions['Carlos Nunes'], 'refuse_spam');
    assert.equal(actions['Fernanda Dias'], 'dormancy_rest');
  });
});

test('Salesforce org mode explains what is missing when not configured', async () => {
  await withServer('', async (url) => {
    const response = await fetch(`${url}/api/salesforce/customers?source=org`);
    assert.equal(response.status, 503);
    const body = await response.json();
    assert.equal(body.code, 'salesforce_not_configured');
    assert.match(body.error, /\.env\.local/);
  });
});

test('owner task: demo only simulates, decisions are recomputed and org needs config', async () => {
  await withServer('', async (url) => {
    const post = (body) =>
      fetch(`${url}/api/salesforce/tasks`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

    const marina = await post({ source: 'demo', contactId: '003DEMO01' });
    assert.equal(marina.status, 200);
    const created = await marina.json();
    assert.equal(created.simulated, true);
    assert.match(created.task.Subject, /^Gina: aprovar lembrete amigável/);

    // A tela não escolhe a decisão: Ana está em ritmo, mesmo que o cliente mande outra coisa.
    const ana = await post({ source: 'demo', contactId: '003DEMO02', recommendedAction: 'friendly_nudge' });
    assert.equal(ana.status, 409);
    assert.equal((await ana.json()).code, 'no_task_needed');

    assert.equal((await post({ source: 'demo', contactId: '003NAOEXISTE' })).status, 404);

    const org = await post({ source: 'org', contactId: '003gK000017SVagQAG' });
    assert.equal(org.status, 503);
    assert.equal((await org.json()).code, 'salesforce_not_configured');
  });
});

test('download endpoint returns an actual source ZIP', async () => {
  await withServer('', async (url) => {
    const response = await fetch(`${url}/api/download-zip`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /application\/zip/);
    const archive = unzipSync(new Uint8Array(await response.arrayBuffer()));
    assert.ok(archive['server.ts']);
    assert.ok(archive['README.md']);
    assert.equal(archive['.env.local'], undefined);
  });
});
