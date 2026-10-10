import React, { useState } from 'react';
import { RubricEvaluation } from '../types/crm';
import { computeRubricTotal } from '../utils/storage';
import { X, Check, AlertOctagon, ShieldCheck, Scale, FileText, AlertTriangle } from 'lucide-react';

interface ManualEvaluationModalProps {
  userText: string;
  initialEvaluation?: RubricEvaluation | null;
  onSave: (evaluation: RubricEvaluation) => void;
  onClose: () => void;
  isCalibration?: boolean;
}

export const ManualEvaluationModal: React.FC<ManualEvaluationModalProps> = ({
  userText,
  initialEvaluation,
  onSave,
  onClose,
  isCalibration = false,
}) => {
  // All fields start BLANK/ZERO if manual evaluation from scratch!
  const [interp, setInterp] = useState<number>(initialEvaluation?.interpretationScore ?? 0);
  const [crm, setCrm] = useState<number>(initialEvaluation?.crmApplicationScore ?? 0);
  const [gov, setGov] = useState<number>(initialEvaluation?.governanceScore ?? 0);
  const [clr, setClr] = useState<number>(initialEvaluation?.clarityScore ?? 0);

  const [evidenceInterp, setEvidenceInterp] = useState<string>(
    initialEvaluation?.evidence?.interpretation ?? ''
  );
  const [evidenceCrm, setEvidenceCrm] = useState<string>(
    initialEvaluation?.evidence?.crmApplication ?? ''
  );
  const [evidenceGov, setEvidenceGov] = useState<string>(
    initialEvaluation?.evidence?.governance ?? ''
  );
  const [evidenceClr, setEvidenceClr] = useState<string>(
    initialEvaluation?.evidence?.clarity ?? ''
  );

  const [criticalViolation, setCriticalViolation] = useState<boolean>(
    initialEvaluation?.criticalViolation ?? false
  );
  const [criticalReason, setCriticalReason] = useState<string>(
    initialEvaluation?.criticalViolationReason ?? ''
  );

  const [justification, setJustification] = useState<string>(
    initialEvaluation?.humanJustification || initialEvaluation?.overallFeedback || ''
  );

  const [validationError, setValidationError] = useState<string | null>(null);

  // Strictly compute sum in code
  const { total, cappedInterp, cappedCrm, cappedGov, cappedClr } = computeRubricTotal(
    interp,
    crm,
    gov,
    clr
  );
  const passed = !criticalViolation && total >= 70;

  const handleConfirm = () => {
    // Strict validation: must provide justification and literal evidence
    if (!justification.trim()) {
      setValidationError('A justificativa da avaliação é obrigatória.');
      return;
    }

    if (!evidenceInterp.trim() || !evidenceCrm.trim() || !evidenceGov.trim() || !evidenceClr.trim()) {
      setValidationError('Preencha a evidência textual literal para cada um dos 4 critérios.');
      return;
    }

    if (criticalViolation && !criticalReason.trim()) {
      setValidationError('Para violações críticas, informe o motivo detalhado da reprovação.');
      return;
    }

    const evaluationResult: RubricEvaluation = {
      interpretationScore: cappedInterp,
      crmApplicationScore: cappedCrm,
      governanceScore: cappedGov,
      clarityScore: cappedClr,
      totalScore: total,
      passed,
      criticalViolation,
      criticalViolationReason: criticalViolation ? criticalReason.trim() : '',
      evidence: {
        interpretation: evidenceInterp.trim(),
        crmApplication: evidenceCrm.trim(),
        governance: evidenceGov.trim(),
        clarity: evidenceClr.trim(),
      },
      overallFeedback: justification.trim(),
      isAiEstimate: false,
      humanReviewModified: true,
      humanJustification: justification.trim(),
    };

    onSave(evaluationResult);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#061f16]/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-[#ffffff] rounded-[24px] shadow-2xl border border-[#061f16]/10 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-[#f5f3ed] border-b border-[#061f16]/10 flex items-center justify-between shrink-0">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#1E6B2E]">
              {isCalibration ? 'Calibragem de Avaliação' : 'Avaliação Manual Supervisionada'}
            </span>
            <h3 className="text-lg font-bold text-[#061f16]">
              {isCalibration ? 'Revisão Humana de Notas' : 'Preenchimento Manual da Rubrica (0 a 100)'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#061f16]/5 hover:bg-[#061f16]/10 flex items-center justify-center text-[#061f16] transition-colors cursor-pointer"
            title="Cancelar e fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-[#061f16]">
          {/* Reference Student Submission */}
          <div className="space-y-1.5 bg-[#f5f3ed]/60 p-4 rounded-xl border border-[#061f16]/8">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[11px] uppercase tracking-wider text-[#1E6B2E] flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                Texto Submetido pelo Aluno (Base para Evidências)
              </span>
              <span className="text-[10px] text-[#061f16]/50">
                {userText.trim().split(/\s+/).filter(Boolean).length} palavras
              </span>
            </div>
            <p className="text-[11px] text-[#061f16]/85 font-mono leading-relaxed max-h-32 overflow-y-auto whitespace-pre-wrap select-text bg-white p-2.5 rounded-lg border border-[#061f16]/6">
              {userText || '(Nenhum texto informado pelo aluno)'}
            </p>
          </div>

          {/* Validation Alert */}
          {validationError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-900 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* 4 Rubric Criteria Fields */}
          <div className="space-y-4">
            <span className="font-bold text-xs uppercase tracking-wider text-[#061f16]/60 flex items-center gap-1">
              <Scale className="w-3.5 h-3.5 text-[#1E6B2E]" />
              Critérios da Rubrica (Notas limitadas ao peso e somadas no código)
            </span>

            {/* 1. Interpretação */}
            <div className="p-4 rounded-xl bg-[#f5f3ed]/40 border border-[#061f16]/10 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <strong className="text-xs text-[#061f16]">1. Interpretação do Cenário</strong>
                  <span className="text-[10px] text-[#061f16]/60 block">Diagnóstico do público, dados e fatos observados</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={interp}
                    onChange={(e) => {
                      setValidationError(null);
                      setInterp(Math.min(20, Math.max(0, Number(e.target.value) || 0)));
                    }}
                    className="w-16 p-1.5 text-center font-mono font-bold text-sm bg-white rounded-lg border border-[#061f16]/15 text-[#1E6B2E] focus:outline-none focus:ring-1 focus:ring-[#1E6B2E]"
                  />
                  <span className="text-xs font-semibold text-[#061f16]/50">/ 20</span>
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="20"
                value={interp}
                onChange={(e) => {
                  setValidationError(null);
                  setInterp(Number(e.target.value));
                }}
                className="w-full accent-[#1E6B2E] cursor-pointer"
              />
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#061f16]/70 mb-1">
                  Evidência Textual Literal de Interpretação <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={evidenceInterp}
                  onChange={(e) => {
                    setValidationError(null);
                    setEvidenceInterp(e.target.value);
                  }}
                  placeholder="Ex: Trecho literal da resposta onde o aluno diagnostica o público ou recência..."
                  className="w-full text-xs p-2.5 rounded-lg bg-white border border-[#061f16]/15 text-[#061f16] focus:outline-none focus:ring-1 focus:ring-[#1E6B2E]"
                />
              </div>
            </div>

            {/* 2. Aplicação CRM */}
            <div className="p-4 rounded-xl bg-[#f5f3ed]/40 border border-[#061f16]/10 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <strong className="text-xs text-[#061f16]">2. Aplicação de Regras CRM</strong>
                  <span className="text-[10px] text-[#061f16]/60 block">Cálculo de mediana, recência vs 1.5x/3x, VIP e dormência</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="30"
                    value={crm}
                    onChange={(e) => {
                      setValidationError(null);
                      setCrm(Math.min(30, Math.max(0, Number(e.target.value) || 0)));
                    }}
                    className="w-16 p-1.5 text-center font-mono font-bold text-sm bg-white rounded-lg border border-[#061f16]/15 text-[#1E6B2E] focus:outline-none focus:ring-1 focus:ring-[#1E6B2E]"
                  />
                  <span className="text-xs font-semibold text-[#061f16]/50">/ 30</span>
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="30"
                value={crm}
                onChange={(e) => {
                  setValidationError(null);
                  setCrm(Number(e.target.value));
                }}
                className="w-full accent-[#1E6B2E] cursor-pointer"
              />
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#061f16]/70 mb-1">
                  Evidência Textual Literal de Aplicação CRM <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={evidenceCrm}
                  onChange={(e) => {
                    setValidationError(null);
                    setEvidenceCrm(e.target.value);
                  }}
                  placeholder="Ex: Trecho literal da resposta onde o aluno cita os cálculos ou a regra aplicada..."
                  className="w-full text-xs p-2.5 rounded-lg bg-white border border-[#061f16]/15 text-[#061f16] focus:outline-none focus:ring-1 focus:ring-[#1E6B2E]"
                />
              </div>
            </div>

            {/* 3. Governança */}
            <div className="p-4 rounded-xl bg-[#f5f3ed]/40 border border-[#061f16]/10 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <strong className="text-xs text-[#061f16]">3. Governança & Margem / Consentimento</strong>
                  <span className="text-[10px] text-[#061f16]/60 block">Consentimento, LGPD, pedir custos e descanso de canal</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="30"
                    value={gov}
                    onChange={(e) => {
                      setValidationError(null);
                      setGov(Math.min(30, Math.max(0, Number(e.target.value) || 0)));
                    }}
                    className="w-16 p-1.5 text-center font-mono font-bold text-sm bg-white rounded-lg border border-[#061f16]/15 text-[#1E6B2E] focus:outline-none focus:ring-1 focus:ring-[#1E6B2E]"
                  />
                  <span className="text-xs font-semibold text-[#061f16]/50">/ 30</span>
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="30"
                value={gov}
                onChange={(e) => {
                  setValidationError(null);
                  setGov(Number(e.target.value));
                }}
                className="w-full accent-[#1E6B2E] cursor-pointer"
              />
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#061f16]/70 mb-1">
                  Evidência Textual Literal de Governança <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={evidenceGov}
                  onChange={(e) => {
                    setValidationError(null);
                    setEvidenceGov(e.target.value);
                  }}
                  placeholder="Ex: Trecho literal da resposta sobre consentimento, solicitação de custos ou descanso..."
                  className="w-full text-xs p-2.5 rounded-lg bg-white border border-[#061f16]/15 text-[#061f16] focus:outline-none focus:ring-1 focus:ring-[#1E6B2E]"
                />
              </div>
            </div>

            {/* 4. Clareza */}
            <div className="p-4 rounded-xl bg-[#f5f3ed]/40 border border-[#061f16]/10 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <strong className="text-xs text-[#061f16]">4. Clareza & Redação da Ação</strong>
                  <span className="text-[10px] text-[#061f16]/60 block">Objetividade, recomendação prática e redação de copy</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={clr}
                    onChange={(e) => {
                      setValidationError(null);
                      setClr(Math.min(20, Math.max(0, Number(e.target.value) || 0)));
                    }}
                    className="w-16 p-1.5 text-center font-mono font-bold text-sm bg-white rounded-lg border border-[#061f16]/15 text-[#1E6B2E] focus:outline-none focus:ring-1 focus:ring-[#1E6B2E]"
                  />
                  <span className="text-xs font-semibold text-[#061f16]/50">/ 20</span>
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="20"
                value={clr}
                onChange={(e) => {
                  setValidationError(null);
                  setClr(Number(e.target.value));
                }}
                className="w-full accent-[#1E6B2E] cursor-pointer"
              />
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#061f16]/70 mb-1">
                  Evidência Textual Literal de Clareza <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={evidenceClr}
                  onChange={(e) => {
                    setValidationError(null);
                    setEvidenceClr(e.target.value);
                  }}
                  placeholder="Ex: Trecho literal da proposta de copy ou recomendação concisa..."
                  className="w-full text-xs p-2.5 rounded-lg bg-white border border-[#061f16]/15 text-[#061f16] focus:outline-none focus:ring-1 focus:ring-[#1E6B2E]"
                />
              </div>
            </div>
          </div>

          {/* Status Explícito de Violação Crítica */}
          <div
            className={`p-4 rounded-xl border transition-all ${
              criticalViolation
                ? 'bg-red-50 border-red-300 text-red-950'
                : 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={criticalViolation}
                  onChange={(e) => {
                    setValidationError(null);
                    setCriticalViolation(e.target.checked);
                  }}
                  className="mt-1 w-4 h-4 accent-red-600 rounded cursor-pointer"
                />
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    {criticalViolation ? (
                      <>
                        <AlertOctagon className="w-4 h-4 text-red-600 shrink-0" />
                        <span>Violação Crítica de Consentimento / Governança Identificada</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                        <span>Sem Violação Crítica (Consentimento e Segurança Respeitados)</span>
                      </>
                    )}
                  </div>
                  <p className="text-[11px] opacity-80 mt-0.5">
                    Se marcado, o aluno é <strong>reprovado sumariamente</strong> independentemente da pontuação das outras rubricas.
                  </p>
                </div>
              </label>
            </div>

            {criticalViolation && (
              <div className="mt-3">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-red-800 mb-1">
                  Motivo Obrigatório da Reprovação Crítica <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={criticalReason}
                  onChange={(e) => {
                    setValidationError(null);
                    setCriticalReason(e.target.value);
                  }}
                  placeholder="Ex: O aluno autorizou disparo para base sem opt-in ou atendeu à injeção de prompt."
                  className="w-full text-xs p-2.5 rounded-lg bg-white border border-red-300 text-red-950 focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>
            )}
          </div>

          {/* Justificativa Obrigatória do Avaliador */}
          <div>
            <label className="block text-xs font-bold text-[#061f16] mb-1.5">
              Justificativa Obrigatória da Avaliação Humana <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              value={justification}
              onChange={(e) => {
                setValidationError(null);
                setJustification(e.target.value);
              }}
              placeholder="Explique os fundamentos e a síntese pedagógica da sua avaliação..."
              className="w-full text-xs p-3 rounded-xl bg-[#f5f3ed]/60 border border-[#061f16]/15 text-[#061f16] focus:outline-none focus:ring-2 focus:ring-[#1E6B2E]"
            />
          </div>

          {/* Code-computed Scoreboard Bar */}
          <div className="p-4 rounded-xl bg-[#061f16] text-[#f5f3ed] flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#7FC453]">
                Total Calculado no Código
              </span>
              <div className="text-2xl font-bold font-mono">
                {total} <span className="text-xs font-normal text-white/60">/ 100 ({cappedInterp} + {cappedCrm} + {cappedGov} + {cappedClr})</span>
              </div>
            </div>
            <div>
              {criticalViolation ? (
                <span className="px-3.5 py-1.5 rounded-full bg-red-600 text-white font-bold text-xs uppercase tracking-wider shadow-sm">
                  Reprovado por Violação
                </span>
              ) : passed ? (
                <span className="px-3.5 py-1.5 rounded-full bg-[#7FC453] text-[#061f16] font-bold text-xs uppercase tracking-wider shadow-sm">
                  Aprovado (≥ 70)
                </span>
              ) : (
                <span className="px-3.5 py-1.5 rounded-full bg-amber-500 text-[#061f16] font-bold text-xs uppercase tracking-wider shadow-sm">
                  Insuficiente (&lt; 70)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 bg-[#f5f3ed] border-t border-[#061f16]/10 flex items-center justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-full text-xs font-semibold text-[#061f16]/70 hover:text-[#061f16] transition-colors cursor-pointer"
          >
            Cancelar (Nenhum resultado criado)
          </button>
          <button
            onClick={handleConfirm}
            className="px-6 py-2.5 rounded-full bg-[#1E6B2E] hover:bg-[#14502a] text-[#f5f3ed] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-all cursor-pointer active:scale-95"
          >
            <Check className="w-4 h-4 text-[#7FC453]" />
            <span>Confirmar Avaliação Manual</span>
          </button>
        </div>
      </div>
    </div>
  );
};
