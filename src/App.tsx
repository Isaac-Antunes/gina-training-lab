import React, { useState, useEffect } from 'react';
import { Header, NavTab } from './components/Header';
import { TrainingView } from './components/TrainingView';
import { ScenariosView } from './components/ScenariosView';
import { HistoryView } from './components/HistoryView';
import { MethodView } from './components/MethodView';
import { ChallengesView } from './components/ChallengesView';
import { SalesforceView } from './components/SalesforceView';
import { WelcomeView } from './components/WelcomeView';
import { GinaCharacter } from './components/GinaCharacter';
import { GinaSpeechBubble } from './components/GinaSpeechBubble';
import { SCENARIOS } from './data/scenarios';
import { Scenario, TrainingSession } from './types/crm';
import { loadTrainingHistory } from './utils/storage';
import { ArrowRight, Sparkles, ShieldCheck } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('train');
  const [selectedScenario, setSelectedScenario] = useState<Scenario>(SCENARIOS[0]);
  const [savedSessions, setSavedSessions] = useState<TrainingSession[]>([]);
  const [showHero, setShowHero] = useState<boolean>(true);

  // Load history on mount
  const refreshHistory = () => {
    setSavedSessions(loadTrainingHistory());
  };

  useEffect(() => {
    refreshHistory();
  }, []);

  const handleStartTraining = (scenario?: Scenario) => {
    if (scenario) {
      setSelectedScenario(scenario);
    }
    setShowHero(false);
    setCurrentTab('train');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#eef6e6] text-[#061f16] flex flex-col font-['Onest'] selection:bg-[#7FC453] selection:text-[#061f16]">
      {/* Top Header */}
      <Header
        currentTab={currentTab}
        onTabChange={(tab) => {
          setCurrentTab(tab);
          if (tab !== 'train') setShowHero(false);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onStartTraining={() => handleStartTraining()}
        savedCount={savedSessions.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-[1400px] mx-auto pb-12">
        {/* HERO BANNER SECTION (Shows on initial landing in 'train' tab, preserves the original HTML layout & character design) */}
        {currentTab === 'train' && showHero && (
          <section className="relative overflow-hidden min-h-[460px] md:min-h-[540px] m-4 md:m-6 rounded-[28px] bg-[radial-gradient(ellipse_60%_70%_at_50%_85%,#9fdc6e_0%,#5fb84a_35%,#1E6B2E_75%,#14502a_100%)] p-6 md:p-12 shadow-md flex flex-col justify-between animate-in fade-in duration-300">
            {/* Top row */}
            <div className="flex items-center justify-between z-10">
              <span className="text-xs md:text-sm font-bold tracking-[0.18em] uppercase text-[#f5f3ed]/90">
                Laboratório Supervisionado de CRM · Isaac Antunes
              </span>
              <button
                onClick={() => setShowHero(false)}
                className="text-xs font-semibold text-[#f5f3ed]/75 hover:text-white bg-black/15 hover:bg-black/25 px-3 py-1 rounded-full transition-colors cursor-pointer"
              >
                Ocultar introdução
              </button>
            </div>

            {/* Giant Title */}
            <div className="flex justify-between items-baseline select-none z-0 mt-4 md:mt-2">
              <h1 className="font-['Bagel_Fat_One'] text-6xl sm:text-7xl md:text-8xl lg:text-9xl text-[#f5f3ed] leading-[0.88] tracking-tight">
                Gina
              </h1>
              <span className="font-['Bagel_Fat_One'] text-4xl sm:text-6xl md:text-8xl lg:text-9xl text-[#f5f3ed]/80 leading-[0.88] tracking-tight">
                Agent
              </span>
            </div>

            {/* Central Mascot Position */}
            <div className="absolute left-1/2 bottom-[-10px] -translate-x-1/2 z-10 drop-shadow-[0_24px_36px_rgba(6,31,22,0.45)] pointer-events-none">
              <GinaCharacter mood="listening" size="hero" />
            </div>

            {/* Floating Speech Callout (Right) */}
            <div className="hidden lg:block absolute left-[calc(50%+140px)] top-[36%] z-20 w-[260px]">
              <GinaSpeechBubble
                quote="Menos ruído. Mais relevância. Campanha pra quem, meu bem?"
                tag="Gina"
              />
            </div>

            {/* Bottom Controls / CTA bar */}
            <div className="z-10 flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 pt-4 border-t border-white/15">
              <div className="text-center sm:text-left">
                <p className="text-sm md:text-base font-bold text-[#f5f3ed]">
                  Menos ruído. Mais relevância.
                </p>
                <p className="text-xs text-[#f5f3ed]/80">
                  Treine o agente com 6 cenários progressivos e validação determinística de CRM.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowHero(false)}
                  className="px-6 py-3 rounded-full bg-[#f5f3ed] hover:bg-white text-[#061f16] text-xs font-bold uppercase tracking-wider shadow-lg flex items-center gap-2 transform active:scale-95 transition-all cursor-pointer"
                >
                  <span>Começar treino</span>
                  <ArrowRight className="w-4 h-4 text-[#1E6B2E]" />
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Tab 1: Treinar */}
        {currentTab === 'train' && (
          <TrainingView
            scenarios={SCENARIOS}
            selectedScenario={selectedScenario}
            onSelectScenario={(scen) => setSelectedScenario(scen)}
            onSavedSession={refreshHistory}
          />
        )}

        {/* Tab 2: Cenários */}
        {currentTab === 'scenarios' && (
          <ScenariosView
            scenarios={SCENARIOS}
            onSelectScenario={(scen) => handleStartTraining(scen)}
            savedSessions={savedSessions}
          />
        )}

        {/* Tab 3: Desafios & Runner */}
        {currentTab === 'challenges' && <ChallengesView />}
        {currentTab === 'welcome' && <WelcomeView />}
        {currentTab === 'salesforce' && <SalesforceView />}

        {/* Tab 4: Histórico */}
        {currentTab === 'history' && (
          <HistoryView
            sessions={savedSessions}
            onRefresh={refreshHistory}
            onGoToTrain={() => {
              setCurrentTab('train');
              setShowHero(false);
            }}
          />
        )}

        {/* Tab 4: Método */}
        {currentTab === 'method' && <MethodView />}
      </main>

      {/* Footer conforming to original HTML reference and branding */}
      <footer className="border-t border-[#061f16]/10 px-6 py-6 bg-[#ffffff]/60 mt-auto">
        <div className="max-w-[1360px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-medium text-[#1E6B2E]">
          <span className="text-center sm:text-left text-pretty">
            © 2026 Isaac Antunes. Gina character, illustrations, and the Gina Intell method. All rights reserved.
          </span>
          <div className="flex items-center gap-4">
            <span className="text-[11px] text-[#061f16]/50">
              Laboratório Supervisionado de CRM
            </span>
            <a
              href="https://www.linkedin.com/in/isaacnandes/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold hover:underline hover:text-[#14502a] transition-colors"
            >
              LinkedIn
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
