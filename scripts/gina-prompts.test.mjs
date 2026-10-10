import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SCENARIOS } from '../src/data/scenarios.ts';
import { readFileSync } from 'node:fs';
import { buildGinaScenarioMessage, GINA_SYSTEM_PROMPT } from '../src/utils/ginaPrompts.ts';

test('server has a single source for the Gina persona and rules', () => {
  const server = readFileSync(new URL('../server.ts', import.meta.url), 'utf8');
  assert.equal(server.includes('Você é a Gina'), false, 'prompt da Gina duplicado no server.ts');
  assert.equal(server.match(/GINA_SYSTEM_PROMPT/g).length >= 3, true, 'import + duas rotas');
});

test('Gina rules carry the unified method', () => {
  for (const rule of ['3 ou mais contatos ignorados', 'inclusive para clientes VIP', 'margem unitária após o desconto', 'holdout', 'nunca a média']) {
    assert.ok(GINA_SYSTEM_PROMPT.includes(rule), `regra ausente: ${rule}`);
  }
});

test('Gina scenario message never carries the answer key', () => {
  for (const scenario of SCENARIOS) {
    const message = buildGinaScenarioMessage(scenario);
    assert.ok(message.includes(scenario.id), `${scenario.id}: id ausente`);
    assert.equal(message.includes('Critérios esperados'), false, `${scenario.id}: critérios no prompt`);
    assert.equal(message.includes('Indicadores críticos'), false, `${scenario.id}: indicadores no prompt`);
    assert.equal(message.includes(scenario.expectedCriteria.governance), false, `${scenario.id}: texto do gabarito no prompt`);
    assert.equal(message.includes(scenario.defaultGinaResponse.wittyRemark), false, `${scenario.id}: resposta padrão no prompt`);
  }
});
