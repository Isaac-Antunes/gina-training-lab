import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SCENARIOS } from '../src/data/scenarios.ts';
import { buildGinaScenarioMessage } from '../src/utils/ginaPrompts.ts';

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
