import { Scenario } from '../types/crm';
import { normalizeAndSanitizeText, sanitizeCustomerDataAndMetadata } from './contextEngineering';

/**
 * Mensagem enviada à Gina no modo "Gina responde".
 * Não inclui expectedCriteria, criticalIndicators nem defaultGinaResponse:
 * a Gina decide só com o briefing e os dados, como faria numa loja de verdade.
 */
export function buildGinaScenarioMessage(scenario: Scenario): string {
  const briefing = normalizeAndSanitizeText(scenario.briefing || '').sanitized;
  const data = sanitizeCustomerDataAndMetadata(scenario.data || {}).sanitized;

  return `Analise este cenário de CRM como Gina:
Identificador: ${scenario.id}
Título: ${scenario.title}
Briefing: """${briefing}"""
Dados da base/cliente: """${JSON.stringify(data)}"""

Retorne sua avaliação estruturada, seu diagnóstico matemático e sua fala no tom inconfundível da Gina.`;
}
