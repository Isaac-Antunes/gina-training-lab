import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Mail,
  MessageCircle,
  MinusCircle,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  UserPlus,
  XCircle,
} from 'lucide-react';
import { analyzeSignups, Decision, FieldStatus, Lang, SignupReport } from '../welcome/analyzeSignup';
import { getDemoSignups } from '../welcome/demoSignups';

const DECISION_TONE: Record<Decision, string> = {
  welcome_ready: 'bg-[#7FC453]/25 text-[#14502a] border-[#7FC453]/40',
  welcome_partial: 'bg-[#e9efe2] text-[#1E6B2E] border-[#1E6B2E]/15',
  merge_first: 'bg-sky-50 text-sky-900 border-sky-200',
  blocked_no_proof: 'bg-amber-50 text-amber-900 border-amber-200',
  blocked_no_channel: 'bg-amber-50 text-amber-900 border-amber-200',
  do_not_contact: 'bg-red-50 text-red-900 border-red-200',
};

const TEXT = {
  pt: {
    decision: {
      welcome_ready: ['Pronto para boas-vindas', 'Prontos'],
      welcome_partial: ['Boas-vindas com pendência', 'Com pendência'],
      merge_first: ['Juntar cadastros antes', 'Duplicados'],
      blocked_no_proof: ['Consentimento sem prova', 'Bloqueados'],
      blocked_no_channel: ['Sem canal válido', 'Bloqueados'],
      do_not_contact: ['Não contatar', 'Não contatar'],
    } as Record<Decision, [string, string]>,
    field: { nome: 'Nome', whatsapp: 'WhatsApp', email: 'E-mail', origem: 'Origem' },
    locale: 'pt-BR',
    at: ' às ',
    noName: 'Sem nome',
    signedUp: 'cadastro em',
    report: 'Relatório do cadastro',
    refused: 'A caixinha de consentimento não foi marcada.',
    unproven: (missing: string) => `Marcado, mas sem prova. Falta: ${missing}. Pela LGPD, cabe à loja provar o consentimento.`,
    and: ' e ',
    proven: 'Consentimento com prova',
    acceptedAt: 'Aceito em',
    channels: { whatsapp: 'WhatsApp', email: 'e-mail' },
    pending: 'Para o dono resolver',
    draftFor: (channel: string) => `Rascunho para ${channel}`,
    approved: 'Aprovado pelo dono. Na demonstração, nada é enviado.',
    discarded: 'Descartado. A Gina não envia nada.',
    approve: 'Aprovar',
    discard: 'Descartar',
    channelNote: {
      whatsapp: 'Template de marketing do WhatsApp: precisa de aprovação da Meta antes do primeiro uso, e cada envio é cobrado.',
      email: 'E-mail de marketing: sempre com link de descadastro, de preferência de um clique, como Gmail e Yahoo exigem de quem envia em massa.',
    },
    eyebrow: 'Boas-vindas com consentimento',
    title: 'Cadastrou? A Gina recebe.',
    intro:
      'Cada cadastro novo passa por três checagens: a prova do consentimento (quando, o quê e por qual canal), a qualidade dos dados e se a pessoa já existe na base. Quando dá para contatar, a Gina redige a boas-vindas no canal autorizado e espera o dono aprovar. Nada é enviado sozinho.',
    fictional: 'Cadastros fictícios de uma loja sem fluxo de boas-vindas.',
    summary: 'Resumo dos cadastros',
  },
  en: {
    decision: {
      welcome_ready: ['Ready for a welcome', 'Ready'],
      welcome_partial: ['Welcome with to-dos', 'With to-dos'],
      merge_first: ['Merge records first', 'Duplicates'],
      blocked_no_proof: ['Consent without proof', 'Blocked'],
      blocked_no_channel: ['No valid channel', 'Blocked'],
      do_not_contact: ["Don't contact", "Don't contact"],
    } as Record<Decision, [string, string]>,
    field: { nome: 'Name', whatsapp: 'WhatsApp', email: 'Email', origem: 'Source' },
    locale: 'en-US',
    at: ' at ',
    noName: 'No name',
    signedUp: 'signed up',
    report: 'Signup report',
    refused: "The consent box wasn't checked.",
    unproven: (missing: string) => `Checked, but no proof. Missing: ${missing}. Under Brazil's privacy law (LGPD), the shop has to prove consent.`,
    and: ' and ',
    proven: 'Consent with proof',
    acceptedAt: 'Opted in',
    channels: { whatsapp: 'WhatsApp', email: 'email' },
    pending: 'For the owner to handle',
    draftFor: (channel: string) => `Draft for ${channel}`,
    approved: "Approved by the owner. In the demo, nothing's sent.",
    discarded: "Discarded. Gina doesn't send anything.",
    approve: 'Approve',
    discard: 'Discard',
    channelNote: {
      whatsapp: 'WhatsApp marketing template: it needs Meta approval before first use, and every send is billed.',
      email: 'Marketing email: always include an unsubscribe link, ideally one-click, which Gmail and Yahoo require from bulk senders.',
    },
    eyebrow: 'Welcome with consent',
    title: 'Signed up? Gina says hi.',
    intro:
      "Every new signup goes through three checks: proof of consent (when, what and on which channel), data quality, and whether the person's already in your list. When it's OK to reach out, Gina drafts the welcome on the allowed channel and waits for the owner's approval. Nothing goes out on its own.",
    fictional: "Made-up signups from a shop that doesn't have a welcome flow yet.",
    summary: 'Signup summary',
  },
};

type Text = (typeof TEXT)[Lang];

const FIELD_ICON: Record<FieldStatus, { icon: React.ElementType; tone: string }> = {
  ok: { icon: CheckCircle2, tone: 'text-[#1E6B2E]' },
  warn: { icon: AlertTriangle, tone: 'text-amber-600' },
  missing: { icon: MinusCircle, tone: 'text-[#061f16]/40' },
  invalid: { icon: XCircle, tone: 'text-red-600' },
};

const formatDateTime = (iso: string, t: Text) =>
  new Date(iso)
    .toLocaleString(t.locale, { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    .replace(', ', t.at);

type Approval = 'approved' | 'discarded';

const ConsentBox: React.FC<{ report: SignupReport; t: Text }> = ({ report, t }) => {
  const { consent, signup } = report;
  if (consent.status === 'refused') {
    return (
      <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-[11px] text-red-900 flex gap-2">
        <ShieldX className="w-4 h-4 shrink-0" />
        <span>{t.refused}</span>
      </div>
    );
  }
  if (consent.status === 'unproven') {
    return (
      <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-[11px] text-amber-950 flex gap-2">
        <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600" />
        <span>{t.unproven(consent.missing.join(t.and))}</span>
      </div>
    );
  }
  return (
    <div className="rounded-xl bg-[#f5f3ed] border border-[#061f16]/8 p-3 text-[11px] text-[#061f16]/80 space-y-1.5">
      <p className="flex items-center gap-1.5 font-bold text-[#1E6B2E]">
        <ShieldCheck className="w-4 h-4" /> {t.proven}
      </p>
      <p>
        {t.acceptedAt} {formatDateTime(signup.consent.acceptedAt!, t)} ·{' '}
        {signup.consent.channels.map((c) => t.channels[c]).join(t.and)}
      </p>
      <p className="italic text-[#061f16]/65">“{signup.consent.text}”</p>
    </div>
  );
};

const SignupCard: React.FC<{ report: SignupReport; t: Text; approval?: Approval; onDecide: (a: Approval) => void }> = ({
  report,
  t,
  approval,
  onDecide,
}) => {
  const [label] = t.decision[report.decision];
  const ChannelIcon = report.channel === 'email' ? Mail : MessageCircle;

  return (
    <article className="bg-[#ffffff] rounded-[24px] p-5 md:p-6 shadow-xs border border-[#061f16]/8 flex flex-col gap-4">
      <header className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <h3 className={`text-lg font-bold leading-tight ${report.signup.name ? 'text-[#061f16]' : 'text-[#061f16]/50 italic'}`}>
            {report.signup.name || t.noName}
          </h3>
          <span className={`shrink-0 px-2.5 py-1 rounded-full border text-[11px] font-bold ${DECISION_TONE[report.decision]}`}>{label}</span>
        </div>
        <p className="text-[11px] text-[#061f16]/60">
          {report.signup.source} · {t.signedUp} {formatDateTime(report.signup.createdAt, t)}
        </p>
      </header>

      <ul className="grid grid-cols-1 gap-1.5" aria-label={t.report}>
        {report.fields.map((f) => {
          const { icon: Icon, tone } = FIELD_ICON[f.status];
          return (
            <li key={f.field} className="flex items-start gap-2 text-xs">
              <Icon className={`w-4 h-4 shrink-0 ${tone}`} aria-hidden />
              <span className="font-semibold text-[#061f16]/80 w-16 shrink-0">{t.field[f.field]}</span>
              <span className="text-[#061f16]/70 break-words min-w-0">{f.note}</span>
            </li>
          );
        })}
      </ul>

      <ConsentBox report={report} t={t} />

      {report.pending.length > 0 && (
        <div className="space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#061f16]/55">{t.pending}</p>
          <ul className="list-disc pl-4 text-xs text-[#061f16]/75 space-y-0.5">
            {report.pending.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      )}

      {report.draft && report.channel && (
        <div className="mt-auto space-y-2.5">
          <p className="text-[11px] font-bold uppercase tracking-widest text-[#061f16]/55 flex items-center gap-1.5">
            <ChannelIcon className="w-3.5 h-3.5" /> {t.draftFor(t.channels[report.channel])}
          </p>
          <p className="rounded-2xl rounded-tl-sm bg-[#d4efbe]/60 border border-[#7FC453]/30 p-3 text-xs text-[#061f16] leading-relaxed">
            {report.draft}
          </p>
          <p className="flex items-start gap-1.5 text-[11px] text-[#061f16]/60 leading-snug">
            <Info className="w-3.5 h-3.5 shrink-0 mt-px" aria-hidden /> {t.channelNote[report.channel]}
          </p>
          {approval ? (
            <p className="text-[11px] font-semibold text-[#1E6B2E]" role="status">
              {approval === 'approved' ? t.approved : t.discarded}
            </p>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => onDecide('approved')}
                className="flex-1 px-3 py-2 rounded-full bg-[#1E6B2E] hover:bg-[#14502a] text-[#f5f3ed] text-xs font-bold cursor-pointer transition-colors"
              >
                {t.approve}
              </button>
              <button
                onClick={() => onDecide('discarded')}
                className="px-3 py-2 rounded-full bg-[#f5f3ed] hover:bg-[#e9efe2] text-[#061f16]/80 border border-[#061f16]/10 text-xs font-bold cursor-pointer transition-colors"
              >
                {t.discard}
              </button>
            </div>
          )}
        </div>
      )}
    </article>
  );
};

export const WelcomeView: React.FC<{ lang?: Lang }> = ({ lang = 'pt' }) => {
  const t = TEXT[lang];
  const reports = useMemo(() => {
    const { store, signups } = getDemoSignups(lang);
    return analyzeSignups(signups, store, lang);
  }, [lang]);
  const [approvals, setApprovals] = useState<Record<string, Approval>>({});

  const summary = useMemo(() => {
    const counts = new Map<string, { group: string; tone: string; count: number }>();
    for (const r of reports) {
      const [, group] = t.decision[r.decision];
      const entry = counts.get(group) || { group, tone: DECISION_TONE[r.decision], count: 0 };
      entry.count++;
      counts.set(group, entry);
    }
    return [...counts.values()];
  }, [reports, t]);

  return (
    <div className="max-w-[1360px] mx-auto px-4 md:px-8 py-8 space-y-8 animate-in fade-in duration-300 text-pretty">
      <section className="bg-[#ffffff] rounded-[24px] p-6 md:p-10 shadow-xs border border-[#061f16]/8 space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#1E6B2E]">
          <UserPlus className="w-4 h-4" />
          <span>{t.eyebrow}</span>
        </div>
        <h1 className="font-['Bagel_Fat_One'] text-3xl md:text-5xl text-[#1E6B2E] tracking-tight leading-tight">{t.title}</h1>
        <p className="text-sm md:text-base text-[#061f16]/75 max-w-3xl leading-relaxed">{t.intro}</p>
        <p className="text-[11px] text-[#061f16]/55">{t.fictional}</p>
      </section>

      <section className="flex flex-wrap gap-2.5" aria-label={t.summary}>
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
            t={t}
            approval={approvals[report.signup.id]}
            onDecide={(a) => setApprovals((prev) => ({ ...prev, [report.signup.id]: a }))}
          />
        ))}
      </section>
    </div>
  );
};
