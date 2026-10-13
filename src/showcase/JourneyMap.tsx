import React from 'react';
import { ArrowRight } from 'lucide-react';

export type DemoTab = 'welcome' | 'rhythm';

/** Os quatro modos da Gina, os mesmos do case no Behance. */
type Mode = 'intake' | 'organize' | 'connect';
const MODE_LABEL: Record<Mode, string> = { intake: 'Receber', organize: 'Organizar', connect: 'Conectar' };

interface Step {
  title: string;
  text: string;
  demo: DemoTab;
  mode: Mode;
}

/** Jornada do lead no método Gina Intell, com os mesmos termos da página de consultoria. */
const STEPS: Step[] = [
  { title: 'Cadastro', text: 'Alguém se cadastra no site, no balcão ou pelo Instagram.', demo: 'welcome', mode: 'intake' },
  {
    title: 'Prova de consentimento',
    text: 'Quando aceitou, qual texto e por qual canal. Sem prova, ninguém recebe nada.',
    demo: 'welcome',
    mode: 'intake',
  },
  {
    title: 'Relatório do cadastro',
    text: 'Nome, WhatsApp, e-mail e cadastro repetido: o que falta, a Gina aponta.',
    demo: 'welcome',
    mode: 'organize',
  },
  { title: 'Boas-vindas', text: 'Rascunho no canal autorizado. Você aprova antes do envio.', demo: 'welcome', mode: 'connect' },
  { title: 'Segunda compra', text: 'Quem comprou uma vez recebe um motivo para voltar.', demo: 'rhythm', mode: 'connect' },
  {
    title: 'Ritmo de compra',
    text: 'Em dia, atrasado (1,5×), dormente (3×) ou VIP, que só recebe contato pessoal.',
    demo: 'rhythm',
    mode: 'organize',
  },
];

const DEMO_LABEL: Record<DemoTab, string> = { welcome: 'Ver na demo de boas-vindas', rhythm: 'Ver na demo de ritmo' };

export const JourneyMap: React.FC<{ onOpenDemo: (tab: DemoTab) => void }> = ({ onOpenDemo }) => (
  <section className="bg-[#1E6B2E] text-[#f5f3ed] rounded-[24px] p-6 md:p-10 overflow-hidden" aria-labelledby="jornada-titulo">
    <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-10">
      <img
        src="/gina-intake.png"
        alt="Gina, a mascote verde-limão do método, acenando"
        width={320}
        height={360}
        fetchPriority="high"
        className="w-24 md:w-36 h-auto shrink-0 self-center md:self-auto drop-shadow-[0_12px_24px_rgba(6,31,22,0.35)]"
      />
      <div className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-widest text-[#d4efbe]">Gina Intell · Demonstração</p>
        <h1 id="jornada-titulo" className="font-['Bagel_Fat_One'] text-3xl md:text-5xl leading-tight tracking-tight">
          Do cadastro à recompra, cada passo com regra clara.
        </h1>
        <p className="text-sm md:text-base text-[#d4efbe] max-w-2xl leading-relaxed">
          A Gina confere, organiza e escreve. Você aprova. Abaixo, a jornada de um cliente na sua loja e onde ver cada etapa
          funcionando com dados fictícios.
        </p>
        <p className="text-xs md:text-sm text-[#f5f3ed]/85 max-w-2xl leading-relaxed border-l-2 border-[#7FC453] pl-3">
          Método criado por <strong className="font-bold">Isaac Antunes</strong>, analista sênior de CRM e lifecycle. Nos últimos
          dois anos, no SBT, uma das maiores emissoras de TV aberta do Brasil.
        </p>
      </div>
    </div>

    <ol className="mt-8 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
      {STEPS.map((step, i) => (
        <li key={step.title} className="relative rounded-2xl bg-[#f5f3ed]/8 border border-[#d4efbe]/20 p-4 md:p-5 flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <span
              className="w-8 h-8 shrink-0 rounded-full bg-[#7FC453] text-[#061f16] font-bold text-sm flex items-center justify-center"
              aria-hidden
            >
              {i + 1}
            </span>
            <h2 className="font-bold text-base leading-tight flex-1">{step.title}</h2>
            <span className="inline-flex items-center gap-1 shrink-0 rounded-full bg-[#061f16]/25 pl-1 pr-2.5 py-0.5 text-[11px] font-bold text-[#d4efbe]">
              <img src={`/gina-${step.mode}.png`} alt="" width={20} height={20} loading="lazy" className="w-5 h-5 object-contain" />
              {MODE_LABEL[step.mode]}
            </span>
          </div>
          <p className="text-[13px] text-[#d4efbe] leading-relaxed">{step.text}</p>
          <button
            onClick={() => onOpenDemo(step.demo)}
            className="mt-auto self-start inline-flex items-center gap-1 text-xs font-bold text-[#9fdc6e] hover:text-[#f5f3ed] underline-offset-2 hover:underline cursor-pointer"
          >
            {DEMO_LABEL[step.demo]} <ArrowRight className="w-3.5 h-3.5" aria-hidden />
          </button>
        </li>
      ))}
    </ol>
  </section>
);
