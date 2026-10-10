import React, { useState } from 'react';
import { TrainingSession } from '../types/crm';
import { exportHistoryAsJson, clearTrainingHistory } from '../utils/storage';
import {
  Download,
  Trash2,
  BookmarkCheck,
  CheckCircle2,
  AlertOctagon,
  ChevronRight,
  ShieldCheck,
  Info,
  Calendar,
  Sparkles,
  PenTool,
  X,
} from 'lucide-react';

interface HistoryViewProps {
  sessions: TrainingSession[];
  onRefresh: () => void;
  onGoToTrain: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  sessions,
  onRefresh,
  onGoToTrain,
}) => {
  const [selectedSession, setSelectedSession] = useState<TrainingSession | null>(null);

  const handleClear = () => {
    if (window.confirm('Tem certeza de que deseja apagar todo o histórico de treinos salvos neste navegador?')) {
      clearTrainingHistory();
      onRefresh();
      setSelectedSession(null);
    }
  };

  return (
    <div className="max-w-[1360px] mx-auto px-4 md:px-8 py-8 space-y-8 animate-in fade-in duration-300">
      {/* Notice header */}
      <div className="bg-[#ffffff] rounded-[24px] p-6 shadow-xs border border-[#061f16]/8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BookmarkCheck className="w-5 h-5 text-[#1E6B2E]" />
            <h1 className="text-xl md:text-2xl font-bold text-[#061f16] tracking-tight">
              Histórico de Treinos
            </h1>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="inline-flex items-center gap-1.5 text-xs text-[#1E6B2E] font-semibold bg-[#e9efe2] px-2.5 py-0.5 rounded-full">
              <Info className="w-3 h-3" />
              Salvo neste navegador (armazenamento local)
            </span>
            <span className="text-xs text-[#061f16]/60">
              · {sessions.length} {sessions.length === 1 ? 'registro' : 'registros'}
            </span>
          </div>
        </div>

        {sessions.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => exportHistoryAsJson(sessions)}
              className="px-4 py-2 rounded-full bg-[#1E6B2E] hover:bg-[#14502a] text-[#f5f3ed] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar JSON</span>
            </button>
            <button
              onClick={handleClear}
              className="px-4 py-2 rounded-full bg-red-50 hover:bg-red-100 text-red-800 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-600" />
              <span>Limpar</span>
            </button>
          </div>
        )}
      </div>

      {/* TRUE EMPTY STATE (No fake metrics!) */}
      {sessions.length === 0 && (
        <div className="bg-[#ffffff] rounded-[24px] p-12 text-center border border-[#061f16]/8 space-y-4 max-w-lg mx-auto shadow-xs">
          <div className="w-16 h-16 rounded-full bg-[#f5f3ed] text-[#1E6B2E] flex items-center justify-center mx-auto">
            <BookmarkCheck className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-[#061f16]">Nenhum treino salvo ainda</h2>
            <p className="text-xs text-[#061f16]/70 leading-relaxed text-pretty">
              Conclua uma análise no modo “Gina responde” ou redija uma submissão no modo “Eu pratico” e salve o resultado para construir seu registro de aprendizagem.
            </p>
          </div>
          <button
            onClick={onGoToTrain}
            className="px-6 py-2.5 rounded-full bg-[#1E6B2E] hover:bg-[#14502a] text-[#f5f3ed] text-xs font-bold uppercase tracking-wider transition-all shadow-sm cursor-pointer"
          >
            Começar primeiro treino
          </button>
        </div>
      )}

      {/* SESSIONS LIST */}
      {sessions.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 space-y-3">
            {sessions.map((s) => {
              const isSelected = selectedSession?.id === s.id;
              return (
                <div
                  key={s.id}
                  onClick={() => setSelectedSession(s)}
                  className={`p-5 rounded-[20px] bg-[#ffffff] border transition-all cursor-pointer shadow-xs hover:shadow-md ${
                    isSelected ? 'border-[#1E6B2E] ring-2 ring-[#1E6B2E]/20' : 'border-[#061f16]/8 hover:border-[#1E6B2E]/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#f5f3ed] text-[#1E6B2E]">
                          Cenário #{s.scenarioNumber}
                        </span>
                        <span className="text-[10px] font-mono text-[#061f16]/50">
                          ID: {s.id.slice(0, 8)}...
                        </span>
                        <span className="text-slate-300">·</span>
                        <span className="text-[11px] text-[#061f16]/60 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {s.formattedDate}
                        </span>
                        {s.isAssisted && (
                          <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                            Assistido
                          </span>
                        )}
                        {s.isManualBenchmark && (
                          <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-900">
                            Gabarito
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-sm text-[#061f16]">{s.scenarioTitle}</h3>
                    </div>

                    {/* Mode tag & Score indicator */}
                    <div className="text-right shrink-0">
                      {s.mode === 'gina' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#1E6B2E] bg-[#1E6B2E]/10 px-2.5 py-1 rounded-full">
                          <Sparkles className="w-3 h-3" />
                          Gina responde
                        </span>
                      ) : s.evaluation?.criticalViolation ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-100 px-2.5 py-1 rounded-full">
                          <AlertOctagon className="w-3 h-3" />
                          Reprovado
                        </span>
                      ) : (
                        <div className="flex flex-col items-end">
                          <span className="font-mono font-bold text-sm text-[#1E6B2E]">
                            {s.evaluation?.totalScore} / 100
                          </span>
                          <span className={`text-[10px] font-bold uppercase ${s.evaluation?.passed ? 'text-[#1E6B2E]' : 'text-amber-700'}`}>
                            {s.evaluation?.passed ? 'Aprovado' : 'Insuficiente'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Summary preview */}
                  <p className="text-xs text-[#061f16]/70 mt-2.5 line-clamp-2">
                    {s.mode === 'gina'
                      ? `“${s.ginaResponse?.wittyRemark}”`
                      : s.userSubmission}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Details Drawer / Panel (5 cols) */}
          <div className="lg:col-span-5 sticky top-20">
            {selectedSession ? (
              <div className="bg-[#ffffff] rounded-[24px] p-6 border border-[#061f16]/8 shadow-sm space-y-5 animate-in fade-in duration-200">
                <div className="flex items-center justify-between border-b border-[#061f16]/8 pb-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#1E6B2E]">Detalhes do Registro</span>
                    <h3 className="font-bold text-base text-[#061f16]">
                      Cenário #{selectedSession.scenarioNumber} · {selectedSession.scenarioTitle}
                    </h3>
                  </div>
                  <button
                    onClick={() => setSelectedSession(null)}
                    className="p-1 rounded-full hover:bg-[#061f16]/5 text-[#061f16]/60 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="text-xs text-[#061f16]/70 space-y-1 font-mono">
                  <div><strong>UUID:</strong> {selectedSession.id}</div>
                  <div><strong>Data:</strong> {selectedSession.formattedDate}</div>
                  <div><strong>Modo:</strong> {selectedSession.mode === 'gina' ? 'Análise da Gina' : 'Prática do Aluno'}</div>
                </div>

                {/* If Gina Mode */}
                {selectedSession.mode === 'gina' && selectedSession.ginaResponse && (
                  <div className="space-y-3 text-xs">
                    <div className="p-3.5 rounded-xl bg-[#f5f3ed] border border-[#14502a]/10">
                      <strong className="text-[#1E6B2E] block text-[10px] uppercase font-bold tracking-wider mb-1">Fala da Gina</strong>
                      <p className="font-semibold text-sm text-[#061f16]">“{selectedSession.ginaResponse.wittyRemark}”</p>
                    </div>

                    <div className="space-y-1.5 bg-white p-3 rounded-xl border border-[#061f16]/6">
                      <div><strong>Classificação:</strong> {selectedSession.ginaResponse.classification}</div>
                      <div><strong>Ação:</strong> {selectedSession.ginaResponse.recommendedAction}</div>
                      <div><strong>Cálculo:</strong> {selectedSession.ginaResponse.rhythmSummary}</div>
                      <div><strong>Decisão:</strong> {selectedSession.ginaResponse.decisionExplanation}</div>
                      <div><strong>Copy:</strong> {selectedSession.ginaResponse.suggestedCopy}</div>
                    </div>
                  </div>
                )}

                {/* If Practice Mode */}
                {selectedSession.mode === 'practice' && selectedSession.evaluation && (
                  <div className="space-y-4 text-xs">
                    <div className="p-3.5 rounded-xl bg-[#061f16] text-[#f5f3ed] flex justify-between items-center">
                      <div>
                        <span className="text-[10px] uppercase text-[#7FC453] font-bold">Nota Total</span>
                        <div className="text-2xl font-bold font-mono">
                          {selectedSession.evaluation.totalScore} / 100
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full font-bold text-xs uppercase ${
                        selectedSession.evaluation.criticalViolation
                          ? 'bg-red-600 text-white'
                          : selectedSession.evaluation.passed
                          ? 'bg-[#7FC453] text-[#061f16]'
                          : 'bg-amber-500 text-[#061f16]'
                      }`}>
                        {selectedSession.evaluation.criticalViolation
                          ? 'Reprovado'
                          : selectedSession.evaluation.passed
                          ? 'Aprovado'
                          : 'Insuficiente'}
                      </span>
                    </div>

                    {/* Breakdown */}
                    <div className="grid grid-cols-2 gap-2 text-center text-xs">
                      <div className="p-2 bg-[#f5f3ed] rounded-lg">
                        <span className="text-[10px] text-[#061f16]/60 uppercase block">Interpretação</span>
                        <span className="font-bold text-[#1E6B2E]">{selectedSession.evaluation.interpretationScore}/20</span>
                      </div>
                      <div className="p-2 bg-[#f5f3ed] rounded-lg">
                        <span className="text-[10px] text-[#061f16]/60 uppercase block">Aplicação CRM</span>
                        <span className="font-bold text-[#1E6B2E]">{selectedSession.evaluation.crmApplicationScore}/30</span>
                      </div>
                      <div className="p-2 bg-[#f5f3ed] rounded-lg">
                        <span className="text-[10px] text-[#061f16]/60 uppercase block">Governança</span>
                        <span className="font-bold text-[#1E6B2E]">{selectedSession.evaluation.governanceScore}/30</span>
                      </div>
                      <div className="p-2 bg-[#f5f3ed] rounded-lg">
                        <span className="text-[10px] text-[#061f16]/60 uppercase block">Clareza</span>
                        <span className="font-bold text-[#1E6B2E]">{selectedSession.evaluation.clarityScore}/20</span>
                      </div>
                    </div>

                    {/* Student text submitted */}
                    <div className="p-3 bg-[#f5f3ed]/60 rounded-xl border border-[#061f16]/6">
                      <strong className="text-[10px] uppercase text-[#1E6B2E] block mb-1">Texto Enviado pelo Aluno</strong>
                      <p className="text-[#061f16]/80 text-[11px] leading-relaxed max-h-36 overflow-y-auto">
                        {selectedSession.userSubmission}
                      </p>
                    </div>

                    {/* Feedback summary */}
                    <div className="p-3 bg-white rounded-xl border border-[#061f16]/6 space-y-1">
                      <strong className="text-[10px] uppercase text-[#1E6B2E] block">Feedback Pedagógico</strong>
                      <p className="text-[#061f16]/85 text-[11px] leading-relaxed">
                        {selectedSession.evaluation.overallFeedback}
                      </p>
                      {selectedSession.evaluation.humanJustification && (
                        <p className="text-[11px] text-[#1E6B2E] font-medium pt-1 border-t border-[#061f16]/5">
                          <strong>Justificativa humana:</strong> {selectedSession.evaluation.humanJustification}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-[#f5f3ed] rounded-[24px] p-8 text-center text-xs text-[#061f16]/60 border border-[#14502a]/10">
                Selecione uma sessão à esquerda para inspecionar os detalhes e evidências pedagógicas.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
