import React, { useEffect, useRef, useState } from 'react';
import { SalesforceView } from '../components/SalesforceView';
import { WelcomeView } from '../components/WelcomeView';
import { ContactCta } from './ContactCta';
import { DemoTab, JourneyMap } from './JourneyMap';
import type { Lang } from '../welcome/analyzeSignup';

const TEXT = {
  pt: {
    tabs: { welcome: 'Boas-vindas', rhythm: 'Ritmo de compra' } as Record<DemoTab, string>,
    nav: 'Demonstrações',
    home: 'Gina Intell, voltar ao topo',
    switchTo: 'Read in English',
    title: 'Gina Intell · Demonstração',
    copyright: '© 2026 Isaac Antunes. Personagem Gina, ilustrações e método Gina Intell: todos os direitos reservados.',
    privacy: 'Este site não coleta dados pessoais nem usa cookies. Os cadastros e clientes das demonstrações são fictícios.',
  },
  en: {
    tabs: { welcome: 'Welcome', rhythm: 'Purchase rhythm' } as Record<DemoTab, string>,
    nav: 'Demos',
    home: 'Gina Intell, back to top',
    switchTo: 'Ler em português',
    title: 'Gina Intell · Demo',
    copyright: '© 2026 Isaac Antunes. Gina character, illustrations and the Gina Intell method: all rights reserved.',
    privacy: "This site doesn't collect personal data or use cookies. The signups and customers in the demos are made up.",
  },
};

const LANG_KEY = 'gina-showcase-lang';

/** /en é a página em inglês (com metatags e imagem de prévia próprias). */
const isEnglishPath = () => /\/en(\.html)?\/?$/.test(window.location.pathname);

/** /en ou ?lang=en mandam direto; senão, a última escolha do visitante; senão, português. */
function initialLang(): Lang {
  if (isEnglishPath()) return 'en';
  const fromUrl = new URLSearchParams(window.location.search).get('lang');
  if (fromUrl === 'en' || fromUrl === 'pt') return fromUrl;
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved === 'en' || saved === 'pt') return saved;
  } catch {
    // Navegação privada ou armazenamento bloqueado: segue em português.
  }
  return 'pt';
}

/**
 * Vitrine pública do método Gina Intell: jornada do lead, as demonstrações com
 * dados fictícios (regras calculadas no navegador) e contato. Sem servidor, sem chaves.
 */
export default function ShowcaseApp() {
  const [tab, setTab] = useState<DemoTab>('welcome');
  const [lang, setLang] = useState<Lang>(initialLang);
  const t = TEXT[lang];

  useEffect(() => {
    document.documentElement.lang = lang === 'en' ? 'en' : 'pt-BR';
    document.title = t.title;
    // O endereço acompanha a escolha: recarregar ou compartilhar mantém a língua.
    const url = new URL(window.location.href);
    url.searchParams.delete('lang');
    if (lang === 'en' && !isEnglishPath()) url.searchParams.set('lang', 'en');
    if (lang === 'pt' && isEnglishPath()) url.pathname = '/';
    window.history.replaceState(null, '', url);
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch {
      // Sem armazenamento, a escolha vale só nesta visita.
    }
  }, [lang, t.title]);
  const demoRef = useRef<HTMLDivElement>(null);

  const openDemo = (next: DemoTab) => {
    setTab(next);
    demoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 w-full bg-[#eef6e6]/90 backdrop-blur-md border-b border-[#061f16]/10 px-4 md:px-8 py-3.5">
        <div className="max-w-[1360px] mx-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1E6B2E]"
            aria-label={t.home}
          >
            <div className="w-8 h-8 rounded-full bg-[#f5f3ed] border border-[#14502a]/15 flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
              <img src="/gina-head.png" alt="" width={32} height={32} className="w-7 h-7 object-contain" />
            </div>
            <span className="font-['Bagel_Fat_One'] text-xl md:text-2xl text-[#1E6B2E] tracking-tight leading-none">
              Gina <span className="text-[#061f16] font-sans font-extrabold text-sm uppercase tracking-widest ml-1">Intell</span>
            </span>
          </button>

          <nav className="flex items-center gap-1.5 md:gap-3 text-xs md:text-sm font-semibold" aria-label={t.nav}>
            {(Object.keys(t.tabs) as DemoTab[]).map((id) => (
              <button
                key={id}
                onClick={() => openDemo(id)}
                aria-current={tab === id ? 'page' : undefined}
                className={`px-3 py-1.5 rounded-full transition-all cursor-pointer whitespace-nowrap ${
                  tab === id ? 'bg-[#1E6B2E] text-[#f5f3ed] shadow-xs' : 'text-[#061f16]/80 hover:text-[#1E6B2E] hover:bg-[#14502a]/5'
                }`}
              >
                {t.tabs[id]}
              </button>
            ))}
            <button
              onClick={() => setLang(lang === 'pt' ? 'en' : 'pt')}
              aria-label={t.switchTo}
              title={t.switchTo}
              className="ml-1 px-2.5 py-1 rounded-full border border-[#061f16]/15 text-[11px] font-bold tracking-wider text-[#061f16]/80 hover:border-[#1E6B2E] hover:text-[#1E6B2E] cursor-pointer"
            >
              <span className={lang === 'pt' ? 'text-[#1E6B2E]' : 'opacity-50'}>PT</span>
              <span className="opacity-40"> / </span>
              <span className={lang === 'en' ? 'text-[#1E6B2E]' : 'opacity-50'}>EN</span>
            </button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-[1360px] mx-auto px-4 md:px-8 pt-8">
          <JourneyMap lang={lang} onOpenDemo={openDemo} />
        </div>

        {/* scroll-mt: o cabeçalho fixo não cobre o início da demo */}
        <div ref={demoRef} className="scroll-mt-20">
          {tab === 'welcome' ? <WelcomeView lang={lang} /> : <SalesforceView demoOnly lang={lang} />}
        </div>

        <div className="max-w-[1360px] mx-auto px-4 md:px-8 pb-10">
          <ContactCta lang={lang} />
        </div>
      </main>

      <footer className="border-t border-[#061f16]/10 px-6 py-6 bg-[#ffffff]/60">
        <div className="max-w-[1360px] mx-auto space-y-1.5 text-center sm:text-left text-xs text-[#1E6B2E]">
          <p className="font-medium text-pretty">{t.copyright}</p>
          <p className="text-[11px] text-[#061f16]/60 text-pretty">{t.privacy}</p>
        </div>
      </footer>
    </div>
  );
}
