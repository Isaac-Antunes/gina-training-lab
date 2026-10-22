import React from 'react';
import { ArrowUpRight, Linkedin, Mail } from 'lucide-react';
import type { Lang } from '../welcome/analyzeSignup';
import { CONTACT_EMAIL } from './contact';

const TEXT = {
  pt: {
    subject: 'Quero o diagnóstico do cadastro',
    offer: 'Diagnóstico do cadastro · 20 minutos',
    alt: 'Gina fazendo joinha',
    title: 'Comece pelo que já está na sua base.',
    body: 'No diagnóstico, olhamos o seu formulário de cadastro, a prova do consentimento e o caminho do cliente até a primeira compra. Você sai com as prioridades da sua régua de relacionamento, em ordem de impacto.',
    consulting: 'Conheça a consultoria',
    behance: 'Veja a Gina no Behance',
  },
  en: {
    subject: "I'd like the signup checkup",
    offer: '20-minute signup checkup',
    alt: 'Gina giving a thumbs-up',
    title: "Start with what's already in your list.",
    body: 'In the checkup, we review your signup form, your proof of consent and the path to a first purchase. You leave with your lifecycle priorities, ranked by impact.',
    consulting: 'See the consulting page',
    behance: 'See Gina on Behance',
  },
};

/** Chamada para contato ao fim da demonstração. Nenhum formulário: a vitrine não coleta dados pessoais. */
export const ContactCta: React.FC<{ lang: Lang }> = ({ lang }) => {
  const t = TEXT[lang];
  const mailto = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(t.subject)}`;
  const secondary =
    'inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-full text-[#1E6B2E] hover:bg-[#14502a]/5 text-sm font-bold transition-colors';

  return (
    <section
      className="bg-[#ffffff] rounded-[24px] p-6 md:p-10 shadow-xs border border-[#061f16]/8 flex flex-col lg:flex-row lg:items-center gap-6"
      aria-labelledby="contato-titulo"
    >
      <img
        src="/gina-complete.png"
        alt={t.alt}
        width={320}
        height={356}
        loading="lazy"
        className="w-20 md:w-28 h-auto shrink-0 self-center lg:self-auto"
      />
      <div className="flex-1 space-y-2">
        <p className="text-xs font-bold uppercase tracking-widest text-[#1E6B2E]">{t.offer}</p>
        <h2 id="contato-titulo" className="font-['Bagel_Fat_One'] text-2xl md:text-4xl text-[#1E6B2E] tracking-tight leading-tight">
          {t.title}
        </h2>
        <p className="text-sm md:text-base text-[#061f16]/75 max-w-2xl leading-relaxed">{t.body}</p>
      </div>
      <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0 flex-wrap">
        <a
          href={mailto}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-[#1E6B2E] hover:bg-[#14502a] text-[#f5f3ed] text-sm font-bold transition-colors"
        >
          <Mail className="w-4 h-4" aria-hidden /> {CONTACT_EMAIL}
        </a>
        <a
          href="https://www.linkedin.com/in/isaacnandes/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-[#f5f3ed] hover:bg-[#e9efe2] text-[#061f16] border border-[#061f16]/10 text-sm font-bold transition-colors"
        >
          <Linkedin className="w-4 h-4 text-[#1E6B2E]" aria-hidden /> LinkedIn
        </a>
        <a href="https://isaacantunesfacha-dev.github.io/gina-crm/" target="_blank" rel="noopener noreferrer" className={secondary}>
          {t.consulting} <ArrowUpRight className="w-4 h-4" aria-hidden />
        </a>
        <a
          href="https://www.behance.net/gallery/256578105/Lifecycle-CRM-told-by-Gina"
          target="_blank"
          rel="noopener noreferrer"
          className={secondary}
        >
          {t.behance} <ArrowUpRight className="w-4 h-4" aria-hidden />
        </a>
      </div>
    </section>
  );
};
