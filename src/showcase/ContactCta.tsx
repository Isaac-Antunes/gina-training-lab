import React from 'react';
import { ArrowUpRight, Linkedin, Mail } from 'lucide-react';

const EMAIL = 'iantunessp@gmail.com';
const MAILTO = `mailto:${EMAIL}?subject=${encodeURIComponent('Quero ver a Gina na minha loja')}`;

/** Chamada para contato ao fim da demonstração. Nenhum formulário: a vitrine não coleta dados. */
export const ContactCta: React.FC = () => (
  <section className="bg-[#ffffff] rounded-[24px] p-6 md:p-10 shadow-xs border border-[#061f16]/8 flex flex-col lg:flex-row lg:items-center gap-6" aria-labelledby="contato-titulo">
    <div className="flex-1 space-y-2">
      <h2 id="contato-titulo" className="font-['Bagel_Fat_One'] text-2xl md:text-4xl text-[#1E6B2E] tracking-tight leading-tight">
        Quer ver isso na sua loja?
      </h2>
      <p className="text-sm md:text-base text-[#061f16]/75 max-w-2xl leading-relaxed">
        Em uma conversa curta, a gente olha o seu formulário de cadastro e o que acontece depois dele. Você sai sabendo o que
        falta para ter boas-vindas com consentimento.
      </p>
    </div>
    <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0">
      <a
        href={MAILTO}
        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-[#1E6B2E] hover:bg-[#14502a] text-[#f5f3ed] text-sm font-bold transition-colors"
      >
        <Mail className="w-4 h-4" aria-hidden /> {EMAIL}
      </a>
      <a
        href="https://www.linkedin.com/in/isaacnandes/"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-[#f5f3ed] hover:bg-[#e9efe2] text-[#061f16] border border-[#061f16]/10 text-sm font-bold transition-colors"
      >
        <Linkedin className="w-4 h-4 text-[#1E6B2E]" aria-hidden /> LinkedIn
      </a>
      <a
        href="https://isaacantunesfacha-dev.github.io/gina-crm/"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-full text-[#1E6B2E] hover:bg-[#14502a]/5 text-sm font-bold transition-colors"
      >
        Conheça a consultoria <ArrowUpRight className="w-4 h-4" aria-hidden />
      </a>
    </div>
  </section>
);
