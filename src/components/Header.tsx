import React from 'react';
import { GinaCharacter } from './GinaCharacter';
import { Download } from 'lucide-react';

export type NavTab = 'train' | 'scenarios' | 'challenges' | 'welcome' | 'salesforce' | 'history' | 'method';

interface HeaderProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onStartTraining: () => void;
  savedCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onTabChange,
  onStartTraining,
  savedCount,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-[#eef6e6]/90 backdrop-blur-md border-b border-[#061f16]/10 px-4 md:px-8 py-3.5 transition-colors">
      <div className="max-w-[1360px] mx-auto flex flex-wrap 2xl:flex-nowrap items-center justify-between gap-x-4 gap-y-2">
        {/* Zone 1: Single element brand wordmark with mini icon */}
        <button
          onClick={() => onTabChange('train')}
          className="flex items-center gap-2.5 text-left group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E6B2E] rounded-lg p-1"
        >
          <div className="w-8 h-8 rounded-full bg-[#f5f3ed] border border-[#14502a]/15 flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
            <GinaCharacter mood="listening" size="mini" />
          </div>
          <span className="font-['Bagel_Fat_One'] text-xl md:text-2xl text-[#1E6B2E] tracking-tight leading-none group-hover:text-[#14502a] transition-colors">
            Gina <span className="text-[#061f16] font-sans font-extrabold text-sm uppercase tracking-widest ml-1">Training Lab</span>
          </span>
        </button>

        {/* Zone 2: clean text navigation links */}
        <nav className="order-last 2xl:order-none w-full 2xl:w-auto flex items-center gap-1.5 md:gap-4 lg:gap-6 text-xs md:text-sm font-semibold overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden -mx-1 px-1 2xl:mx-0 2xl:px-0">
          <button
            onClick={() => onTabChange('train')}
            className={`px-3 py-1.5 rounded-full transition-all cursor-pointer ${
              currentTab === 'train'
                ? 'bg-[#1E6B2E] text-[#f5f3ed] shadow-xs'
                : 'text-[#061f16]/80 hover:text-[#1E6B2E] hover:bg-[#14502a]/5'
            }`}
          >
            Treinar
          </button>
          <button
            onClick={() => onTabChange('scenarios')}
            className={`px-3 py-1.5 rounded-full transition-all cursor-pointer ${
              currentTab === 'scenarios'
                ? 'bg-[#1E6B2E] text-[#f5f3ed] shadow-xs'
                : 'text-[#061f16]/80 hover:text-[#1E6B2E] hover:bg-[#14502a]/5'
            }`}
          >
            Cenários
          </button>
          <button
            onClick={() => onTabChange('challenges')}
            className={`px-3 py-1.5 rounded-full transition-all cursor-pointer flex items-center gap-1.5 ${
              currentTab === 'challenges'
                ? 'bg-[#1E6B2E] text-[#f5f3ed] shadow-xs'
                : 'text-[#061f16]/80 hover:text-[#1E6B2E] hover:bg-[#14502a]/5'
            }`}
          >
            <span>Desafios</span>
            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-[#7FC453] text-[#061f16]">
              Suíte
            </span>
          </button>
          <button
            onClick={() => onTabChange('welcome')}
            className={`px-3 py-1.5 rounded-full transition-all cursor-pointer ${
              currentTab === 'welcome'
                ? 'bg-[#1E6B2E] text-[#f5f3ed] shadow-xs'
                : 'text-[#061f16]/80 hover:text-[#1E6B2E] hover:bg-[#14502a]/5'
            }`}
          >
            Boas-vindas
          </button>
          <button
            onClick={() => onTabChange('salesforce')}
            className={`px-3 py-1.5 rounded-full transition-all cursor-pointer ${
              currentTab === 'salesforce'
                ? 'bg-[#1E6B2E] text-[#f5f3ed] shadow-xs'
                : 'text-[#061f16]/80 hover:text-[#1E6B2E] hover:bg-[#14502a]/5'
            }`}
          >
            Salesforce
          </button>
          <button
            onClick={() => onTabChange('history')}
            className={`px-3 py-1.5 rounded-full transition-all cursor-pointer flex items-center gap-1.5 ${
              currentTab === 'history'
                ? 'bg-[#1E6B2E] text-[#f5f3ed] shadow-xs'
                : 'text-[#061f16]/80 hover:text-[#1E6B2E] hover:bg-[#14502a]/5'
            }`}
          >
            <span>Histórico</span>
            {savedCount > 0 && (
              <span className={`text-[11px] font-bold px-1.5 py-0.2 rounded-full ${
                currentTab === 'history' ? 'bg-[#7FC453] text-[#061f16]' : 'bg-[#1E6B2E]/15 text-[#1E6B2E]'
              }`}>
                {savedCount}
              </span>
            )}
          </button>
          <button
            onClick={() => onTabChange('method')}
            className={`px-3 py-1.5 rounded-full transition-all cursor-pointer ${
              currentTab === 'method'
                ? 'bg-[#1E6B2E] text-[#f5f3ed] shadow-xs'
                : 'text-[#061f16]/80 hover:text-[#1E6B2E] hover:bg-[#14502a]/5'
            }`}
          >
            Método
          </button>
        </nav>

        {/* Zone 3: Actions (ZIP Download & Start Training) */}
        <div className="flex items-center gap-2.5">
          <a
            href="/api/download-zip"
            download="gina-training-lab-updated.zip"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#f5f3ed] hover:bg-[#1E6B2E] text-[#061f16] hover:text-[#f5f3ed] border border-[#061f16]/10 text-xs font-bold transition-all shadow-xs cursor-pointer group"
            title="Baixar código-fonte atualizado do projeto (.ZIP)"
          >
            <Download className="w-3.5 h-3.5 text-[#1E6B2E] group-hover:text-[#f5f3ed] transition-colors" />
            <span className="hidden md:inline">Baixar .ZIP</span>
            <span className="md:hidden">.ZIP</span>
          </a>

          <button
            onClick={onStartTraining}
            className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#1E6B2E] hover:bg-[#14502a] text-[#f5f3ed] text-xs font-bold tracking-wide uppercase shadow-[0_4px_12px_rgba(30,107,46,0.3)] transition-all transform active:scale-95 cursor-pointer"
          >
            <span>Começar treino</span>
          </button>
        </div>
      </div>
    </header>
  );
};
