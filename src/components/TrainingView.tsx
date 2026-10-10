import React, { useState, useEffect } from 'react';
import { Scenario, GinaStructuredResponse, RubricEvaluation } from '../types/crm';
import { GinaCharacter } from './GinaCharacter';
import { GinaSpeechBubble } from './GinaSpeechBubble';
import { ManualEvaluationModal } from './ManualEvaluationModal';
import { saveTrainingSession } from '../utils/storage';
import {
  saveActiveDraft,
  loadActiveDraft,
  clearActiveDraft,
  validateInputPayload,
  getIsStorageQuotaExceeded,
} from '../utils/contextEngineering';
import {
  Sparkles,
  PenTool,
  AlertOctagon,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  BookmarkCheck,
  ChevronLeft,
  ChevronRight,
  Info,
  UserCheck,
  Scale,
  EyeOff,
  Eye,
  BookOpen,
  Database,
} from 'lucide-react';

interface TrainingViewProps {
  scenarios: Scenario[];
  selectedScenario: Scenario;
  onSelectScenario: (scenario: Scenario) => void;
  onSavedSession: () => void;
}

export const TrainingView: React.FC<TrainingViewProps> = ({
  scenarios,
  selectedScenario,
  onSelectScenario,
  onSavedSession,
}) => {
  const [mode, setMode] = useState<'gina' | 'practice'>('gina');

  // Gina Mode state
  const [ginaResponse, setGinaResponse] = useState<GinaStructuredResponse | null>(null);
  const [isGinaLoading, setIsGinaLoading] = useState<boolean>(false);
  const [ginaError, setGinaError] = useState<string | null>(null);
  const [isManualGina, setIsManualGina] = useState<boolean>(false);

  // Practice Mode state
  const [userText, setUserText] = useState<string>('');
  const [evaluation, setEvaluation] = useState<RubricEvaluation | null>(null);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [evalError, setEvalError] = useState<string | null>(null);
  const [isManualModalOpen, setIsManualModalOpen] = useState<boolean>(false);
  const [isCalibrationMode, setIsCalibrationMode] = useState<boolean>(false);
  const [revealedCriteria, setRevealedCriteria] = useState<boolean>(false);

  // Notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Restore draft on mount if exists
  useEffect(() => {
    const draft = loadActiveDraft();
    if (draft && draft.scenarioId === selectedScenario.id) {
      if (draft.userSubmission) setUserText(draft.userSubmission);
      if (draft.mode) setMode(draft.mode);
      if (draft.revealedCriteria) setRevealedCriteria(draft.revealedCriteria);
    }
  }, [selectedScenario.id]);

  // Persist draft changes
  useEffect(() => {
    if (userText.trim().length > 0 || revealedCriteria) {
      saveActiveDraft({
        scenarioId: selectedScenario.id,
        mode,
        userSubmission: userText,
        revealedCriteria,
        step: evaluation ? 'reviewed' : userText ? 'composing' : 'briefing',
      });
    }
  }, [userText, mode, revealedCriteria, selectedScenario.id, evaluation]);

  // Reset local state when scenario changes
  const handleScenarioChange = (scenario: Scenario) => {
    onSelectScenario(scenario);
    setGinaResponse(null);
    setGinaError(null);
    setIsManualGina(false);
    setUserText('');
    setEvaluation(null);
    setEvalError(null);
    setRevealedCriteria(false);
  };

  const currentIndex = scenarios.findIndex((s) => s.id === selectedScenario.id);

  // Request Gina response from server endpoint with AbortController and clear loading transitions
  const fetchGinaResponse = async () => {
    if (isGinaLoading) return;
    setIsGinaLoading(true);
    setGinaError(null);
    setIsManualGina(false);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    try {
      const res = await fetch('/api/train/gina-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario: selectedScenario }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.details || `Erro do servidor (${res.status})`);
      }

      const data: GinaStructuredResponse = await res.json();
      setGinaResponse(data);
      showToast('Resposta da Gina gerada com sucesso.');
    } catch (err: any) {
      console.warn('Falha na chamada da API da Gina:', err);
      if (err.name === 'AbortError') {
        setGinaError('Tempo limite esgotado (timeout de 25s). A requisição foi cancelada.');
      } else {
        setGinaError(err.message || 'Serviço temporariamente indisponível.');
      }
    } finally {
      clearTimeout(timeoutId);
      setIsGinaLoading(false);
    }
  };

  // Use benchmark fallback explicitly marked as manual
  const useBenchmarkGina = () => {
    setGinaResponse(selectedScenario.defaultGinaResponse);
    setGinaError(null);
    setIsManualGina(true);
    showToast('Gabarito manual referencial carregado (modo assistido).');
  };

  // Evaluate user practice submission with AbortController and explicit payload validation
  const evaluateUserPractice = async () => {
    if (!userText.trim()) {
      showToast('Por favor, redija sua resposta antes de avaliar.');
      return;
    }

    // Explicit payload limit check with friendly Portuguese error (never silent truncation)
    const payloadValidation = validateInputPayload(userText);
    if (!payloadValidation.valid) {
      setEvalError(payloadValidation.friendlyError || 'Limite de entrada excedido.');
      showToast('Texto excede o limite máximo permitido.');
      return;
    }

    if (isEvaluating) return;

    setIsEvaluating(true);
    setEvalError(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    try {
      const res = await fetch('/api/train/evaluate-practice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario: selectedScenario,
          userSubmission: userText,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.details || `Erro do servidor (${res.status})`);
      }

      const data: RubricEvaluation = await res.json();
      setEvaluation(data);
      setRevealedCriteria(true); // Automatically reveal criteria upon completed evaluation
      showToast('Avaliação semântica concluída.');
    } catch (err: any) {
      console.warn('Falha na avaliação:', err);
      if (err.name === 'AbortError') {
        setEvalError('Tempo limite esgotado (timeout de 25s). Tente novamente.');
      } else {
        setEvalError(err.message || 'Serviço de avaliação indisponível no momento.');
      }
    } finally {
      clearTimeout(timeoutId);
      setIsEvaluating(false);
    }
  };

  // Save current training session
  const handleSaveSession = (sourceMode: 'gina' | 'practice') => {
    if (sourceMode === 'gina') {
      if (!ginaResponse) return;
      saveTrainingSession({
        scenarioId: selectedScenario.id,
        scenarioTitle: selectedScenario.title,
        scenarioNumber: selectedScenario.number,
        mode: 'gina',
        ginaResponse,
        isManualBenchmark: isManualGina,
      });
      showToast('Treino salvo no histórico deste navegador!');
      onSavedSession();
    } else {
      if (!evaluation) return;
      saveTrainingSession({
        scenarioId: selectedScenario.id,
        scenarioTitle: selectedScenario.title,
        scenarioNumber: selectedScenario.number,
        mode: 'practice',
        userSubmission: userText,
        evaluation,
        isAssisted: revealedCriteria,
        ginaResponse: selectedScenario.defaultGinaResponse,
      });
      showToast('Prática e avaliação salvas no histórico deste navegador!');
      onSavedSession();
    }
  };

  // Determine whether criteria should be hidden in practice mode
  const shouldHideCriteria = mode === 'practice' && !revealedCriteria && !evaluation;

  return (
    <div className="max-w-[1360px] mx-auto px-4 md:px-8 py-6 space-y-8 animate-in fade-in duration-300">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-5 py-3 rounded-full bg-[#061f16] text-[#f5f3ed] text-xs font-bold shadow-xl border border-[#7FC453]/40 flex items-center gap-2 animate-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-[#7FC453]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Scenario Header & Navigation Selector */}
      <section className="bg-[#ffffff] rounded-[24px] p-6 shadow-xs border border-[#061f16]/8 space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#061f16]/6 pb-4">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-full bg-[#1E6B2E] text-[#f5f3ed] font-['Bagel_Fat_One'] text-lg flex items-center justify-center shrink-0">
              {selectedScenario.number}
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#1E6B2E]">
                  Cenário {selectedScenario.number} de {scenarios.length}
                </span>
                <span className="text-slate-300">·</span>
                <span className="text-[11px] font-semibold text-[#061f16]/70">
                  {selectedScenario.domain}
                </span>
                <span className="text-slate-300">·</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  selectedScenario.difficulty === 'Governança'
                    ? 'bg-red-100 text-red-800'
                    : selectedScenario.difficulty === 'Avançado'
                    ? 'bg-amber-100 text-amber-900'
                    : 'bg-emerald-100 text-emerald-900'
                }`}>
                  {selectedScenario.difficulty}
                </span>
              </div>
              <h1 className="text-xl md:text-2xl font-bold text-[#061f16] tracking-tight">
                {selectedScenario.title}
              </h1>
            </div>
          </div>

          {/* Stepper buttons */}
          <div className="flex items-center gap-2 self-end md:self-auto">
            <button
              onClick={() => currentIndex > 0 && handleScenarioChange(scenarios[currentIndex - 1])}
              disabled={currentIndex === 0}
              className="p-2 rounded-full border border-[#061f16]/10 text-[#061f16] hover:bg-[#061f16]/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              title="Cenário anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono font-semibold px-2">
              {selectedScenario.number} / {scenarios.length}
            </span>
            <button
              onClick={() => currentIndex < scenarios.length - 1 && handleScenarioChange(scenarios[currentIndex + 1])}
              disabled={currentIndex === scenarios.length - 1}
              className="p-2 rounded-full border border-[#061f16]/10 text-[#061f16] hover:bg-[#061f16]/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              title="Próximo cenário"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Scenario Capsule Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {scenarios.map((s) => (
            <button
              key={s.id}
              onClick={() => handleScenarioChange(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                s.id === selectedScenario.id
                  ? 'bg-[#061f16] text-[#f5f3ed] font-semibold shadow-xs'
                  : 'bg-[#f5f3ed] hover:bg-[#e9efe2] text-[#061f16]/80'
              }`}
            >
              #{s.number} {s.title}
            </button>
          ))}
        </div>
      </section>

      {/* Briefing and Customer Data Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Briefing & Factual Context (7 cols) */}
        <div className="lg:col-span-7 bg-[#ffffff] rounded-[24px] p-6 shadow-xs border border-[#061f16]/8 space-y-5">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#1E6B2E]">O Pedido / Briefing</span>
            <p className="text-base text-[#061f16] font-medium leading-relaxed mt-1 text-pretty bg-[#f5f3ed]/60 p-4 rounded-xl border border-[#061f16]/6">
              “{selectedScenario.briefing}”
            </p>
          </div>

          {/* Fictitious Data & Mathematical Invariants */}
          <div className="space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#061f16]/60">
              Dados Fictícios & Evidências Observadas
            </span>

            {/* If individual customer with orders */}
            {selectedScenario.data.customer && (
              <div className="p-4 rounded-xl bg-[#f5f3ed]/40 border border-[#061f16]/8 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#061f16] flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-[#1E6B2E]" />
                    {selectedScenario.data.customer.name}
                  </span>
                  <span className="text-[11px] font-semibold text-[#1E6B2E] bg-[#1E6B2E]/10 px-2 py-0.5 rounded-full">
                    Consentimento: {selectedScenario.data.customer.phoneConsent === 'granted' ? 'Ativo (Opt-in)' : 'Ausente'}
                  </span>
                </div>

                {/* Orders list preview */}
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 text-xs">
                  {selectedScenario.data.customer.orders.map((o, idx) => (
                    <div key={o.id} className="flex justify-between items-center py-1 border-b border-[#061f16]/5 text-[#061f16]/80 font-mono text-[11px]">
                      <span>#{idx + 1} · {o.date}</span>
                      <span className="truncate max-w-[180px] text-right font-sans">{o.items.join(', ')}</span>
                      <span className="font-bold">R$ {o.total.toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                {/* Rhythm & Recency calculation summary */}
                <div className="pt-2 border-t border-[#061f16]/10 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2 rounded-lg bg-[#ffffff]">
                    <span className="text-[10px] text-[#061f16]/60 uppercase font-semibold block">Intervalo Mediano</span>
                    <span className="font-bold text-[#1E6B2E] font-mono text-sm">
                      {selectedScenario.data.medianIntervalDays ? `${selectedScenario.data.medianIntervalDays} dias` : '—'}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-[#ffffff]">
                    <span className="text-[10px] text-[#061f16]/60 uppercase font-semibold block">Recência Atual</span>
                    <span className="font-bold text-[#061f16] font-mono text-sm">
                      {selectedScenario.data.recencyDays !== undefined ? `${selectedScenario.data.recencyDays} dias` : '—'}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-[#ffffff]">
                    <span className="text-[10px] text-[#061f16]/60 uppercase font-semibold block">Razão (Rec./Ritmo)</span>
                    <span className="font-bold text-[#1E6B2E] font-mono text-sm">
                      {selectedScenario.data.medianIntervalDays && selectedScenario.data.recencyDays !== undefined
                        ? `${(selectedScenario.data.recencyDays / selectedScenario.data.medianIntervalDays).toFixed(1)}x`
                        : '—'}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-[#ffffff]">
                    <span className="text-[10px] text-[#061f16]/60 uppercase font-semibold block">Frequência</span>
                    <span className="font-bold text-[#061f16] font-mono text-sm">
                      {selectedScenario.data.customer.orders.length} pedidos
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* If aggregate base or raw records */}
            {!selectedScenario.data.customer && (
              <div className="p-4 rounded-xl bg-[#f5f3ed]/40 border border-[#061f16]/8 space-y-2 text-xs">
                <div className="flex justify-between font-bold text-[#061f16]">
                  <span>Volume da Base: {selectedScenario.data.audienceSize} contatos</span>
                  <span className="text-[#1E6B2E]">Consentimento: {selectedScenario.data.consentStatus}</span>
                </div>
                {selectedScenario.data.rawRecords && (
                  <div className="space-y-1 bg-[#061f16]/5 p-2 rounded-lg font-mono text-[11px] text-[#061f16]/80 overflow-x-auto">
                    {selectedScenario.data.rawRecords.map((r, i) => (
                      <div key={i}>{r}</div>
                    ))}
                  </div>
                )}
                <div className="text-[11px] text-[#061f16]/70 leading-relaxed">
                  {Object.entries(selectedScenario.data.details).map(([k, v]) => (
                    <div key={k} className="flex justify-between py-0.5 border-b border-[#061f16]/5">
                      <span className="font-medium text-[#061f16]/60">{k}:</span>
                      <span className="font-semibold text-right">{String(v)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Expected Method Criteria & Critical Indicators (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* If practice mode and criteria should be hidden */}
          {shouldHideCriteria ? (
            <div className="bg-[#ffffff] rounded-[24px] p-6 border border-[#061f16]/10 shadow-xs space-y-4 text-center">
              <div className="w-12 h-12 rounded-full bg-[#f5f3ed] text-[#1E6B2E] flex items-center justify-center mx-auto shadow-xs">
                <EyeOff className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#1E6B2E] bg-[#e9efe2] px-2.5 py-0.5 rounded-full inline-block">
                  Prática às Cegas Ativa
                </span>
                <h3 className="font-bold text-sm text-[#061f16]">Critérios e Indicadores Ocultos</h3>
                <p className="text-xs text-[#061f16]/70 leading-relaxed max-w-sm mx-auto">
                  No modo <strong>Eu pratico</strong>, o gabarito e os indicadores críticos ficam ocultos para você exercitar sua análise com autonomia. Eles serão revelados automaticamente após a avaliação, ou você pode revelá-los agora para realizar um treino assistido.
                </p>
              </div>
              <button
                onClick={() => {
                  setRevealedCriteria(true);
                  showToast('Modo de treino assistido ativado.');
                }}
                className="px-5 py-2.5 rounded-full bg-[#f5f3ed] hover:bg-[#1E6B2E] hover:text-white text-[#061f16] text-xs font-bold uppercase tracking-wider transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5 mx-auto"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Revelar critérios (Treino assistido)</span>
              </button>
            </div>
          ) : (
            <>
              {/* Assisted practice banner notice */}
              {mode === 'practice' && revealedCriteria && !evaluation && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-xs flex items-center gap-2">
                  <Info className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>
                    <strong>Treino Assistido:</strong> Os critérios foram revelados antes da sua avaliação e esta sessão será registrada como assistida.
                  </span>
                </div>
              )}

              <div className="bg-[#f5f3ed] rounded-[24px] p-5 border border-[#14502a]/10 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Scale className="w-4 h-4 text-[#1E6B2E]" />
                    <h2 className="text-xs font-bold uppercase tracking-wider text-[#1E6B2E]">
                      Critérios Esperados da Metodologia
                    </h2>
                  </div>
                  {mode === 'practice' && (
                    <span className="text-[10px] font-bold text-[#1E6B2E] bg-white px-2 py-0.5 rounded-full">
                      Gabarito
                    </span>
                  )}
                </div>
                <ul className="space-y-2.5 text-xs text-[#061f16]/85">
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-[#1E6B2E] shrink-0">1.</span>
                    <span><strong className="text-[#061f16]">Interpretação:</strong> {selectedScenario.expectedCriteria.interpretation}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-[#1E6B2E] shrink-0">2.</span>
                    <span><strong className="text-[#061f16]">Aplicação CRM:</strong> {selectedScenario.expectedCriteria.crmApplication}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-[#1E6B2E] shrink-0">3.</span>
                    <span><strong className="text-[#061f16]">Governança:</strong> {selectedScenario.expectedCriteria.governance}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-[#1E6B2E] shrink-0">4.</span>
                    <span><strong className="text-[#061f16]">Clareza:</strong> {selectedScenario.expectedCriteria.clarity}</span>
                  </li>
                </ul>
              </div>

              <div className="bg-[#ffffff] rounded-[24px] p-5 border border-red-200/70 shadow-xs space-y-2.5">
                <div className="flex items-center gap-2 text-red-800">
                  <AlertOctagon className="w-4 h-4 shrink-0" />
                  <h2 className="text-xs font-bold uppercase tracking-wider">
                    Indicadores Críticos de Reprovação
                  </h2>
                </div>
                <p className="text-[11px] text-red-900/75 leading-relaxed">
                  Falhar nestes pontos acarreta reprovação sumária independente de outras notas:
                </p>
                <ul className="space-y-1.5 text-xs text-red-950 font-medium">
                  {selectedScenario.criticalIndicators.map((ind, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-red-500 font-bold shrink-0">✕</span>
                      <span>{ind}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Mode Switcher Capsules */}
      <section className="flex flex-col items-center gap-3">
        <div className="inline-flex p-1 rounded-full bg-[#ffffff] border border-[#061f16]/10 shadow-xs">
          <button
            onClick={() => setMode('gina')}
            className={`px-6 py-2 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              mode === 'gina'
                ? 'bg-[#1E6B2E] text-[#f5f3ed] shadow-xs'
                : 'text-[#061f16]/80 hover:text-[#1E6B2E]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Modo 1 · Gina responde</span>
          </button>
          <button
            onClick={() => setMode('practice')}
            className={`px-6 py-2 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              mode === 'practice'
                ? 'bg-[#1E6B2E] text-[#f5f3ed] shadow-xs'
                : 'text-[#061f16]/80 hover:text-[#1E6B2E]'
            }`}
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>Modo 2 · Eu pratico</span>
          </button>
        </div>
        <p className="text-[12px] text-[#061f16]/60 text-center">
          {mode === 'gina'
            ? 'Veja o raciocínio determinístico e a fala original da Gina para este cenário.'
            : 'Redija sua própria análise de CRM para ser avaliada pela rubrica pedagógica de 0 a 100.'}
        </p>
      </section>

      {/* MODE 1: GINA RESPONDE */}
      {mode === 'gina' && (
        <section className="bg-[#ffffff] rounded-[24px] p-6 md:p-8 shadow-xs border border-[#061f16]/8 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#061f16]/8 pb-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#1E6B2E]">Supervisão do Agente</span>
              <h2 className="text-lg md:text-xl font-bold text-[#061f16]">
                Análise Determinística da Gina
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={fetchGinaResponse}
                disabled={isGinaLoading}
                className="px-5 py-2.5 rounded-full bg-[#1E6B2E] hover:bg-[#14502a] disabled:opacity-50 text-[#f5f3ed] text-xs font-bold uppercase tracking-wider shadow-sm transition-all flex items-center gap-2 cursor-pointer active:scale-95"
              >
                {isGinaLoading ? (
                  <>
                    <RotateCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Consultando Gina...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-[#7FC453]" />
                    <span>{ginaResponse ? 'Reconsultar Gina' : 'Consultar Gina'}</span>
                  </>
                )}
              </button>

              {/* Benchmark alternative explicitly labeled */}
              <button
                onClick={useBenchmarkGina}
                disabled={isGinaLoading}
                className="px-3.5 py-2 rounded-full bg-[#f5f3ed] hover:bg-[#e9efe2] text-[#061f16] text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                title="Carregar gabarito manual referencial da metodologia"
              >
                <BookOpen className="w-3.5 h-3.5 text-[#1E6B2E]" />
                <span>Gabarito Manual</span>
              </button>
            </div>
          </div>

          {/* Error Message if API fails (Clear, unmasked, with active retry & manual option) */}
          {ginaError && !isGinaLoading && (
            <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 text-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in fade-in duration-200">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <strong className="font-bold text-amber-900 block text-sm">
                    Serviço temporariamente indisponível no backend
                  </strong>
                  <p className="text-amber-800 leading-relaxed font-mono text-[11px] bg-white/70 p-2 rounded-lg border border-amber-200 break-all">
                    {ginaError}
                  </p>
                  <p className="text-[11px] text-amber-900/80">
                    O erro não foi mascarado. Você pode tentar novamente com backoff automático ou carregar o gabarito manual referencial para continuar seus estudos.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                <button
                  onClick={fetchGinaResponse}
                  disabled={isGinaLoading}
                  className="px-4 py-2 rounded-full bg-amber-700 hover:bg-amber-800 text-white font-bold text-xs uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Tentar novamente</span>
                </button>
                <button
                  onClick={useBenchmarkGina}
                  className="px-4 py-2 rounded-full bg-white text-amber-950 border border-amber-300 font-semibold text-xs hover:bg-amber-100 transition-colors cursor-pointer"
                >
                  Carregar Gabarito Manual
                </button>
              </div>
            </div>
          )}

          {/* Empty state before triggering Gina */}
          {!ginaResponse && !isGinaLoading && !ginaError && (
            <div className="py-12 flex flex-col items-center justify-center text-center gap-4">
              <div className="w-24 h-24 rounded-full bg-[#f5f3ed] flex items-center justify-center">
                <GinaCharacter mood="listening" size="small" />
              </div>
              <div className="max-w-md space-y-1">
                <h3 className="font-bold text-base text-[#061f16]">Gina está aguardando seu comando</h3>
                <p className="text-xs text-[#061f16]/70 leading-relaxed">
                  Clique em “Consultar Gina” para ativar o agente de CRM. Ela calculará a mediana do ciclo, avaliará a recência e decidirá a conduta correta.
                </p>
              </div>
              <div className="flex items-center gap-3 mt-2">
                <button
                  onClick={fetchGinaResponse}
                  className="px-6 py-2.5 rounded-full bg-[#1E6B2E] text-[#f5f3ed] text-xs font-bold uppercase tracking-wider hover:bg-[#14502a] transition-all cursor-pointer shadow-sm"
                >
                  Consultar Gina agora
                </button>
                <button
                  onClick={useBenchmarkGina}
                  className="px-4 py-2.5 rounded-full bg-[#f5f3ed] text-[#061f16] text-xs font-semibold hover:bg-[#e9efe2] transition-all cursor-pointer"
                >
                  Ou usar Gabarito Manual
                </button>
              </div>
            </div>
          )}

          {/* Prominent Loading stage */}
          {isGinaLoading && (
            <div className="py-12 flex flex-col items-center justify-center text-center gap-4 animate-in fade-in duration-200">
              <div className="relative">
                <GinaCharacter mood="reading_rhythm" size="large" />
                <div className="absolute inset-0 rounded-full border-4 border-[#1E6B2E]/20 border-t-[#1E6B2E] animate-spin" />
              </div>
              <div className="space-y-1.5 max-w-sm">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#1E6B2E] bg-[#e9efe2] px-3 py-1 rounded-full">
                  Processando · Tentativa com backoff
                </span>
                <h3 className="text-base font-bold text-[#061f16]">Gina recomputando o ritmo do cliente...</h3>
                <p className="text-xs text-[#061f16]/60 leading-relaxed">
                  Calculando a mediana dos intervalos, recência de compra e aplicando validações estritas de governança.
                </p>
              </div>
            </div>
          )}

          {/* Gina's Output Display */}
          {ginaResponse && !isGinaLoading && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Manual Benchmark Notice if loaded manually */}
              {isManualGina && (
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-950 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-blue-700 shrink-0" />
                    <span>
                      <strong>Gabarito Manual Referencial:</strong> Esta análise é a resposta oficial da metodologia Gina Intell, carregada de forma explícita e manual.
                    </span>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800 bg-blue-100 px-2 py-0.5 rounded-full">
                    Gabarito Padrão
                  </span>
                </div>
              )}

              {/* Top row: Gina Character + Speech bubble */}
              <div className="flex flex-col md:flex-row items-center md:items-start gap-6 bg-[#f5f3ed]/60 p-6 rounded-[22px] border border-[#14502a]/10">
                <div className="shrink-0 flex flex-col items-center">
                  <GinaCharacter mood={ginaResponse.mood} size="large" />
                  <span className="mt-2 text-[11px] font-bold text-[#1E6B2E] uppercase tracking-wider">
                    Estado: {ginaResponse.mood}
                  </span>
                </div>
                <div className="flex-1 space-y-4">
                  <GinaSpeechBubble quote={ginaResponse.wittyRemark} />

                  {/* Diagnosis & Classification badges */}
                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    <span className="px-3 py-1 rounded-full bg-[#061f16] text-[#f5f3ed] font-bold font-mono">
                      Classificação: {ginaResponse.classification}
                    </span>
                    <span className="px-3 py-1 rounded-full bg-[#1E6B2E] text-[#f5f3ed] font-semibold">
                      Ação: {ginaResponse.recommendedAction}
                    </span>
                    {ginaResponse.hasCriticalViolation && (
                      <span className="px-3 py-1 rounded-full bg-red-600 text-white font-bold flex items-center gap-1">
                        <AlertOctagon className="w-3.5 h-3.5" />
                        Bloqueio de Governança
                      </span>
                    )}
                  </div>

                  {/* Rhythm Summary */}
                  <div className="text-xs text-[#061f16]/80 bg-white p-3 rounded-xl border border-[#061f16]/5">
                    <strong className="text-[#061f16]">Cálculo Factual: </strong>
                    {ginaResponse.rhythmSummary}
                  </div>
                </div>
              </div>

              {/* Decision and Copy breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-white border border-[#061f16]/10 space-y-1.5">
                  <span className="font-bold text-[#1E6B2E] uppercase tracking-wider text-[10px]">
                    Justificativa da Decisão
                  </span>
                  <p className="text-[#061f16]/85 leading-relaxed text-pretty">
                    {ginaResponse.decisionExplanation}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-white border border-[#061f16]/10 space-y-1.5">
                  <span className="font-bold text-[#1E6B2E] uppercase tracking-wider text-[10px]">
                    Mensagem Proposta (Copy) ou Justificativa de Silêncio
                  </span>
                  <p className="text-[#061f16] font-medium leading-relaxed bg-[#f5f3ed] p-3 rounded-lg border border-[#061f16]/5">
                    {ginaResponse.suggestedCopy}
                  </p>
                </div>
              </div>

              {/* Governance alert if any */}
              {ginaResponse.governanceAlert && (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>
                    <strong>Alerta de Governança: </strong>
                    {ginaResponse.governanceAlert}
                  </span>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => handleSaveSession('gina')}
                  className="px-5 py-2.5 rounded-full bg-[#061f16] hover:bg-[#14502a] text-[#f5f3ed] text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <BookmarkCheck className="w-3.5 h-3.5 text-[#7FC453]" />
                  <span>Salvar Análise no Histórico</span>
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* MODE 2: EU PRATICO */}
      {mode === 'practice' && (
        <section className="bg-[#ffffff] rounded-[24px] p-6 md:p-8 shadow-xs border border-[#061f16]/8 space-y-6">
          <div className="border-b border-[#061f16]/8 pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#1E6B2E]">Laboratório Supervisionado</span>
              <h2 className="text-lg md:text-xl font-bold text-[#061f16]">
                Sua Resposta e Análise de CRM
              </h2>
              <p className="text-xs text-[#061f16]/70 mt-1">
                Demonstre sua interpretação dos dados, aplique o cálculo determinístico de ritmo/recência, fundamente a decisão e respeite a governança.
              </p>
            </div>
            {revealedCriteria && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 bg-amber-100 px-3 py-1 rounded-full shrink-0">
                Treino Assistido (Critérios Revelados)
              </span>
            )}
          </div>

          {/* Submission Textarea */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <label htmlFor="user-submission" className="font-bold text-[#061f16]">
                Redija sua estratégia completa:
              </label>
              <span className="text-[11px] text-[#061f16]/60">
                {userText.trim().split(/\s+/).filter(Boolean).length} palavras
              </span>
            </div>
            <textarea
              id="user-submission"
              rows={6}
              value={userText}
              onChange={(e) => setUserText(e.target.value)}
              placeholder="Exemplo de estrutura:
1. Diagnóstico dos dados (cálculo de mediana, recência e estágio do cliente);
2. Decisão recomendada (enviar mensagem amigável, silêncio estratégico, contato humano ou descanso);
3. Redação da copy ou justificativa de silêncio;
4. Observações de governança (risco sobre margem, pedido de custos unitários, consentimento e LGPD)."
              className="w-full text-sm p-4 rounded-2xl bg-[#f5f3ed]/50 border border-[#061f16]/15 text-[#061f16] focus:outline-none focus:ring-2 focus:ring-[#1E6B2E] transition-all leading-relaxed"
            />
          </div>

          {/* Submit for evaluation button */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-[11px] text-[#061f16]/60 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-[#1E6B2E]" />
              A avaliação semântica por Gemini é uma estimativa e exige evidências textuais.
            </span>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {!revealedCriteria && !evaluation && (
                <button
                  onClick={() => {
                    setRevealedCriteria(true);
                    showToast('Critérios revelados. Sessão marcada como treino assistido.');
                  }}
                  className="px-4 py-2.5 rounded-full bg-[#f5f3ed] hover:bg-[#e9efe2] text-[#061f16] text-xs font-semibold transition-colors cursor-pointer"
                >
                  Revelar critérios
                </button>
              )}
              <button
                onClick={() => {
                  if (!userText.trim()) {
                    showToast('Por favor, redija sua resposta antes de abrir a avaliação manual.');
                    return;
                  }
                  setIsCalibrationMode(false);
                  setIsManualModalOpen(true);
                }}
                className="px-4 py-2.5 rounded-full bg-[#f5f3ed] hover:bg-[#e9efe2] text-[#061f16] text-xs font-semibold transition-colors cursor-pointer"
                title="Avaliar manualmente preenchendo a rubrica de 0 a 100 sem IA"
              >
                Avaliação Manual
              </button>
              <button
                onClick={evaluateUserPractice}
                disabled={isEvaluating || !userText.trim()}
                className="flex-1 sm:flex-none px-6 py-2.5 rounded-full bg-[#1E6B2E] hover:bg-[#14502a] disabled:opacity-50 text-[#f5f3ed] text-xs font-bold uppercase tracking-wider shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                {isEvaluating ? (
                  <>
                    <RotateCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Avaliando segundo a rubrica...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-[#7FC453]" />
                    <span>Avaliar minha resposta</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Error notice if evaluation fails */}
          {evalError && !isEvaluating && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <strong>Falha na avaliação:</strong>
                <p className="font-mono text-[11px]">{evalError}</p>
                <p className="text-[11px] text-amber-900/75">
                  O erro não foi mascarado. Você pode tentar novamente ou realizar a avaliação manual na rubrica.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={evaluateUserPractice}
                  className="px-4 py-1.5 rounded-full bg-amber-700 text-white font-bold hover:bg-amber-800 transition-colors"
                >
                  Tentar novamente
                </button>
                <button
                  onClick={() => {
                    setIsCalibrationMode(false);
                    setIsManualModalOpen(true);
                  }}
                  className="px-3.5 py-1.5 rounded-full bg-white text-amber-950 border border-amber-300 font-semibold text-xs hover:bg-amber-100 transition-colors cursor-pointer"
                >
                  Avaliar Manualmente
                </button>
              </div>
            </div>
          )}

          {/* EVALUATION RESULTS CARD */}
          {evaluation && (
            <div className="mt-6 pt-6 border-t border-[#061f16]/10 space-y-6 animate-in fade-in duration-300">
              {/* Disclaimer header */}
              <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                <span className="px-2.5 py-1 rounded-md bg-[#f5f3ed] font-bold text-[#1E6B2E] uppercase text-[10px] tracking-wider">
                  {evaluation.isAiEstimate ? 'Estimativa assistida por IA · Sujeita a validação humana' : 'Avaliação manual supervisionada'}
                </span>
                <span className="text-[11px] text-[#061f16]/60">
                  Pontuação somada estritamente no código (limite máximo de cada peso)
                </span>
              </div>

              {/* CRITICAL VIOLATION BANNER (If applicable) */}
              {evaluation.criticalViolation && (
                <div className="p-5 rounded-2xl bg-red-600 text-white shadow-lg space-y-2">
                  <div className="flex items-center gap-2">
                    <AlertOctagon className="w-6 h-6 shrink-0" />
                    <h3 className="font-['Bagel_Fat_One'] text-lg md:text-xl tracking-wide">
                      REPROVADO POR VIOLAÇÃO CRÍTICA DE GOVERNANÇA
                    </h3>
                  </div>
                  <p className="text-xs md:text-sm text-red-50 leading-relaxed">
                    {evaluation.criticalViolationReason ||
                      'Qualquer recomendação que viole consentimento, exponha dados de terceiros ou execute instrução maliciosa reprova o aluno sumariamente, independentemente da nota.'}
                  </p>
                </div>
              )}

              {/* Overall Scoreboard Card */}
              <div className="p-6 rounded-[22px] bg-[#061f16] text-[#f5f3ed] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <span className="text-[11px] uppercase font-bold tracking-wider text-[#7FC453]">Resultado da Rubrica (0 a 100)</span>
                  <div className="text-4xl font-bold font-mono tracking-tight mt-1">
                    {evaluation.totalScore} <span className="text-xl font-normal text-white/50">/ 100</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {evaluation.humanReviewModified && (
                      <span className="text-[11px] font-semibold text-[#7FC453] inline-block">
                        ★ Calibrado por Revisão Humana
                      </span>
                    )}
                    {revealedCriteria && (
                      <span className="text-[10px] font-semibold text-amber-300 bg-white/10 px-2 py-0.5 rounded-full">
                        Treino Assistido
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {evaluation.criticalViolation ? (
                    <span className="px-4 py-2 rounded-full bg-red-600 text-white text-xs font-bold uppercase tracking-wider shadow-sm">
                      Reprovado (Violação)
                    </span>
                  ) : evaluation.passed ? (
                    <span className="px-4 py-2 rounded-full bg-[#7FC453] text-[#061f16] text-xs font-bold uppercase tracking-wider shadow-sm">
                      Aprovado (≥ 70 pts)
                    </span>
                  ) : (
                    <span className="px-4 py-2 rounded-full bg-amber-500 text-[#061f16] text-xs font-bold uppercase tracking-wider shadow-sm">
                      Necessita Revisão (&lt; 70)
                    </span>
                  )}

                  {/* Button for Human Review */}
                  <button
                    onClick={() => {
                      setIsCalibrationMode(true);
                      setIsManualModalOpen(true);
                    }}
                    className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-[#f5f3ed] text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Revisão Humana
                  </button>
                </div>
              </div>

              {/* Rubric 4-Dimension Breakdown with Text Evidences */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Interpretação */}
                <div className="p-4 rounded-xl bg-[#f5f3ed]/60 border border-[#061f16]/10 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-[#061f16]">1. Interpretação do Cenário</span>
                    <span className="font-mono font-bold text-sm text-[#1E6B2E]">
                      {evaluation.interpretationScore} / 20
                    </span>
                  </div>
                  <div className="text-[11px] text-[#061f16]/75 bg-white p-2.5 rounded-lg border border-[#061f16]/5 leading-relaxed">
                    <strong className="text-[#061f16]">Evidência textual: </strong>
                    “{evaluation.evidence.interpretation}”
                  </div>
                </div>

                {/* 2. Aplicação CRM */}
                <div className="p-4 rounded-xl bg-[#f5f3ed]/60 border border-[#061f16]/10 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-[#061f16]">2. Aplicação de Regras CRM</span>
                    <span className="font-mono font-bold text-sm text-[#1E6B2E]">
                      {evaluation.crmApplicationScore} / 30
                    </span>
                  </div>
                  <div className="text-[11px] text-[#061f16]/75 bg-white p-2.5 rounded-lg border border-[#061f16]/5 leading-relaxed">
                    <strong className="text-[#061f16]">Evidência textual: </strong>
                    “{evaluation.evidence.crmApplication}”
                  </div>
                </div>

                {/* 3. Governança */}
                <div className="p-4 rounded-xl bg-[#f5f3ed]/60 border border-[#061f16]/10 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-[#061f16]">3. Governança & Margem / Consentimento</span>
                    <span className="font-mono font-bold text-sm text-[#1E6B2E]">
                      {evaluation.governanceScore} / 30
                    </span>
                  </div>
                  <div className="text-[11px] text-[#061f16]/75 bg-white p-2.5 rounded-lg border border-[#061f16]/5 leading-relaxed">
                    <strong className="text-[#061f16]">Evidência textual: </strong>
                    “{evaluation.evidence.governance}”
                  </div>
                </div>

                {/* 4. Clareza */}
                <div className="p-4 rounded-xl bg-[#f5f3ed]/60 border border-[#061f16]/10 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-[#061f16]">4. Clareza & Redação</span>
                    <span className="font-mono font-bold text-sm text-[#1E6B2E]">
                      {evaluation.clarityScore} / 20
                    </span>
                  </div>
                  <div className="text-[11px] text-[#061f16]/75 bg-white p-2.5 rounded-lg border border-[#061f16]/5 leading-relaxed">
                    <strong className="text-[#061f16]">Evidência textual: </strong>
                    “{evaluation.evidence.clarity}”
                  </div>
                </div>
              </div>

              {/* Overall feedback summary */}
              <div className="p-4 rounded-xl bg-white border border-[#061f16]/10 text-xs space-y-1">
                <span className="font-bold text-[#1E6B2E] uppercase text-[10px] tracking-wider">
                  Síntese Pedagógica do Treinador
                </span>
                <p className="text-[#061f16]/85 leading-relaxed">
                  {evaluation.overallFeedback}
                </p>
                {evaluation.humanJustification && (
                  <p className="text-[11px] text-[#1E6B2E] font-medium pt-1 border-t border-[#061f16]/5">
                    <strong>Justificativa humana:</strong> {evaluation.humanJustification}
                  </p>
                )}
              </div>

              {/* Post-attempt comparison: Gina's reference response vs Expected criteria */}
              <div className="p-5 rounded-2xl bg-[#f5f3ed] border border-[#14502a]/15 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#1E6B2E]">
                    Comparativo Pós-Tentativa: Resposta da Gina vs Critérios Esperados
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-3.5 rounded-xl bg-white border border-[#061f16]/8 space-y-1">
                    <strong className="text-[#1E6B2E]">Resposta Referencial da Gina:</strong>
                    <p className="italic text-[#061f16]/85">“{selectedScenario.defaultGinaResponse.wittyRemark}”</p>
                    <p className="text-[11px] text-[#061f16]/70 mt-1">{selectedScenario.defaultGinaResponse.decisionExplanation}</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-white border border-[#061f16]/8 space-y-1">
                    <strong className="text-[#061f16]">Critérios Determinísticos do Método:</strong>
                    <p className="text-[#061f16]/80 text-[11px] leading-relaxed">
                      {selectedScenario.expectedCriteria.crmApplication} {selectedScenario.expectedCriteria.governance}
                    </p>
                  </div>
                </div>
              </div>

              {/* Save Session CTA */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => handleSaveSession('practice')}
                  className="px-6 py-2.5 rounded-full bg-[#061f16] hover:bg-[#14502a] text-[#f5f3ed] text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-colors cursor-pointer shadow-sm"
                >
                  <BookmarkCheck className="w-3.5 h-3.5 text-[#7FC453]" />
                  <span>Salvar Treino no Histórico</span>
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Manual Evaluation / Human Calibration Modal */}
      {isManualModalOpen && (
        <ManualEvaluationModal
          userText={userText}
          initialEvaluation={isCalibrationMode ? evaluation : null}
          isCalibration={isCalibrationMode}
          onSave={(updated) => {
            setEvaluation(updated);
            setRevealedCriteria(true);
            setIsManualModalOpen(false);
            showToast(
              isCalibrationMode
                ? 'Calibragem humana atualizada!'
                : 'Avaliação manual registrada com sucesso!'
            );
          }}
          onClose={() => setIsManualModalOpen(false)}
        />
      )}
    </div>
  );
};
