import React from 'react';
import { ArrowRight } from 'lucide-react';
import type { Lang } from '../welcome/analyzeSignup';

export type DemoTab = 'welcome' | 'rhythm';

/** Os modos da Gina, os mesmos do case no Behance. */
type Mode = 'intake' | 'organize' | 'connect' | 'complete';

/** demo null: a etapa faz parte do método, mas ainda não tem demonstração. */
const STEP_META: { demo: DemoTab | null; mode: Mode }[] = [
  { demo: 'welcome', mode: 'intake' },
  { demo: 'welcome', mode: 'intake' },
  { demo: 'welcome', mode: 'organize' },
  { demo: 'welcome', mode: 'connect' },
  { demo: null, mode: 'connect' },
  { demo: 'rhythm', mode: 'complete' },
];

/** Jornada do lead no método Gina Intell, com os mesmos termos da página de consultoria. */
const TEXT = {
  pt: {
    mode: { intake: 'Receber', organize: 'Organizar', connect: 'Conectar', complete: 'Concluir' } as Record<Mode, string>,
    demo: { welcome: 'Ver na demo de boas-vindas', rhythm: 'Ver na demo de compra e recompra' } as Record<DemoTab, string>,
    noDemo: 'Entra no diagnóstico',
    steps: [
      ['Cadastro', 'Alguém se cadastra no site, no balcão ou pelo Instagram.'],
      ['Prova de consentimento', 'Quando aceitou, qual texto e por qual canal. Sem prova, ninguém recebe nada.'],
      ['Relatório do cadastro', 'Nome, WhatsApp, e-mail e cadastro repetido: o que falta, a Gina aponta.'],
      ['Boas-vindas', 'A mensagem sai no canal que a pessoa autorizou, depois da revisão do time.'],
      ['Relacionamento até a compra', 'Quem se cadastrou e ainda está decidindo recebe conteúdo no tempo certo, sem pressão, até a primeira compra.'],
      ['Compra e recompra', 'Depois da compra, a Gina acompanha cada cliente: em dia, atrasado, dormente ou VIP, que só recebe contato pessoal.'],
    ],
    alt: 'Gina, a mascote verde-limão do método, acenando',
    eyebrow: 'Gina Intell · Demonstração',
    title: 'Do cadastro à recompra, cada passo com regra clara.',
    intro:
      'Uma régua de relacionamento sob medida: a Gina confere, organiza e escreve, e o seu time aprova cada envio. Abaixo, a jornada de um cliente na sua loja e onde ver cada etapa funcionando com dados fictícios.',
    services: ['Régua de relacionamento', 'Automação de WhatsApp com aprovação', 'Boas-vindas', 'Recompra', 'Reativação de clientes', 'LGPD na prática'],
    byline: [
      'Método criado por ',
      ', consultor de CRM e lifecycle. Nos últimos dois anos, analista de CRM no SBT, uma das maiores emissoras de TV aberta do Brasil.',
    ],
  },
  en: {
    mode: { intake: 'Receive', organize: 'Organize', connect: 'Connect', complete: 'Complete' } as Record<Mode, string>,
    demo: { welcome: 'See it in the welcome demo', rhythm: 'See it in the purchase demo' } as Record<DemoTab, string>,
    noDemo: 'Covered in the checkup',
    steps: [
      ['Signup', 'Someone signs up on your site, at the counter or through Instagram.'],
      ['Proof of consent', 'When they opted in, what they agreed to and on which channel. No proof, no message.'],
      ['Signup report', "Name, WhatsApp, email and duplicate records: whatever's missing, Gina flags it."],
      ['Welcome', 'The message goes out on the channel they allowed, after your team reviews it.'],
      ['Nurturing to first purchase', "Someone who signed up and is still deciding gets the right content at the right pace, no pressure, until they buy."],
      ['Purchase and repeat', 'After they buy, Gina keeps an eye on every customer: on track, late, dormant or VIP, who only gets personal contact.'],
    ],
    alt: "Gina, the method's lime-green mascot, waving",
    eyebrow: 'Gina Intell · Demo',
    title: 'From signup to repeat purchase, every step follows a clear rule.',
    intro:
      "Lifecycle flows built for your shop: Gina checks, organizes and writes, and your team approves every send. Below is a customer's journey through your shop, and where to see each step working with made-up data.",
    services: ['Lifecycle flows', 'WhatsApp automation with approval', 'Welcome', 'Repeat purchase', 'Win-back', 'Consent done right'],
    byline: [
      'Method created by ',
      ", a CRM and lifecycle consultant. For the last two years, a CRM analyst at SBT, one of Brazil's largest free-to-air TV networks.",
    ],
  },
};

export const JourneyMap: React.FC<{ lang: Lang; onOpenDemo: (tab: DemoTab) => void }> = ({ lang, onOpenDemo }) => {
  const t = TEXT[lang];
  return (
    <section className="bg-[#1E6B2E] text-[#f5f3ed] rounded-[24px] p-6 md:p-10 overflow-hidden" aria-labelledby="jornada-titulo">
      <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-10">
        <img
          src="/gina-intake.png"
          alt={t.alt}
          width={320}
          height={360}
          fetchPriority="high"
          className="w-24 md:w-36 h-auto shrink-0 self-center md:self-auto drop-shadow-[0_12px_24px_rgba(6,31,22,0.35)]"
        />
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest text-[#d4efbe]">{t.eyebrow}</p>
          <h1 id="jornada-titulo" className="font-['Bagel_Fat_One'] text-3xl md:text-5xl leading-tight tracking-tight">
            {t.title}
          </h1>
          <p className="text-sm md:text-base text-[#d4efbe] max-w-2xl leading-relaxed">{t.intro}</p>
          <ul className="flex flex-wrap gap-1.5" aria-label={lang === 'en' ? 'What it covers' : 'O que entra'}>
            {t.services.map((service) => (
              <li key={service} className="px-2.5 py-1 rounded-full bg-[#7FC453]/20 border border-[#7FC453]/40 text-[11px] font-bold text-[#f5f3ed]">
                {service}
              </li>
            ))}
          </ul>
          <p className="text-xs md:text-sm text-[#f5f3ed]/85 max-w-2xl leading-relaxed border-l-2 border-[#7FC453] pl-3">
            {t.byline[0]}
            <strong className="font-bold">Isaac Antunes</strong>
            {t.byline[1]}
          </p>
        </div>
      </div>

      <ol className="mt-8 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
        {t.steps.map(([title, text], i) => {
          const { demo, mode } = STEP_META[i];
          return (
            <li key={title} className="relative rounded-2xl bg-[#f5f3ed]/8 border border-[#d4efbe]/20 p-4 md:p-5 flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <span
                  className="w-8 h-8 shrink-0 rounded-full bg-[#7FC453] text-[#061f16] font-bold text-sm flex items-center justify-center"
                  aria-hidden
                >
                  {i + 1}
                </span>
                <h2 className="font-bold text-base leading-tight flex-1">{title}</h2>
                <span className="inline-flex items-center gap-1 shrink-0 rounded-full bg-[#061f16]/25 pl-1 pr-2.5 py-0.5 text-[11px] font-bold text-[#d4efbe]">
                  <img src={`/gina-${mode}.png`} alt="" width={20} height={20} loading="lazy" className="w-5 h-5 object-contain" />
                  {t.mode[mode]}
                </span>
              </div>
              <p className="text-[13px] text-[#d4efbe] leading-relaxed">{text}</p>
              {demo ? (
                <button
                  onClick={() => onOpenDemo(demo)}
                  className="mt-auto self-start inline-flex items-center gap-1 text-xs font-bold text-[#9fdc6e] hover:text-[#f5f3ed] underline-offset-2 hover:underline cursor-pointer"
                >
                  {t.demo[demo]} <ArrowRight className="w-3.5 h-3.5" aria-hidden />
                </button>
              ) : (
                <span className="mt-auto self-start text-xs font-bold text-[#d4efbe]/70">{t.noDemo}</span>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
};
