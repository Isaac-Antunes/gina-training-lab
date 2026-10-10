// Gera em playground/ os roteiros para testar a Gina no playground do Claude,
// usando exatamente o prompt e a mensagem que o servidor envia.
// Uso: npm run playground
import { writeFileSync, mkdirSync } from 'node:fs';
import { SCENARIOS } from '../src/data/scenarios';
import { buildGinaScenarioMessage, GINA_SYSTEM_PROMPT } from '../src/utils/ginaPrompts';

const FORMAT = `Responda somente com um objeto JSON, sem texto antes ou depois, com estes campos:
- mood: "listening" | "reading_rhythm" | "heads_up" | "drafting" | "win_back" | "quiet_hours"
- wittyRemark: frase curta da Gina no seu tom
- classification: "in_rhythm" | "delay" | "dormant" | "new_customer" | "vip_delayed" | "incomplete_data" | "governance_violation"
- rhythmSummary: resumo factual dos cálculos
- recommendedAction: "no_message" | "friendly_nudge" | "concierge_human" | "dormancy_rest" | "refuse_spam" | "request_audience"
- decisionExplanation: por que essa decisão
- suggestedCopy: mensagem sugerida ao cliente, ou explicação de por que não há mensagem
- governanceAlert: alerta de governança, se houver
- hasCriticalViolation: true | false`;

const slug = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

mkdirSync('playground', { recursive: true });
for (const scenario of SCENARIOS) {
  const g = scenario.defaultGinaResponse;
  const md = `# Playground — Cenário ${scenario.number} · ${scenario.title}

${scenario.tagline}. Gerado por \`npm run playground\` a partir de \`src/utils/ginaPrompts.ts\` e \`src/data/scenarios.ts\`; não edite à mão.

Configuração sugerida: modelo \`claude-sonnet-5-5\`, temperatura 0.2.

## System prompt

\`\`\`
${GINA_SYSTEM_PROMPT}

${FORMAT}
\`\`\`

> No app, o formato JSON é imposto pelo \`responseSchema\` do Gemini. Aqui ele vai descrito no fim do prompt.

## Mensagem do usuário

Idêntica à que o servidor envia. Não inclui o gabarito: a Gina decide só com o briefing e os dados.

\`\`\`
${buildGinaScenarioMessage(scenario)}
\`\`\`

## Gabarito para comparar

| Campo | Esperado |
|---|---|
| classification | \`${g.classification}\` |
| recommendedAction | \`${g.recommendedAction}\` |
| hasCriticalViolation | \`${g.hasCriticalViolation}\` |
| mood | \`${g.mood}\` |

**Indicadores críticos (qualquer um reprova):**
${scenario.criticalIndicators.map((i) => `- ${i}`).join('\n')}

**O que a resposta precisa mostrar:**
- Interpretação: ${scenario.expectedCriteria.interpretation}
- Aplicação CRM: ${scenario.expectedCriteria.crmApplication}
- Governança: ${scenario.expectedCriteria.governance}
- Clareza: ${scenario.expectedCriteria.clarity}
`;
  writeFileSync(`playground/cenario-${scenario.number}-${slug(scenario.title)}.md`, md);
}
console.log(`Roteiros gerados: ${SCENARIOS.length}`);
