import { RubricEvaluation, TrainingSession } from '../types/crm';

export const STORAGE_KEY = 'gina_training_lab_history_v1';
export const BACKUP_KEY = 'gina_training_lab_history_backup_corrupt';

export interface RubricValidationResult {
  isValid: boolean;
  errors: string[];
  totalScore: number;
  passed: boolean;
  cappedScores: {
    interpretation: number;
    crmApplication: number;
    governance: number;
    clarity: number;
  };
}

/**
 * Validates rubric scoring with strict domain constraints:
 * - Reject NaN or negative scores
 * - Cap scores strictly to weights: interp (20), crm (30), gov (30), clr (20)
 * - Critical violation always forces passed = false even if total is 100
 * - Verify that text evidences exist and match portions of the student's text
 */
export function validateRubricScoring({
  interp,
  crm,
  gov,
  clr,
  criticalViolation = false,
  evidence,
  studentText = '',
}: {
  interp: number;
  crm: number;
  gov: number;
  clr: number;
  criticalViolation?: boolean;
  evidence?: {
    interpretation?: string;
    crmApplication?: string;
    governance?: string;
    clarity?: string;
  };
  studentText?: string;
}): RubricValidationResult {
  const errors: string[] = [];

  if (isNaN(interp) || interp < 0) errors.push('Nota de interpretação é inválida ou NaN.');
  if (isNaN(crm) || crm < 0) errors.push('Nota de aplicação CRM é inválida ou NaN.');
  if (isNaN(gov) || gov < 0) errors.push('Nota de governança é inválida ou NaN.');
  if (isNaN(clr) || clr < 0) errors.push('Nota de clareza é inválida ou NaN.');

  const cappedInterp = Math.min(20, Math.max(0, Math.round(Number(interp) || 0)));
  const cappedCrm = Math.min(30, Math.max(0, Math.round(Number(crm) || 0)));
  const cappedGov = Math.min(30, Math.max(0, Math.round(Number(gov) || 0)));
  const cappedClr = Math.min(20, Math.max(0, Math.round(Number(clr) || 0)));

  if (interp > 20) errors.push(`Nota de interpretação (${interp}) excedeu o peso máximo de 20.`);
  if (crm > 30) errors.push(`Nota de aplicação CRM (${crm}) excedeu o peso máximo de 30.`);
  if (gov > 30) errors.push(`Nota de governança (${gov}) excedeu o peso máximo de 30.`);
  if (clr > 20) errors.push(`Nota de clareza (${clr}) excedeu o peso máximo de 20.`);

  const totalScore = cappedInterp + cappedCrm + cappedGov + cappedClr;

  // Critical violation forces failure regardless of score (even with 100)
  const passed = !criticalViolation && totalScore >= 70;

  // Evidence validation against student text if provided
  if (evidence && studentText.trim().length > 0) {
    const normalize = (t: string) => t.toLowerCase().replace(/\s+/g, ' ').trim();
    const normalizedStudent = normalize(studentText);

    const checkEvidence = (text: string | undefined, name: string) => {
      if (!text || text.trim().length === 0) {
        errors.push(`Evidência de ${name} está ausente.`);
      } else {
        const normalizedEv = normalize(text);
        // If evidence is claimed to be a quote, check if at least a significant portion appears in student text
        if (normalizedEv.length >= 8 && !normalizedStudent.includes(normalizedEv.slice(0, 20))) {
          // Flag as unverified quote
          errors.push(`Evidência de ${name} não foi localizada no texto submetido pelo aluno.`);
        }
      }
    };

    checkEvidence(evidence.interpretation, 'interpretação');
    checkEvidence(evidence.crmApplication, 'aplicação CRM');
    checkEvidence(evidence.governance, 'governança');
    checkEvidence(evidence.clarity, 'clareza');
  }

  return {
    isValid: errors.length === 0,
    errors,
    totalScore,
    passed,
    cappedScores: {
      interpretation: cappedInterp,
      crmApplication: cappedCrm,
      governance: cappedGov,
      clarity: cappedClr,
    },
  };
}

export function computeRubricTotal(
  interp: number,
  crm: number,
  gov: number,
  clr: number
): { total: number; cappedInterp: number; cappedCrm: number; cappedGov: number; cappedClr: number } {
  const cappedInterp = Math.min(20, Math.max(0, Math.round(Number(interp) || 0)));
  const cappedCrm = Math.min(30, Math.max(0, Math.round(Number(crm) || 0)));
  const cappedGov = Math.min(30, Math.max(0, Math.round(Number(gov) || 0)));
  const cappedClr = Math.min(20, Math.max(0, Math.round(Number(clr) || 0)));
  const total = cappedInterp + cappedCrm + cappedGov + cappedClr;

  return { total, cappedInterp, cappedCrm, cappedGov, cappedClr };
}

/**
 * Loads training history from storage.
 * In case of corruption:
 * - Backs up the raw corrupted string to BACKUP_KEY without silently erasing it
 * - Salvages any valid session JSON objects using regex pattern matching
 * - Returns the salvaged sessions
 */
export function loadTrainingHistory(): TrainingSession[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch (parseErr) {
      console.warn('Detectada corrupção no JSON do histórico. Iniciando recuperação segura...');
      // Safe recovery: backup corrupt data
      try {
        localStorage.setItem(BACKUP_KEY, raw);
      } catch (backupErr) {
        console.error('Falha ao gravar backup de histórico corrompido:', backupErr);
      }

      // Salvage valid session objects from the corrupt string
      const salvaged: TrainingSession[] = [];
      const sessionMatches = raw.match(/\{[^{}]*"id"\s*:\s*"[^"]+"[^{}]*\}/g);
      if (sessionMatches) {
        for (const match of sessionMatches) {
          try {
            const obj = JSON.parse(match);
            if (obj && obj.id && obj.scenarioId) {
              salvaged.push(obj as TrainingSession);
            }
          } catch {
            // Ignore incomplete fragments
          }
        }
      }

      if (salvaged.length > 0) {
        console.info(`Recuperadas ${salvaged.length} sessões íntegras do histórico corrompido.`);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(salvaged));
        } catch {}
        return salvaged;
      }

      return [];
    }

    return [];
  } catch (err) {
    console.error('Erro ao ler histórico do localStorage:', err);
    return [];
  }
}

export function saveTrainingSession(
  session: Omit<TrainingSession, 'id' | 'timestamp' | 'formattedDate'>
): TrainingSession {
  const history = loadTrainingHistory();
  const id =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `train-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date();

  const formattedDate = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(now);

  const fullSession: TrainingSession = {
    ...session,
    id,
    timestamp: now.toISOString(),
    formattedDate,
  };

  const updatedHistory = [fullSession, ...history];
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
    }
  } catch (err) {
    console.error('Erro ao salvar no localStorage:', err);
  }

  return fullSession;
}

export function updateTrainingSession(updatedSession: TrainingSession): void {
  const history = loadTrainingHistory();
  const newHistory = history.map((s) => (s.id === updatedSession.id ? updatedSession : s));
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
    }
  } catch (err) {
    console.error('Erro ao atualizar sessão:', err);
  }
}

export function clearTrainingHistory(): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch (err) {
    console.error('Erro ao limpar histórico:', err);
  }
}

export function exportHistoryAsJson(sessions?: TrainingSession[]): void {
  const dataToExport = sessions || loadTrainingHistory();
  const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
    type: 'application/json;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `gina-training-lab-historico-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
