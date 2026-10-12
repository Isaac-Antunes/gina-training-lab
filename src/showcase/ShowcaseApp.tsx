import React, { useState } from 'react';
import { GinaCharacter } from '../components/GinaCharacter';
import { SalesforceView } from '../components/SalesforceView';
import { WelcomeView } from '../components/WelcomeView';

type ShowcaseTab = 'welcome' | 'salesforce';

const TABS: { id: ShowcaseTab; label: string }[] = [
  { id: 'welcome', label: 'Boas-vindas' },
  { id: 'salesforce', label: 'Gina na Salesforce' },
];

/**
 * Vitrine pública do método Gina Intell: só as demonstrações, com dados
 * fictícios e regras calculadas no navegador. Sem servidor, sem chaves.
 */
export default function ShowcaseApp() {
  const [tab, setTab] = useState<ShowcaseTab>('welcome');

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 w-full bg-[#eef6e6]/90 backdrop-blur-md border-b border-[#061f16]/10 px-4 md:px-8 py-3.5">
        <div className="max-w-[1360px] mx-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#f5f3ed] border border-[#14502a]/15 flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
              <GinaCharacter mood="listening" size="mini" />
            </div>
            <span className="font-['Bagel_Fat_One'] text-xl md:text-2xl text-[#1E6B2E] tracking-tight leading-none">
              Gina <span className="text-[#061f16] font-sans font-extrabold text-sm uppercase tracking-widest ml-1">Intell</span>
            </span>
          </div>

          <nav className="flex items-center gap-1.5 md:gap-3 text-xs md:text-sm font-semibold" aria-label="Demonstrações">
            {TABS.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => {
                  setTab(id);
                  window.scrollTo({ top: 0 });
                }}
                aria-current={tab === id ? 'page' : undefined}
                className={`px-3 py-1.5 rounded-full transition-all cursor-pointer whitespace-nowrap ${
                  tab === id ? 'bg-[#1E6B2E] text-[#f5f3ed] shadow-xs' : 'text-[#061f16]/80 hover:text-[#1E6B2E] hover:bg-[#14502a]/5'
                }`}
              >
                {label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {tab === 'welcome' ? <WelcomeView /> : <SalesforceView demoOnly />}
      </main>

      <footer className="border-t border-[#061f16]/10 px-6 py-6 bg-[#ffffff]/60">
        <div className="max-w-[1360px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-medium text-[#1E6B2E]">
          <span className="text-center sm:text-left text-pretty">
            © 2026 Isaac Antunes. Personagem Gina, ilustrações e método Gina Intell: todos os direitos reservados.
          </span>
          <a
            href="https://www.linkedin.com/in/isaacnandes/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold hover:underline hover:text-[#14502a] transition-colors"
          >
            Falar com o Isaac no LinkedIn
          </a>
        </div>
      </footer>
    </div>
  );
}
