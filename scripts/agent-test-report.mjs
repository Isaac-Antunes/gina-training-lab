#!/usr/bin/env node
/**
 * Summarize an Agentforce Studio (NGT) agent-test run from its JSON output.
 *
 * The Salesforce CLI's human formatter does not always translate NGT scorer
 * payloads into pass/fail counts (scorer `result` can be null while the
 * authoritative verdict lives inside `scorerResponse`). This script reads the
 * JSON produced by:
 *
 *   sf agent test results -o gina-dev -i <JOB_ID> \
 *     --test-runner agentforce-studio --result-format json > results.json
 *
 * and prints one row per test case/scorer plus a final summary, exiting
 * non-zero when any scorer fails. It is intentionally dependency-free.
 */
import { readFileSync } from 'node:fs';

const file = process.argv[2];
if (!file) {
  console.error('usage: node scripts/agent-test-report.mjs <results.json>');
  process.exit(2);
}

const rawData = JSON.parse(readFileSync(file, 'utf8'));
// `sf agent test run --json` wraps the result; `sf agent test results --json`
// returns it at the top level. Accept both.
const data = rawData.result ?? rawData;
const cases = Array.isArray(data.testCases) ? data.testCases : [];
if (cases.length === 0) {
  console.error('No testCases found in', file);
  process.exit(2);
}

const normalizeList = (value) => {
  if (value === undefined || value === null) return [];
  const text = String(value).trim();
  if (!text || text === '[]') return [];
  const inner = text.replace(/^\[/, '').replace(/\]$/, '');
  return inner
    .split(',')
    .map((item) => item.trim().replace(/^['"]|['"]$/g, ''))
    .filter(Boolean)
    .sort();
};

const parseResponse = (raw) => {
  if (typeof raw !== 'string') return raw ?? {};
  try {
    return JSON.parse(raw);
  } catch {
    return { status: 'Unparsed', reasoning: String(raw).slice(0, 200) };
  }
};

const scorerVerdict = (scorerName, parsed) => {
  if (parsed && parsed.status) {
    return { pass: String(parsed.status).toLowerCase() === 'pass', detail: parsed.status };
  }
  // NGT evaluators surface infrastructure failures as a FailureMessage envelope
  // instead of a Pass/Fail status. Treat them as failures, not "unknown".
  const failureMessage = parsed?.agentResponse?.type === 'FailureMessage'
    ? parsed.agentResponse?.value?.message
    : parsed?.value?.messageType === 'Failure'
      ? parsed.value?.message
      : null;
  if (failureMessage) {
    return { pass: false, detail: `evaluator error: ${String(failureMessage).slice(0, 160)}` };
  }
  if (parsed && (parsed.actualValue !== undefined || parsed.expectedValue !== undefined)) {
    const expected = normalizeList(parsed.expectedValue);
    const actual = normalizeList(parsed.actualValue);
    const pass = expected.length === 0 && actual.length === 0
      ? true
      : JSON.stringify(expected) === JSON.stringify(actual);
    return {
      pass,
      detail: `expected ${JSON.stringify(expected)} / actual ${JSON.stringify(actual)}`,
    };
  }
  if (parsed && parsed.evaluationType) {
    const status = parsed.status ?? 'Unknown';
    return { pass: String(status).toLowerCase() === 'pass', detail: String(status) };
  }
  return { pass: false, detail: 'no verdict in scorer payload' };
};

let failed = 0;
const rows = [];

cases.forEach((testCase, caseIndex) => {
  const userInput = testCase.userInput
    ?? testCase.input?.utterance
    ?? testCase.inputs?.[0]?.utterance
    ?? '(unknown input)';
  const scorers = Array.isArray(testCase.testScorerResults) ? testCase.testScorerResults : [];

  scorers.forEach((scorer) => {
    const parsed = parseResponse(scorer.scorerResponse);
    const verdict = scorerVerdict(scorer.scorerName, parsed);
    if (!verdict.pass) failed += 1;
    rows.push({
      case: caseIndex + 1,
      input: userInput,
      scorer: scorer.scorerName,
      verdict: verdict.pass ? 'PASS' : 'FAIL',
      detail: verdict.detail,
    });
  });
});

const width = Math.max(9, ...rows.map((row) => row.scorer.length));
console.log('\nAgentforce test results\n' + '='.repeat(24));
for (const row of rows) {
  console.log(
    `#${String(row.case).padStart(2)} ${row.verdict.padEnd(4)} ${row.scorer.padEnd(width)} ${row.detail}`,
  );
}

const summary = data.summary ?? {};
const percent = (key) => (summary[key] === undefined ? 'n/a' : `${summary[key]}%`);
console.log('\nSummary');
console.log('-------');
console.log(`topic match:      ${percent('topicPassPercent')}`);
console.log(`action match:     ${percent('actionPassPercent')}`);
console.log(`outcome eval:     ${percent('outcomeEvalPassPercent')}`);
console.log(`test cases:       ${summary.totalNumberOfTestCases ?? cases.length}`);
console.log(`failing scorers:  ${failed}`);

process.exit(failed === 0 ? 0 : 1);
