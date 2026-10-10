import React, { useState, useEffect } from 'react';
import {
  runDeterministicDomainTests,
  runContextEngineeringTests,
  runCompoundChallenge,
  computeSuiteSummary,
  loadLastRunResults,
  saveLastRunResults,
  applyHumanReviewToChallenge,
  getGeminiCallsCount,
  getIsRunnerCircuitBreakerTripped,
  MAX_GEMINI_CALLS_BUDGET,
  SUITE_VERSION,
} from '../utils/challengeRunner';
import { COMPOUND_CHALLENGES } from '../data/challengesFixtures';
import { ChallengeResult, ChallengeCategory, SuiteSummary } from '../types/challenges';
import { GinaCharacter } from './GinaCharacter';
import {
  Play,
  RotateCcw,
  Download,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  AlertOctagon,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Filter,
  Layers,
  Terminal,
  Brain,
  Info,
  ShieldCheck,
  UserCheck,
  Lock,
  ZapOff,
} from 'lucide-react';

export const ChallengesView: React.FC = () => {
  // Initialize with real persisted run evidence
  const [results, setResults] = useState<ChallengeResult[]>(() => loadLastRunResults());
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [runningTestId, setRunningTestId] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<
    'all' | 'deterministic' | 'context' | 'gemini' | 'pending_human' | 'issues'
  >('all');
  const [expandedCardIds, setExpandedCardIds] = useState<Set<string>>(
    new Set(['desafio-1-vip-consentimento-revogado'])
  );

  // Human Review Calibration State
  const [reviewingChallengeId, setReviewingChallengeId] = useState<string | null>(null);
  const [reviewComment, setReviewComment] = useState<string>('');

  const geminiCount = getGeminiCallsCount();
  const circuitBreakerTripped = getIsRunnerCircuitBreakerTripped();
  const summary: SuiteSummary = computeSuiteSummary(results);

  // Sync results to storage whenever updated
  useEffect(() => {
    if (results.length > 0) {
      saveLastRunResults(results);
    }
  }, [results]);

  const toggleExpand = (id: string) => {
    setExpandedCardIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Run local deterministic and context engineering tests (0 API calls, logical isolation)
  const handleRunLocalTests = () => {
    setIsRunning(true);
    try {
      const detResults = runDeterministicDomainTests();
      const ctxResults = runContextEngineeringTests();
      const combined = [...detResults, ...ctxResults];

      setResults((prev) => {
        const existingAi = prev.filter((r) => r.category === 'gemini_solver');
        return [...combined, ...existingAi];
      });
    } finally {
      setIsRunning(false);
    }
  };

  // Submit human semantic review calibration
  const handleSubmitHumanReview = (approved: boolean) => {
    if (!reviewingChallengeId) return;
    const updated = applyHumanReviewToChallenge(
      results,
      reviewingChallengeId,
      approved,
      reviewComment || (approved ? 'Aprovado pelo operador humano.' : 'Reprovado pelo operador humano.')
    );
    setResults(updated);
    setReviewingChallengeId(null);
    setReviewComment('');
  };

  const handleExportJson = () => {
    // Redact any sensitive internal keys before exporting
    const cleanResults = results.map((r) => {
      const cleanObserved = JSON.parse(
        JSON.stringify(r.observedOutput || {}).replace(/AIza[0-9A-Za-z-_]+/g, '[REDACTED_API_KEY]')
      );
      return { ...r, observedOutput: cleanObserved };
    });

    const blob = new Blob(
      [
        JSON.stringify(
          {
            metadata: {
              suiteVersion: SUITE_VERSION,
              isolationMode: 'logical_test_isolation',
              exportedAt: new Date().toISOString(),
              summary,
            },
            results: cleanResults,
          },
          null,
          2
        ),
      ],
      { type: 'application/json' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gina-eval-suite-evidencia-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const filteredResults = results.filter((r) => {
    if (selectedFilter === 'deterministic') return r.category === 'deterministic';
    if (selectedFilter === 'context') return r.category === 'additional_robustness';
    if (selectedFilter === 'gemini') return r.category === 'gemini_solver';
    if (selectedFilter === 'pending_human') return r.status === 'revisao_humana_pendente';
    if (selectedFilter === 'issues') return r.status === 'falhou' || r.status === 'bloqueado';
    return true;
  });

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Top Banner / Mission Header */}
      <section className="bg-[#1E6B2E] text-[#f5f3ed] rounded-3xl p-6 md:p-8 shadow-sm relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#7FC453]">
              <span className="flex items-center gap-1">
                <Terminal className="w-4 h-4" />
                Suíte de Avaliação da Gina
              </span>
              <span className="bg-[#14502a] text-[#f5f3ed] px-2 py-0.5 rounded-full text-[10px]">
                {SUITE_VERSION}
              </span>
              <span className="bg-[#9fdc6e] text-[#061f16] px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1">
                <Lock className="w-3 h-3" />
                Isolamento Lógico de Testes
              </span>
            </div>

            <h1 className="font-['Bagel_Fat_One'] text-3xl md:text-4xl text-[#f5f3ed] tracking-tight">
              Desafios & Evidências de Execução
            </h1>

            <p className="text-xs md:text-sm text-[#f5f3ed]/85 leading-relaxed">
              Ambiente de validação com <strong>isolamento lógico explícito</strong>: cada caso recebe contexto novo,
              sem histórico ou runs anteriores, com dados sintéticos e storage em memória segregado.
              Sem ferramentas de disparo real, filesystem ou rede arbitrária (não alega sandbox de SO).
              Resultados reais da rodada preservados como evidência auditável.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto shrink-0">
            <button
              onClick={handleRunLocalTests}
              disabled={isRunning}
              className="px-4 py-2.5 rounded-full bg-[#f5f3ed] text-[#061f16] hover:bg-white text-xs font-bold uppercase tracking-wider shadow-sm flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 text-[#1E6B2E]" />
              <span>Executar Testes Locais ({results.filter(r => r.category !== 'gemini_solver').length || 31})</span>
            </button>
            <button
              onClick={handleExportJson}
              className="px-4 py-2.5 rounded-full bg-[#7FC453] text-[#061f16] hover:bg-[#9fdc6e] text-xs font-bold uppercase tracking-wider shadow-sm flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#14502a]" />
              <span>Exportar Evidência JSON</span>
            </button>
          </div>
        </div>

        {/* Budget Pill & Circuit Breaker Indicators */}
        <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-bold bg-[#14502a] px-2.5 py-1 rounded-full text-white flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              Teto de IA: {geminiCount} / {MAX_GEMINI_CALLS_BUDGET} chamadas consumidas nesta sessão (Novas chamadas bloqueadas)
            </span>

            {circuitBreakerTripped && (
              <span className="font-bold bg-amber-900/60 border border-amber-400/40 px-2.5 py-1 rounded-full text-amber-200 flex items-center gap-1">
                <ZapOff className="w-3 h-3 text-amber-400" />
                Circuit Breaker Ativado no Servidor (Proteção de Cota)
              </span>
            )}
          </div>

          <span className="text-xs text-[#f5f3ed]/60">
            Segurança como rigor metodológico: resolver com base em fatos ou pedir dados, nunca fabricar.
          </span>
        </div>
      </section>

      {/* Logical Isolation Notice Banner */}
      <section className="bg-[#ffffff] border border-[#1E6B2E]/20 rounded-2xl p-3.5 flex items-start gap-3 shadow-xs">
        <ShieldCheck className="w-5 h-5 text-[#1E6B2E] shrink-0 mt-0.5" />
        <div className="space-y-0.5 text-xs">
          <span className="font-bold text-[#061f16]">
            Garantia de Isolamento Lógico de Testes:
          </span>
          <p className="text-[#061f16]/75">
            Cada teste roda em namespace próprio (<code className="bg-[#f5f3ed] px-1 py-0.2 rounded font-mono text-[11px]">gina_test_isolation_*</code>)
            com adapter in-memory separado do histórico de produção. Gabaritos e critérios esperados são purgados
            do payload do solver antes do envio.
          </p>
        </div>
      </section>

      {/* Stats Summary Bar */}
      <section className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-[#ffffff] border border-[#061f16]/10 p-3.5 rounded-2xl flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-[#061f16]/60 uppercase tracking-wider">
            Total Registrado
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="font-['Bagel_Fat_One'] text-2xl text-[#061f16]">{summary.total}</span>
            <span className="text-[11px] text-[#061f16]/50">testes</span>
          </div>
        </div>

        <div className="bg-[#ffffff] border border-emerald-500/20 p-3.5 rounded-2xl flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Aprovados
          </span>
          <span className="font-['Bagel_Fat_One'] text-2xl text-emerald-600 mt-1">
            {summary.passed}
          </span>
        </div>

        <div className="bg-[#ffffff] border border-purple-500/20 p-3.5 rounded-2xl flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-purple-800 uppercase tracking-wider flex items-center gap-1">
            <UserCheck className="w-3.5 h-3.5 text-purple-600" />
            Revisão Pendente
          </span>
          <span className="font-['Bagel_Fat_One'] text-2xl text-purple-600 mt-1">
            {summary.humanReviewPending}
          </span>
        </div>

        <div className="bg-[#ffffff] border border-amber-500/20 p-3.5 rounded-2xl flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider flex items-center gap-1">
            <AlertOctagon className="w-3.5 h-3.5 text-amber-600" />
            Bloqueados (IA)
          </span>
          <span className="font-['Bagel_Fat_One'] text-2xl text-amber-600 mt-1">
            {summary.blocked}
          </span>
        </div>

        <div className="bg-[#ffffff] border border-rose-500/20 p-3.5 rounded-2xl flex flex-col justify-between">
          <span className="text-[11px] font-semibold text-rose-800 uppercase tracking-wider flex items-center gap-1">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            Falhas
          </span>
          <span className="font-['Bagel_Fat_One'] text-2xl text-rose-600 mt-1">
            {summary.failed}
          </span>
        </div>
      </section>

      {/* Filter Tabs Bar */}
      <section className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#ffffff] p-2.5 rounded-2xl border border-[#061f16]/10">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setSelectedFilter('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all ${
              selectedFilter === 'all'
                ? 'bg-[#1E6B2E] text-white'
                : 'text-[#061f16]/70 hover:bg-[#061f16]/5'
            }`}
          >
            Todos ({results.length})
          </button>
          <button
            onClick={() => setSelectedFilter('deterministic')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all ${
              selectedFilter === 'deterministic'
                ? 'bg-[#1E6B2E] text-white'
                : 'text-[#061f16]/70 hover:bg-[#061f16]/5'
            }`}
          >
            Determinísticos CRM ({results.filter((r) => r.category === 'deterministic').length})
          </button>
          <button
            onClick={() => setSelectedFilter('context')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all ${
              selectedFilter === 'context'
                ? 'bg-[#1E6B2E] text-white'
                : 'text-[#061f16]/70 hover:bg-[#061f16]/5'
            }`}
          >
            Engenharia de Contexto ({results.filter((r) => r.category === 'additional_robustness').length})
          </button>
          <button
            onClick={() => setSelectedFilter('gemini')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all ${
              selectedFilter === 'gemini'
                ? 'bg-[#1E6B2E] text-white'
                : 'text-[#061f16]/70 hover:bg-[#061f16]/5'
            }`}
          >
            Desafios com IA ({results.filter((r) => r.category === 'gemini_solver').length})
          </button>
          {summary.humanReviewPending > 0 && (
            <button
              onClick={() => setSelectedFilter('pending_human')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all flex items-center gap-1 ${
                selectedFilter === 'pending_human'
                  ? 'bg-purple-700 text-white'
                  : 'text-purple-700 hover:bg-purple-50'
              }`}
            >
              <span>Revisão Humana ({summary.humanReviewPending})</span>
            </button>
          )}
          {(summary.failed > 0 || summary.blocked > 0) && (
            <button
              onClick={() => setSelectedFilter('issues')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-all flex items-center gap-1 ${
                selectedFilter === 'issues'
                  ? 'bg-rose-700 text-white'
                  : 'text-rose-700 hover:bg-rose-50'
              }`}
            >
              <span>Atenção ({summary.failed + summary.blocked})</span>
            </button>
          )}
        </div>
      </section>

      {/* Human Review Modal / Drawer if user clicked calibrate */}
      {reviewingChallengeId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#f5f3ed] rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-[#061f16]/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-[#1E6B2E]" />
                <h3 className="font-bold text-base text-[#061f16]">
                  Calibração Semântica Humana
                </h3>
              </div>
              <button
                onClick={() => setReviewingChallengeId(null)}
                className="text-xs font-bold text-[#061f16]/50 hover:text-[#061f16] cursor-pointer"
              >
                ✕ Cancelar
              </button>
            </div>

            <p className="text-xs text-[#061f16]/75">
              O modelo atendeu às validações determinísticas de ação e regras, mas a qualidade do tom,
              espirituosidade e segurança da copy exigem chancela humana explícita.
            </p>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-[#061f16] uppercase">
                Justificativa da Avaliação Humana (Obrigatória)
              </label>
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Ex: Resposta direta, respeitou estritamente a LGPD e manteve tom inconfundível da Gina."
                className="w-full h-24 p-3 rounded-xl bg-white border border-[#061f16]/20 text-xs text-[#061f16] focus:outline-none focus:ring-2 focus:ring-[#1E6B2E]"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => handleSubmitHumanReview(false)}
                className="px-4 py-2 rounded-full bg-rose-100 hover:bg-rose-200 text-rose-800 text-xs font-bold transition-colors cursor-pointer"
              >
                Reprovar Tom/Copy
              </button>
              <button
                onClick={() => handleSubmitHumanReview(true)}
                className="px-5 py-2 rounded-full bg-[#1E6B2E] hover:bg-[#14502a] text-[#f5f3ed] text-xs font-bold transition-colors cursor-pointer"
              >
                Aprovar Definitivamente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results List */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-[#061f16] text-base flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#1E6B2E]" />
            Evidências Detalhadas da Execução ({filteredResults.length})
          </h2>
          <span className="text-xs text-[#061f16]/50">
            Clique no card para inspecionar verificações e saída observada
          </span>
        </div>

        <div className="space-y-2.5">
          {filteredResults.map((result) => {
            const isExpanded = expandedCardIds.has(result.id);
            const isAi = result.category === 'gemini_solver';
            const isCtx = result.category === 'additional_robustness';

            return (
              <div
                key={result.id}
                className="bg-[#ffffff] rounded-2xl border border-[#061f16]/10 overflow-hidden shadow-2xs transition-all"
              >
                {/* Card Header Row */}
                <div
                  onClick={() => toggleExpand(result.id)}
                  className="p-3.5 sm:p-4 flex items-center justify-between gap-3 cursor-pointer hover:bg-[#f5f3ed]/40 select-none"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Status Icon */}
                    {result.status === 'aprovado' && (
                      <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    )}
                    {result.status === 'revisao_humana_pendente' && (
                      <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                        <UserCheck className="w-4 h-4" />
                      </div>
                    )}
                    {result.status === 'falhou' && (
                      <div className="w-7 h-7 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                        <XCircle className="w-4 h-4" />
                      </div>
                    )}
                    {result.status === 'bloqueado' && (
                      <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                        <AlertOctagon className="w-4 h-4" />
                      </div>
                    )}

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.2 rounded-full uppercase ${
                            isAi
                              ? 'bg-purple-100 text-purple-800'
                              : isCtx
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {isAi ? 'IA Gemini' : isCtx ? 'Contexto & Robustez' : 'Determinístico'}
                        </span>

                        <span className="text-[11px] font-mono text-[#061f16]/40">
                          {result.id}
                        </span>

                        {result.errorCategory && result.errorCategory !== 'none' && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-800 font-mono">
                            {result.errorCategory}
                          </span>
                        )}
                      </div>

                      <h4 className="font-bold text-xs sm:text-sm text-[#061f16] truncate">
                        {result.title}
                      </h4>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[11px] text-[#061f16]/50 hidden sm:inline">
                      {result.durationMs}ms
                    </span>

                    <span
                      className={`text-xs font-bold px-2.5 py-0.5 rounded-full uppercase ${
                        result.status === 'aprovado'
                          ? 'bg-emerald-100 text-emerald-800'
                          : result.status === 'revisao_humana_pendente'
                          ? 'bg-purple-100 text-purple-800'
                          : result.status === 'falhou'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {result.status === 'revisao_humana_pendente'
                        ? 'Revisão Pendente'
                        : result.status}
                    </span>

                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-[#061f16]/50" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-[#061f16]/50" />
                    )}
                  </div>
                </div>

                {/* Expanded Inspector Panel */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 border-t border-[#061f16]/5 bg-[#fdfdfc] space-y-3.5 text-xs">
                    {/* Blocked or Error Explanation */}
                    {result.blockedReason && (
                      <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-start gap-2">
                        <AlertOctagon className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                        <div>
                          <span className="font-bold block">Motivo do Bloqueio / Falha:</span>
                          <span>{result.blockedReason}</span>
                        </div>
                      </div>
                    )}

                    {/* Pending Human Review Action Banner */}
                    {result.status === 'revisao_humana_pendente' && (
                      <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="space-y-0.5">
                          <span className="font-bold block flex items-center gap-1.5">
                            <UserCheck className="w-4 h-4 text-purple-700" />
                            Ação do enum validada, mas aprovação final aguarda revisão humana
                          </span>
                          <span className="text-[11px] text-purple-800/80">
                            Apenas passar o enum não confere aprovação. Inspecione a fala da Gina e valide o tom.
                          </span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setReviewingChallengeId(result.id);
                          }}
                          className="px-3.5 py-1.5 rounded-full bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shrink-0 cursor-pointer shadow-xs"
                        >
                          Calibrar Resposta
                        </button>
                      </div>
                    )}

                    {result.humanReviewComment && (
                      <div className="p-2.5 rounded-xl bg-[#eef6e6] border border-[#1E6B2E]/20 text-[#061f16]">
                        <span className="font-bold text-[10px] text-[#1E6B2E] uppercase block">
                          Chancela Humana Registrada
                        </span>
                        <span>{result.humanReviewComment}</span>
                      </div>
                    )}

                    {/* Independent Checks List */}
                    {result.independentChecks.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="font-bold text-[#061f16] block uppercase tracking-wider text-[10px]">
                          Verificações Independentes ({result.independentChecks.length})
                        </span>
                        <div className="space-y-1 bg-white p-2.5 rounded-xl border border-[#061f16]/10">
                          {result.independentChecks.map((chk) => (
                            <div
                              key={chk.id}
                              className="flex items-start justify-between gap-2 py-1 border-b border-[#061f16]/5 last:border-none"
                            >
                              <div className="flex items-start gap-1.5">
                                {chk.passed ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                                ) : (
                                  <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />
                                )}
                                <div>
                                  <span className="text-[#061f16] font-medium">{chk.label}</span>
                                  {chk.notes && (
                                    <span className="text-[10px] text-[#061f16]/50 block">
                                      {chk.notes}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                {chk.requiresHumanReview ? (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                                    Revisão humana necessária
                                  </span>
                                ) : (
                                  <span
                                    className={`text-[11px] font-mono ${
                                      chk.passed ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold'
                                    }`}
                                  >
                                    {String(chk.actual)}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Fixture vs Expected vs Observed Output */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <span className="font-bold text-[#061f16]/70 uppercase tracking-wider text-[10px] block">
                          Entrada / Fixture
                        </span>
                        <pre className="p-2.5 rounded-xl bg-white border border-[#061f16]/10 text-[11px] font-mono text-[#061f16]/80 overflow-x-auto max-h-[160px]">
                          {JSON.stringify(result.inputFixture, null, 2)}
                        </pre>
                      </div>

                      <div className="space-y-1">
                        <span className="font-bold text-[#061f16]/70 uppercase tracking-wider text-[10px] block">
                          Saída Observada do Sistema
                        </span>
                        <pre className="p-2.5 rounded-xl bg-white border border-[#061f16]/10 text-[11px] font-mono text-[#061f16]/80 overflow-x-auto max-h-[160px]">
                          {JSON.stringify(result.observedOutput, null, 2)}
                        </pre>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[#061f16]/5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#061f16]/50">
                      <span>Critério Esperado: {result.expectedOutcome}</span>
                      {result.isolatedContextNamespace && (
                        <span>Namespace Isolado: <code className="font-mono text-[#1E6B2E]">{result.isolatedContextNamespace}</code></span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
