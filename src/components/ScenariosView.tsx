import React, { useState } from 'react';
import { Scenario, TrainingSession } from '../types/crm';
import {
  ArrowRight,
  ShieldAlert,
  Award,
  Trophy,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  RotateCw,
  Clock,
  Filter,
} from 'lucide-react';
import { loadTrainingHistory } from '../utils/storage';

export type MasteryFilter = 'all' | 'mastered' | 'practiced' | 'explored' | 'unstarted';

interface ScenariosViewProps {
  scenarios: Scenario[];
  onSelectScenario: (scenario: Scenario) => void;
  savedSessions?: TrainingSession[];
}

export interface ScenarioProgress {
  status: 'mastered' | 'practiced' | 'explored' | 'unstarted';
  bestScore: number | null;
  attemptsCount: number;
  passedCount: number;
  hasCriticalViolation: boolean;
  lastTrainedDate?: string;
  badgeLabel: string;
}

export function computeScenarioProgress(
  scenarioId: string,
  sessions: TrainingSession[]
): ScenarioProgress {
  const scenSessions = sessions.filter((s) => s.scenarioId === scenarioId);

  if (scenSessions.length === 0) {
    return {
      status: 'unstarted',
      bestScore: null,
      attemptsCount: 0,
      passedCount: 0,
      hasCriticalViolation: false,
      badgeLabel: 'Pendente',
    };
  }

  // Filter practice evaluations
  const practiceSessions = scenSessions.filter((s) => Boolean(s.evaluation));

  if (practiceSessions.length > 0) {
    const passedSessions = practiceSessions.filter(
      (s) => s.evaluation?.passed && !s.evaluation?.criticalViolation
    );

    const scores = practiceSessions
      .map((s) => s.evaluation?.totalScore)
      .filter((score): score is number => typeof score === 'number');

    const bestScore = scores.length > 0 ? Math.max(...scores) : null;
    const lastSession = practiceSessions[0];
    const hasCriticalViolation = practiceSessions.some((s) => s.evaluation?.criticalViolation);

    if (passedSessions.length > 0) {
      const bestPassedScore = Math.max(
        ...passedSessions.map((s) => s.evaluation?.totalScore || 0)
      );

      const isExcellence = bestPassedScore >= 90;

      return {
        status: 'mastered',
        bestScore: bestPassedScore,
        attemptsCount: practiceSessions.length,
        passedCount: passedSessions.length,
        hasCriticalViolation,
        lastTrainedDate: lastSession.formattedDate,
        badgeLabel: isExcellence
          ? `🏆 Dominado com Excelência (${bestPassedScore}/100)`
          : `✅ Dominado (${bestPassedScore}/100)`,
      };
    }

    // Has practiced but hasn't achieved passing score or had critical violation
    return {
      status: 'practiced',
      bestScore,
      attemptsCount: practiceSessions.length,
      passedCount: 0,
      hasCriticalViolation,
      lastTrainedDate: lastSession.formattedDate,
      badgeLabel: hasCriticalViolation
        ? `⚠️ Violação Crítica (${bestScore ?? 0}/100)`
        : `⚠️ Em Revisão (${bestScore ?? 0}/100)`,
    };
  }

  // If user only explored mode 'gina'
  const lastSession = scenSessions[0];
  return {
    status: 'explored',
    bestScore: null,
    attemptsCount: 0,
    passedCount: 0,
    hasCriticalViolation: false,
    lastTrainedDate: lastSession?.formattedDate,
    badgeLabel: '✨ Explorado com Gina',
  };
}

export const ScenariosView: React.FC<ScenariosViewProps> = ({
  scenarios,
  onSelectScenario,
  savedSessions,
}) => {
  const [activeFilter, setActiveFilter] = useState<MasteryFilter>('all');

  // Use passed prop or load safely from storage
  const sessions = savedSessions && savedSessions.length > 0 ? savedSessions : loadTrainingHistory();

  // Pre-calculate progress for all scenarios
  const progressMap = new Map<string, ScenarioProgress>();
  let masteredCount = 0;
  let practicedCount = 0;
  let exploredCount = 0;
  let unstartedCount = 0;

  for (const scen of scenarios) {
    const prog = computeScenarioProgress(scen.id, sessions);
    progressMap.set(scen.id, prog);

    if (prog.status === 'mastered') masteredCount++;
    else if (prog.status === 'practiced') practicedCount++;
    else if (prog.status === 'explored') exploredCount++;
    else unstartedCount++;
  }

  const completionPercent = scenarios.length > 0 ? Math.round((masteredCount / scenarios.length) * 100) : 0;

  // Filter scenarios based on user selection
  const filteredScenarios = scenarios.filter((scen) => {
    if (activeFilter === 'all') return true;
    const prog = progressMap.get(scen.id);
    return prog?.status === activeFilter;
  });

  return (
    <div className="max-w-[1360px] mx-auto px-4 md:px-8 py-8 space-y-8 animate-in fade-in duration-300">
      {/* Intro & Progress Overview Section */}
      <div className="bg-[#ffffff] rounded-[24px] p-6 md:p-8 shadow-xs border border-[#061f16]/8 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-[#061f16]/6 pb-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-[#1E6B2E]" />
              <span className="text-xs font-bold uppercase tracking-wider text-[#1E6B2E]">
                Trilha Pedagógica Progressiva · Isaac Antunes
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-[#061f16] tracking-tight">
              {scenarios.length} Cenários de CRM Supervisionado
            </h1>
            <p className="text-sm text-[#061f16]/75 leading-relaxed text-pretty">
              Cada cenário foi construído para testar habilidades específicas: da identificação de briefings incompletos
              ao respeito pelo silêncio orgânico, proteção de margem comercial, tratamento humano para VIPs e defesa
              contra violações de consentimento e injeção de comandos.
            </p>
          </div>

          {/* Visual Progress Mastery Dashboard Card */}
          <div className="w-full lg:w-80 p-5 rounded-2xl bg-[#f5f3ed]/80 border border-[#061f16]/10 space-y-3 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-[#1E6B2E]" />
                <span className="text-xs font-bold text-[#061f16] uppercase tracking-wider">
                  Progresso na Trilha
                </span>
              </div>
              <span className="font-['Bagel_Fat_One'] text-lg text-[#1E6B2E]">
                {completionPercent}%
              </span>
            </div>

            {/* Sleek Progress Bar */}
            <div className="w-full h-2.5 bg-black/10 rounded-full overflow-hidden p-0.5">
              <div
                className="h-full bg-gradient-to-r from-[#7FC453] to-[#1E6B2E] rounded-full transition-all duration-500 ease-out"
                style={{ width: `${completionPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-[#061f16]/70 pt-1 font-medium">
              <span>
                <strong>{masteredCount}</strong> de {scenarios.length} dominados
              </span>
              <span>
                {scenarios.length - masteredCount} restante{scenarios.length - masteredCount !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Filter Capsule Pills */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#061f16]/60">
            <Filter className="w-3.5 h-3.5" />
            <span>Filtrar por status de domínio:</span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                activeFilter === 'all'
                  ? 'bg-[#061f16] text-[#f5f3ed] shadow-xs'
                  : 'bg-[#f5f3ed] text-[#061f16]/80 hover:bg-[#e9efe2]'
              }`}
            >
              Todos ({scenarios.length})
            </button>
            <button
              onClick={() => setActiveFilter('mastered')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeFilter === 'mastered'
                  ? 'bg-[#1E6B2E] text-[#f5f3ed] shadow-xs'
                  : 'bg-emerald-50 text-emerald-900 border border-emerald-200/60 hover:bg-emerald-100'
              }`}
            >
              <Trophy className="w-3 h-3 text-[#7FC453]" />
              <span>Dominados ({masteredCount})</span>
            </button>
            <button
              onClick={() => setActiveFilter('practiced')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeFilter === 'practiced'
                  ? 'bg-amber-800 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-900 border border-amber-200/60 hover:bg-amber-100'
              }`}
            >
              <AlertTriangle className="w-3 h-3 text-amber-600" />
              <span>Em Revisão ({practicedCount})</span>
            </button>
            <button
              onClick={() => setActiveFilter('explored')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeFilter === 'explored'
                  ? 'bg-sky-800 text-white shadow-xs'
                  : 'bg-sky-50 text-sky-900 border border-sky-200/60 hover:bg-sky-100'
              }`}
            >
              <Sparkles className="w-3 h-3 text-sky-600" />
              <span>Explorados ({exploredCount})</span>
            </button>
            <button
              onClick={() => setActiveFilter('unstarted')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                activeFilter === 'unstarted'
                  ? 'bg-slate-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Pendentes ({unstartedCount})
            </button>
          </div>
        </div>
      </div>

      {/* Scenarios Grid */}
      {filteredScenarios.length === 0 ? (
        <div className="bg-[#ffffff] rounded-[24px] p-12 text-center border border-[#061f16]/8 space-y-3">
          <div className="w-12 h-12 rounded-full bg-[#f5f3ed] text-[#1E6B2E] flex items-center justify-center mx-auto">
            <Filter className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-[#061f16]">Nenhum cenário neste filtro</h3>
          <p className="text-xs text-[#061f16]/60 max-w-sm mx-auto">
            Não há cenários correspondentes ao filtro de status selecionado. Alterne para “Todos” para visualizar a trilha completa.
          </p>
          <button
            onClick={() => setActiveFilter('all')}
            className="px-4 py-2 rounded-full bg-[#1E6B2E] text-white text-xs font-bold uppercase tracking-wider cursor-pointer shadow-xs hover:bg-[#14502a] transition-all"
          >
            Ver todos os cenários
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredScenarios.map((scen) => {
            const prog = progressMap.get(scen.id) || {
              status: 'unstarted',
              bestScore: null,
              attemptsCount: 0,
              passedCount: 0,
              hasCriticalViolation: false,
              badgeLabel: 'Pendente',
            };

            const isMastered = prog.status === 'mastered';
            const isPracticed = prog.status === 'practiced';
            const isExplored = prog.status === 'explored';

            return (
              <div
                key={scen.id}
                className={`card bg-[#ffffff] rounded-[24px] p-6 border flex flex-col justify-between gap-5 transition-all shadow-xs relative overflow-hidden ${
                  isMastered
                    ? 'border-emerald-600/30 ring-1 ring-emerald-500/15 bg-gradient-to-b from-emerald-50/20 to-white'
                    : isPracticed
                    ? 'border-amber-500/30 ring-1 ring-amber-500/10'
                    : 'border-[#061f16]/8 hover:border-[#1E6B2E]/30'
                }`}
              >
                {/* Visual Top Highlight Ribbon for Mastered Scenario */}
                {isMastered && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#7FC453] via-[#1E6B2E] to-[#7FC453]" />
                )}

                <div className="space-y-4">
                  {/* Top Header: Scenario Number, Difficulty & Progress Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-full bg-[#1E6B2E] text-[#f5f3ed] font-['Bagel_Fat_One'] text-sm flex items-center justify-center font-bold shrink-0">
                        {scen.number}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                          scen.difficulty === 'Governança'
                            ? 'bg-red-100 text-red-800'
                            : scen.difficulty === 'Avançado'
                            ? 'bg-amber-100 text-amber-900'
                            : 'bg-[#e9efe2] text-[#1E6B2E]'
                        }`}
                      >
                        {scen.difficulty}
                      </span>
                    </div>

                    {/* Prominent Visual Progress Badge */}
                    <div className="shrink-0">
                      {isMastered && (
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold shadow-xs border ${
                            (prog.bestScore ?? 0) >= 90
                              ? 'bg-emerald-100 text-emerald-950 border-emerald-300 ring-2 ring-emerald-400/20'
                              : 'bg-emerald-50 text-emerald-900 border-emerald-200'
                          }`}
                          title={`Dominado com aprovação na rubrica pedagógica. Nota: ${prog.bestScore}/100`}
                        >
                          <Trophy className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                          <span>{prog.badgeLabel}</span>
                        </span>
                      )}

                      {isPracticed && (
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-950 border border-amber-300 shadow-xs"
                          title="Praticado, mas necessita de nova tentativa para atingir nota de aprovação (70+)"
                        >
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>{prog.badgeLabel}</span>
                        </span>
                      )}

                      {isExplored && (
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-sky-50 text-sky-900 border border-sky-200 shadow-xs"
                          title="Você consultou a análise da Gina, mas ainda não submeteu sua própria prática"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                          <span>{prog.badgeLabel}</span>
                        </span>
                      )}

                      {prog.status === 'unstarted' && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                          <span>Não iniciado</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title & Domain */}
                  <div>
                    <span className="text-[11px] font-semibold text-[#061f16]/60 uppercase tracking-wider block">
                      {scen.domain}
                    </span>
                    <h3 className="text-lg font-bold text-[#061f16] tracking-tight mt-0.5 leading-snug">
                      {scen.title}
                    </h3>
                    <p className="text-xs text-[#1E6B2E] font-medium mt-1">
                      {scen.tagline}
                    </p>
                  </div>

                  {/* Briefing excerpt */}
                  <p className="text-xs text-[#061f16]/75 leading-relaxed bg-[#f5f3ed]/60 p-3 rounded-xl border border-[#061f16]/5 line-clamp-3">
                    “{scen.briefing}”
                  </p>

                  {/* Practice History Snapshot Meta (if user has interacted with this scenario) */}
                  {(isMastered || isPracticed) && (
                    <div className="p-2.5 rounded-xl bg-white border border-[#061f16]/8 flex items-center justify-between text-[11px] text-[#061f16]/70">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2
                          className={`w-3.5 h-3.5 ${
                            isMastered ? 'text-emerald-600' : 'text-amber-600'
                          }`}
                        />
                        <span>
                          <strong>{prog.attemptsCount}</strong> tentativa{prog.attemptsCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                      {prog.lastTrainedDate && (
                        <div className="flex items-center gap-1 text-[10px] text-[#061f16]/50">
                          <Clock className="w-3 h-3" />
                          <span>{prog.lastTrainedDate}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Critical indicator spotlight */}
                  <div className="pt-2 border-t border-[#061f16]/6 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-red-800 flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3 text-red-600" />
                      Alerta Crítico
                    </span>
                    <p className="text-[11px] text-red-950/80 leading-tight">
                      {scen.criticalIndicators[0]}
                    </p>
                  </div>
                </div>

                {/* Action button tailored to progress */}
                <button
                  onClick={() => onSelectScenario(scen)}
                  className={`w-full py-2.5 px-4 rounded-full text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer group shadow-xs ${
                    isMastered
                      ? 'bg-emerald-50 hover:bg-[#1E6B2E] text-emerald-900 hover:text-white border border-emerald-300'
                      : isPracticed
                      ? 'bg-amber-50 hover:bg-amber-700 text-amber-950 hover:text-white border border-amber-300'
                      : isExplored
                      ? 'bg-sky-50 hover:bg-sky-800 text-sky-950 hover:text-white border border-sky-300'
                      : 'bg-[#f5f3ed] hover:bg-[#1E6B2E] text-[#061f16] hover:text-[#f5f3ed]'
                  }`}
                >
                  {isMastered ? (
                    <>
                      <Trophy className="w-3.5 h-3.5 text-emerald-700 group-hover:text-white transition-colors" />
                      <span>Revisar ou Treinar Novamente</span>
                    </>
                  ) : isPracticed ? (
                    <>
                      <RotateCw className="w-3.5 h-3.5 text-amber-700 group-hover:text-white transition-colors" />
                      <span>Refazer Prática (Melhorar Nota)</span>
                    </>
                  ) : isExplored ? (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-sky-700 group-hover:text-white transition-colors" />
                      <span>Fazer Minha Prática Agora</span>
                    </>
                  ) : (
                    <>
                      <span>Treinar este cenário</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
