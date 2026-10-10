import React from 'react';
import { GinaCharacter } from './GinaCharacter';
import { ShieldCheck, Scale, Cpu, HelpCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';

export const MethodView: React.FC = () => {
  return (
    <div className="max-w-[1360px] mx-auto px-4 md:px-8 py-8 space-y-12 animate-in fade-in duration-300 text-pretty">
      {/* Hero Header */}
      <section className="bg-[#ffffff] rounded-[24px] p-8 md:p-12 shadow-xs border border-[#061f16]/8 space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-widest text-[#1E6B2E]">Metodologia Gina Intell</span>
          <span className="text-slate-300">·</span>
          <span className="text-xs font-semibold text-[#061f16]/60">Criado por Isaac Antunes</span>
        </div>
        <h1 className="font-['Bagel_Fat_One'] text-3xl md:text-5xl text-[#1E6B2E] tracking-tight leading-tight">
          Menos ruído. Mais relevância.
        </h1>
        <p className="text-base md:text-lg text-[#061f16]/80 max-w-3xl leading-relaxed">
          O Gina Training Lab é um ambiente supervisionado de treinamento de agentes de CRM e lifecycle marketing para o pequeno varejo físico e digital. Ele substitui a intuição e o disparo cego por regras determinísticas matemáticas, governança estrita de consentimento e empatia genuína.
        </p>

        {/* Critical Methodology Notice */}
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 text-xs md:text-sm flex items-start gap-3 mt-4">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1 leading-relaxed">
            <strong className="block font-bold">Governança Pedagógica & Retreino:</strong>
            <p>
              O feedback fornecido pelo avaliador ou aluno e as calibragens de nota <strong>NÃO retreinam o modelo de linguagem automaticamente</strong> nesta versão. O laboratório funciona em ambiente sandbox seguro, garantindo auditabilidade manual, reprodutibilidade e conformidade rigorosa com a LGPD.
            </p>
          </div>
        </div>
      </section>

      {/* The 4 Deterministic CRM Rules */}
      <section className="space-y-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#1E6B2E]">Fundamentos Matemáticos</span>
          <h2 className="text-2xl font-bold text-[#061f16] tracking-tight mt-1">
            As Regras Determinísticas de CRM da Gina
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-[#ffffff] rounded-[22px] p-6 border border-[#061f16]/8 shadow-xs space-y-3">
            <span className="text-xs font-mono font-bold text-[#1E6B2E] bg-[#e9efe2] px-2.5 py-0.5 rounded-full inline-block">
              01 · Ritmo & Frequência
            </span>
            <h3 className="font-bold text-base text-[#061f16]">Mediana dos Intervalos</h3>
            <p className="text-xs text-[#061f16]/75 leading-relaxed">
              O ritmo habitual de compra é calculado pela <strong>mediana dos intervalos entre dias distintos de compra</strong> (nunca pela média, para evitar distorções de compras anômalas). Frequência é a contagem de pedidos reais. Sem histórico suficiente, <strong>não se inventa ritmo</strong>.
            </p>
          </div>

          <div className="bg-[#ffffff] rounded-[22px] p-6 border border-[#061f16]/8 shadow-xs space-y-3">
            <span className="text-xs font-mono font-bold text-[#1E6B2E] bg-[#e9efe2] px-2.5 py-0.5 rounded-full inline-block">
              02 · Recência ≤ 1.5x
            </span>
            <h3 className="font-bold text-base text-[#061f16]">Em Ritmo = Nenhuma Mensagem</h3>
            <p className="text-xs text-[#061f16]/75 leading-relaxed">
              Quando a recência atual está dentro de até 1.5x o intervalo habitual, o cliente está em ciclo natural. A melhor decisão é o <strong>silêncio inteligente</strong>. Enviar cupons aqui queima margem e cansa o cliente.
            </p>
          </div>

          <div className="bg-[#ffffff] rounded-[22px] p-6 border border-[#061f16]/8 shadow-xs space-y-3">
            <span className="text-xs font-mono font-bold text-[#1E6B2E] bg-[#e9efe2] px-2.5 py-0.5 rounded-full inline-block">
              03 · Recência &gt; 1.5x até 3x
            </span>
            <h3 className="font-bold text-base text-[#061f16]">Janela de Atraso / Lembrete</h3>
            <p className="text-xs text-[#061f16]/75 leading-relaxed">
              Entre 1.5x e 3.0x do ciclo, o cliente atrasou seu reabastecimento habitual. O agente sugere um <strong>lembrete amigável e contextual</strong> baseado no item habitual (ex: o grão de café acabou?), sem promoção agressiva precipitada.
            </p>
          </div>

          <div className="bg-[#ffffff] rounded-[22px] p-6 border border-[#061f16]/8 shadow-xs space-y-3">
            <span className="text-xs font-mono font-bold text-[#1E6B2E] bg-[#e9efe2] px-2.5 py-0.5 rounded-full inline-block">
              04 · Recência &gt; 3.0x
            </span>
            <h3 className="font-bold text-base text-[#061f16]">Dormência & Descanso de 90 Dias</h3>
            <p className="text-xs text-[#061f16]/75 leading-relaxed">
              Ultrapassados 3x o ciclo habitual, o cliente entra em dormência. Disparos repetidos levam ao cancelamento de cadastro ou denúncia por spam. Aciona-se a <strong>política de descanso de 90 dias</strong> sem novos contatos.
            </p>
          </div>

          <div className="bg-[#ffffff] rounded-[22px] p-6 border border-[#061f16]/8 shadow-xs space-y-3">
            <span className="text-xs font-mono font-bold text-[#1E6B2E] bg-[#e9efe2] px-2.5 py-0.5 rounded-full inline-block">
              05 · VIP: Terço Superior
            </span>
            <h3 className="font-bold text-base text-[#061f16]">Contato Humano Obrigatório</h3>
            <p className="text-xs text-[#061f16]/75 leading-relaxed">
              Clientes no terço superior de pedidos E gasto da base são classificados como VIP. Se um VIP atrasa, a metodologia <strong>proíbe automações genéricas</strong> e exige concierge ou mensagem direta do proprietário.
            </p>
          </div>

          <div className="bg-[#ffffff] rounded-[22px] p-6 border border-[#061f16]/8 shadow-xs space-y-3">
            <span className="text-xs font-mono font-bold text-[#1E6B2E] bg-[#e9efe2] px-2.5 py-0.5 rounded-full inline-block">
              06 · Clientes de 1 Compra
            </span>
            <h3 className="font-bold text-base text-[#061f16]">Boas-vindas vs Estímulo</h3>
            <p className="text-xs text-[#061f16]/75 leading-relaxed">
              Para clientes com apenas uma compra: se recência ≤ 30 dias, mensagem de boas-vindas e satisfação. Se recência &gt; 30 dias, estímulo amigável à segunda compra para estabelecer o primeiro intervalo.
            </p>
          </div>
        </div>
      </section>

      {/* Rubric Evaluation System (0 - 100) */}
      <section className="bg-[#ffffff] rounded-[24px] p-8 md:p-10 shadow-xs border border-[#061f16]/8 space-y-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#1E6B2E]">Avaliação Supervisionada</span>
          <h2 className="text-2xl font-bold text-[#061f16] tracking-tight mt-1">
            Rubrica Pedagógica (0 a 100 Pontos)
          </h2>
          <p className="text-xs text-[#061f16]/70 mt-1">
            A pontuação é somada estritamente no código com respeito intransigente ao teto de cada peso. Totais inventados pelo modelo de linguagem são descartados.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-[#f5f3ed]/60 border border-[#061f16]/10 space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-bold text-sm text-[#061f16]">Interpretação</span>
              <span className="font-mono font-bold text-sm text-[#1E6B2E]">20 pts</span>
            </div>
            <p className="text-xs text-[#061f16]/75 leading-relaxed">
              Capacidade de ler os dados, reconhecer o público-alvo ou denunciar a falta dele, e extrair os fatos do briefing sem suposições infundadas.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#f5f3ed]/60 border border-[#061f16]/10 space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-bold text-sm text-[#061f16]">Aplicação CRM</span>
              <span className="font-mono font-bold text-sm text-[#1E6B2E]">30 pts</span>
            </div>
            <p className="text-xs text-[#061f16]/75 leading-relaxed">
              Cálculo correto de mediana e recência, aplicação das regras de 1.5x e 3x, tratamento especial para VIPs e respeito ao estágio do cliente.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#f5f3ed]/60 border border-[#061f16]/10 space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-bold text-sm text-[#061f16]">Governança</span>
              <span className="font-mono font-bold text-sm text-[#1E6B2E]">30 pts</span>
            </div>
            <p className="text-xs text-[#061f16]/75 leading-relaxed">
              Respeito irrevogável ao consentimento (LGPD), proteção da margem do lojista, aplicação de descanso e bloqueio de injeções maliciosas.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-[#f5f3ed]/60 border border-[#061f16]/10 space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-bold text-sm text-[#061f16]">Clareza</span>
              <span className="font-mono font-bold text-sm text-[#1E6B2E]">20 pts</span>
            </div>
            <p className="text-xs text-[#061f16]/75 leading-relaxed">
              Redação executável, objetiva e concisa. Recomendações práticas e verificáveis, sem jargões vazios ou prolixidade.
            </p>
          </div>
        </div>

        {/* Critical Failure Rule */}
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-950 text-xs flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="space-y-1 leading-relaxed">
            <strong className="font-bold text-red-900 block">Regra de Reprovação Sumária:</strong>
            <span>
              Qualquer violação crítica comprovada de consentimento (disparo para contatos sem opt-in), vazamento/exposição de dados ou execução não autorizada <strong>reprova o aluno sumariamente</strong>, independentemente da nota acumulada nas outras três dimensões.
            </span>
          </div>
        </div>
      </section>

      {/* The 6 Moods of Gina (From character design) */}
      <section className="space-y-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#1E6B2E]">Design do Agente</span>
          <h2 className="text-2xl font-bold text-[#061f16] tracking-tight mt-1">
            Os 6 Estados Emocionais da Gina
          </h2>
          <p className="text-xs text-[#061f16]/70 mt-1">
            O rosto da Gina funciona como a barra de status viva do pequeno varejista. Cada expressão mapeia uma etapa do ciclo de decisão.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="card p-6 rounded-[22px] bg-white border border-[#061f16]/8 shadow-xs flex flex-col items-center text-center gap-3">
            <GinaCharacter mood="listening" size="medium" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#1E6B2E]">01 · Ouvindo (Listening)</span>
            <p className="text-xs text-[#061f16]/70 leading-relaxed">
              Estado padrão. Gina acompanha as vendas em segundo plano sem incomodar os clientes habituais.
            </p>
          </div>

          <div className="card p-6 rounded-[22px] bg-white border border-[#061f16]/8 shadow-xs flex flex-col items-center text-center gap-3">
            <GinaCharacter mood="reading_rhythm" size="medium" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#1E6B2E]">02 · Lendo o Ritmo</span>
            <p className="text-xs text-[#061f16]/70 leading-relaxed">
              Mão no queixo. Recomputando a mediana do ciclo e calculando a recência exata de cada cliente.
            </p>
          </div>

          <div className="card p-6 rounded-[22px] bg-[#7FC453] text-[#061f16] border border-[#061f16]/8 shadow-xs flex flex-col items-center text-center gap-3">
            <GinaCharacter mood="heads_up" size="medium" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#061f16]">03 · Ponto de Atenção</span>
            <p className="text-xs text-[#061f16]/85 leading-relaxed">
              Na ponta dos pés com balão de exclamação. Alerta de governança ou cliente que passou de 1.5x do ciclo.
            </p>
          </div>

          <div className="card p-6 rounded-[22px] bg-white border border-[#061f16]/8 shadow-xs flex flex-col items-center text-center gap-3">
            <GinaCharacter mood="drafting" size="medium" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#1E6B2E]">04 · Redigindo</span>
            <p className="text-xs text-[#061f16]/70 leading-relaxed">
              Digitando no celular. Escreve no tom autêntico da loja, com fatos e carinho, sem promoções forçadas.
            </p>
          </div>

          <div className="card p-6 rounded-[22px] bg-white border border-[#061f16]/8 shadow-xs flex flex-col items-center text-center gap-3">
            <GinaCharacter mood="win_back" size="medium" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#1E6B2E]">05 · Comemoração</span>
            <p className="text-xs text-[#061f16]/70 leading-relaxed">
              Pulo com confetes. Um cliente que estava atrasado voltou a comprar na loja no momento oportuno.
            </p>
          </div>

          <div className="card p-6 rounded-[22px] bg-white border border-[#061f16]/8 shadow-xs flex flex-col items-center text-center gap-3">
            <GinaCharacter mood="quiet_hours" size="medium" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#1E6B2E]">06 · Repouso (Quiet Hours)</span>
            <p className="text-xs text-[#061f16]/70 leading-relaxed">
              Sentada tirando uma soneca. Limite de mensagens atingido, descanso de 90 dias ou após as 21h. Nada é disparado.
            </p>
          </div>
        </div>
      </section>

      {/* Sandbox & Transparency Notice */}
      <section className="bg-[#061f16] text-[#f5f3ed] rounded-[24px] p-8 md:p-10 space-y-4">
        <span className="text-xs font-bold uppercase tracking-widest text-[#7FC453]">Segurança & Ambiente Sandbox</span>
        <h2 className="text-xl md:text-2xl font-bold tracking-tight">
          Ambiente de Simulação Ética e Confiável
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-[#f5f3ed]/80 leading-relaxed">
          <p>
            Nenhuma mensagem real é enviada por este laboratório. Nenhum número de telefone recebe disparos e nenhuma cobrança ou transação bancária é realizada. Trata-se de um ambiente puramente pedagógico desenhado para capacitar humanos e validar agentes antes de irem para produção.
          </p>
          <p>
            Nunca alucinamos taxas de conversão irreais nem garantimos retorno financeiro fictício. Cada diagnóstico baseia-se em fatos matemáticos verificáveis e no respeito inegociável à privacidade e ao consentimento das pessoas.
          </p>
        </div>
      </section>
    </div>
  );
};
