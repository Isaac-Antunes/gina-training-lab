import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Mail,
  MessageCircle,
  MinusCircle,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  UserPlus,
  XCircle,
} from 'lucide-react';
import { analyzeSignups, Decision, FieldStatus, SignupReport } from '../welcome/analyzeSignup';
import { DEMO_SIGNUPS, DEMO_STORE } from '../welcome/demoSignups';

const DECISION_INFO: Record<Decision, { label: string; tone: string; group: string }> = {
  welcome_ready: { label: 'Pronto para boas-vindas', tone: 'bg-[#7FC453]/25 text-[#14502a] border-[#7FC453]/40', group: 'Prontos' },
  welcome_partial: { label: 'Boas-vindas com pendência', tone: 'bg-[#e9efe2] text-[#1E6B2E] border-[#1E6B2E]/15', group: 'Com pendência' },
  merge_first: { label: 'Juntar cadastros antes', tone: 'bg-sky-50 text-sky-900 border-sky-200', group: 'Duplicados' },
  blocked_no_proof: { label: 'Consentimento sem prova', tone: 'bg-amber-50 text-amber-900 border-amber-200', group: 'Bloqueados' },
  blocked_no_channel: { label: 'Sem canal válido', tone: 'bg-amber-50 text-amber-900 border-amber-200', group: 'Bloqueados' },
  do_not_contact: { label: 'Não contatar', tone: 'bg-red-50 text-red-900 border-red-200', group: 'Não contatar' },
};

const FIELD_ICON: Record<FieldStatus, { icon: React.ElementType; tone: string }> = {
  ok: { icon: CheckCircle2, tone: 'text-[#1E6B2E]' },
  warn: { icon: AlertTriangle, tone: 'text-amber-600' },
  missing: { icon: MinusCircle, tone: 'text-[#061f16]/40' },
  invalid: { icon: XCircle, tone: 'text-red-600' },
};

const FIELD_LABEL = { nome: 'Nome', whatsapp: 'WhatsApp', email: 'E-mail', origem: 'Origem' } as const;

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(', ', ' às ');

type Approval = 'approved' | 'discarded';

const ConsentBox: React.FC<{ report: SignupReport }> = ({ report }) => {
  const { consent, signup } = report;
  if (consent.status === 'refused') {
    return (
      <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-[11px] text-red-900 flex gap-2">
        <ShieldX className="w-4 h-4 shrink-0" />
        <span>A caixinha de consentimento não foi marcada.</span>
      </div>
    );
  }
  if (consent.status === 'unproven') {
    return (
      <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-[11px] text-amber-950 flex gap-2">
        <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600" />
        <span>
          Marcado, mas sem prova. Falta: {consent.missing.join(' e ')}. Pela LGPD, cabe à loja provar o consentimento.
        </span>
      </div>
    );
  }
  return (
    <div className="rounded-xl bg-[#f5f3ed] border border-[#061f16]/8 p-3 text-[11px] text-[#061f16]/80 space-y-1.5">
      <p className="flex items-center gap-1.5 font-bold text-[#1E6B2E]">
        <ShieldCheck className="w-4 h-4" /> Consentimento com prova
      </p>
      <p>
        Aceito em {formatDateTime(signup.consent.acceptedAt!)} ·{' '}
        {signup.consent.channels.map((c) => (c === 'whatsapp' ? 'WhatsApp' : 'e-mail')).join(' e ')}
      </p>
      <p className="italic text-[#061f16]/65">“{signup.consent.text}”</p>
    </div>
  );
};

const SignupCard: React.FC<{ report: SignupReport; approval?: Approval; onDecide: (a: Approval) => void }> = ({
  report,
  approval,
  onDecide,
}) => {
  const info = DECISION_INFO[report.decision];
  const ChannelIcon = report.channel === 'email' ? Mail : MessageCircle;

  return (
    <article className="bg-[#ffffff] rounded-[24px] p-5 md:p-6 shadow-xs border border-[#061f16]/8 flex flex-col gap-4">
      <header className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <h3 className={`text-lg font-bold leading-tight ${report.signup.name ? 'text-[#061f16]' : 'text-[#061f16]/50 italic'}`}>
            {report.signup.name || 'Sem nome'}
          </h3>
          <span className={`shrink-0 px-2.5 py-1 rounded-full border text-[11px] font-bold ${info.tone}`}>{info.label}</span>
        </div>
        <p className="text-[11px] text-[#061f16]/60">
          {report.signup.source} · cadastro em {formatDateTime(report.signup.createdAt)}
        </p>
      </header>

      <ul className="grid grid-cols-1 gap-1.5" aria-label="Relatório do cadastro">
        {report.fields.map((f) => {
          const { icon: Icon, tone } = FIELD_ICON[f.status];
          return (
            <li key={f.field} className="flex items-start gap-2 text-xs">
              <Icon className={`w-4 h-4 shrink-0 ${tone}`} aria-hidden />
              <span className="font-semibold text-[#061f16]/80 w-16 shrink-0">{FIELD_LABEL[f.field]}</span>
              <span className="text-[#061f16]/70 break-words min-w-0">{f.note}</span>
            </li>
          );
        })}
      </ul>

      <ConsentBox report={report} />

      {report.pending.length > 0 && (
        <div className="space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#061f16]/55">Para o dono resolver</p>
          <ul className="list-disc pl-4 text-xs text-[#061f16]/75 space-y-0.5">
            {report.pending.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      )}

      {report.draft && (
        <div className="mt-auto space-y-2.5">
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#061f16]/55 flex items-center gap-1.5">
            <ChannelIcon className="w-3.5 h-3.5" /> Rascunho para {report.channel === 'email' ? 'e-mail' : 'WhatsApp'}
          </p>
          <p className="rounded-2xl rounded-tl-sm bg-[#d4efbe]/60 border border-[#7FC453]/30 p-3 text-xs text-[#061f16] leading-relaxed">
            {report.draft}
          </p>
          {approval ? (
            <p className="text-[11px] font-semibold text-[#1E6B2E]" role="status">
              {approval === 'approved'
                ? 'Aprovado pelo dono. Na demonstração, nada é enviado.'
                : 'Descartado. A Gina não envia nada.'}
            </p>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => onDecide('approved')}
                className="flex-1 px-3 py-2 rounded-full bg-[#1E6B2E] hover:bg-[#14502a] text-[#f5f3ed] text-xs font-bold cursor-pointer transition-colors"
              >
                Aprovar
              </button>
              <button
                onClick={() => onDecide('discarded')}
                className="px-3 py-2 rounded-full bg-[#f5f3ed] hover:bg-[#e9efe2] text-[#061f16]/80 border border-[#061f16]/10 text-xs font-bold cursor-pointer transition-colors"
              >
                Descartar
              </button>
            </div>
          )}
        </div>
      )}
    </article>
  );
};

export const WelcomeView: React.FC = () => {
  const reports = useMemo(() => analyzeSignups(DEMO_SIGNUPS, DEMO_STORE), []);
  const [approvals, setApprovals] = useState<Record<string, Approval>>({});

  const summary = useMemo(() => {
    const counts = new Map<string, { group: string; tone: string; count: number }>();
    for (const r of reports) {
      const { group, tone } = DECISION_INFO[r.decision];
      const entry = counts.get(group) || { group, tone, count: 0 };
      entry.count++;
      counts.set(group, entry);
    }
    return [...counts.values()];
  }, [reports]);

  return (
    <div className="max-w-[1360px] mx-auto px-4 md:px-8 py-8 space-y-8 animate-in fade-in duration-300 text-pretty">
      <section className="bg-[#ffffff] rounded-[24px] p-6 md:p-10 shadow-xs border border-[#061f16]/8 space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#1E6B2E]">
          <UserPlus className="w-4 h-4" />
          <span>Boas-vindas com consentimento</span>
        </div>
        <h1 className="font-['Bagel_Fat_One'] text-3xl md:text-5xl text-[#1E6B2E] tracking-tight leading-tight">
          Cadastrou? A Gina recebe.
        </h1>
        <p className="text-sm md:text-base text-[#061f16]/75 max-w-3xl leading-relaxed">
          Cada cadastro novo passa por três checagens: a prova do consentimento (quando, o quê e por qual canal), a qualidade
          dos dados e se a pessoa já existe na base. Quando dá para contatar, a Gina redige a boas-vindas no canal autorizado
          e espera o dono aprovar. Nada é enviado sozinho.
        </p>
        <p className="text-[11px] text-[#061f16]/55">Cadastros fictícios de uma loja sem fluxo de boas-vindas.</p>
      </section>

      <section className="flex flex-wrap gap-2.5" aria-label="Resumo dos cadastros">
        {summary.map(({ group, tone, count }) => (
          <span key={group} className={`px-3.5 py-1.5 rounded-full border text-xs font-bold ${tone}`}>
            {count} · {group}
          </span>
        ))}
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {reports.map((report) => (
          <SignupCard
            key={report.signup.id}
            report={report}
            approval={approvals[report.signup.id]}
            onDecide={(a) => setApprovals((prev) => ({ ...prev, [report.signup.id]: a }))}
          />
        ))}
      </section>
    </div>
  );
};
