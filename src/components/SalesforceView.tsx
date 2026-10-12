import React, { useEffect, useMemo, useState } from 'react';
import { Cloud, Crown, Database, Lock, RefreshCw, ShieldCheck, AlertTriangle } from 'lucide-react';
import { GinaCharacter } from './GinaCharacter';
import type { GinaSalesforceCustomer } from '../integrations/salesforce/toGina';
import type { GinaMood } from '../types/crm';

type Source = 'demo' | 'org';
type Action = GinaSalesforceCustomer['facts']['recommendedAction'];

interface CustomersResponse {
  source: Source;
  referenceDate: string;
  customers: GinaSalesforceCustomer[];
}

const ACTION_INFO: Record<Action, { label: string; tone: string; mood: GinaMood; next: string }> = {
  no_message: {
    label: 'Nenhuma mensagem',
    tone: 'bg-[#e9efe2] text-[#1E6B2E] border-[#1E6B2E]/15',
    mood: 'listening',
    next: 'Silêncio inteligente: o cliente está no ritmo dele.',
  },
  friendly_nudge: {
    label: 'Lembrete amigável',
    tone: 'bg-[#7FC453]/25 text-[#14502a] border-[#7FC453]/40',
    mood: 'drafting',
    next: 'A Gina redige o lembrete; o dono aprova antes de qualquer envio.',
  },
  concierge_human: {
    label: 'Contato humano',
    tone: 'bg-[#1E6B2E] text-[#f5f3ed] border-[#1E6B2E]',
    mood: 'heads_up',
    next: 'Cliente VIP: alguém da loja fala pessoalmente, sem automação.',
  },
  dormancy_rest: {
    label: 'Descanso de 90 dias',
    tone: 'bg-slate-100 text-slate-700 border-slate-200',
    mood: 'quiet_hours',
    next: 'Nenhum envio por 90 dias, para não virar spam nem opt-out.',
  },
  refuse_spam: {
    label: 'Não contatar',
    tone: 'bg-amber-50 text-amber-900 border-amber-200',
    mood: 'heads_up',
    next: 'Bloqueado por consentimento. Nenhuma mensagem, nem para VIP.',
  },
  request_audience: {
    label: 'Pedir público',
    tone: 'bg-amber-50 text-amber-900 border-amber-200',
    mood: 'heads_up',
    next: 'Falta definir o público antes de qualquer ação.',
  },
  reject_invalid: {
    label: 'Dado inválido',
    tone: 'bg-red-50 text-red-900 border-red-200',
    mood: 'heads_up',
    next: 'Corrija o registro na Salesforce antes de decidir.',
  },
};

/** Variações da ação "friendly_nudge" conforme a regra que a disparou. */
const NUDGE_BY_CLASSIFICATION: Partial<Record<GinaSalesforceCustomer['facts']['classification'], { label: string; next: string }>> = {
  new_customer: {
    label: 'Boas-vindas',
    next: 'A Gina redige as boas-vindas; o dono aprova antes de qualquer envio.',
  },
  oneoff_delayed: {
    label: 'Estimular 2ª compra',
    next: 'A Gina sugere um motivo para voltar; o dono aprova antes de qualquer envio.',
  },
};

const actionFor = (customer: GinaSalesforceCustomer) => {
  const base = ACTION_INFO[customer.facts.recommendedAction];
  const nudge = customer.facts.recommendedAction === 'friendly_nudge' && NUDGE_BY_CLASSIFICATION[customer.facts.classification];
  return nudge ? { ...base, ...nudge } : base;
};

const CLASSIFICATION_LABEL: Record<GinaSalesforceCustomer['facts']['classification'], string> = {
  in_rhythm: 'Em ritmo',
  delay: 'Atraso',
  dormant: 'Dormente',
  new_customer: 'Cliente novo',
  oneoff_delayed: 'Compra única em atraso',
  vip_delayed: 'VIP em atraso',
  incomplete_data: 'Dados insuficientes',
  governance_violation: 'Bloqueio de consentimento',
  invalid_input: 'Dado inválido',
};

const CONSENT_INFO = {
  granted: { label: 'Consentimento', tone: 'text-[#1E6B2E]' },
  missing: { label: 'Sem consentimento', tone: 'text-amber-700' },
  revoked: { label: 'Opt-out', tone: 'text-red-700' },
} as const;

const brl = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

const daysBetween = (from: string, to: string) =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000);

const formatDate = (iso: string) => iso.split('-').reverse().join('/');

export const SalesforceView: React.FC = () => {
  const [source, setSource] = useState<Source>('demo');
  const [data, setData] = useState<CustomersResponse | null>(null);
  const [error, setError] = useState<{ code?: string; message: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async (target: Source) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/salesforce/customers?source=${target}`);
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setData(null);
        setError({ code: body.code, message: body.error || `Erro do servidor (${res.status})` });
        return;
      }
      setData(body);
    } catch (err: any) {
      setData(null);
      setError({ message: err?.message || 'Falha ao consultar o servidor.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(source);
  }, [source]);

  const summary = useMemo(() => {
    const counts = new Map<string, { label: string; tone: string; count: number }>();
    for (const c of data?.customers || []) {
      const { label, tone } = actionFor(c);
      const entry = counts.get(label) || { label, tone, count: 0 };
      entry.count++;
      counts.set(label, entry);
    }
    return [...counts.values()];
  }, [data]);

  return (
    <div className="max-w-[1360px] mx-auto px-4 md:px-8 py-8 space-y-8 animate-in fade-in duration-300 text-pretty">
      {/* Cabeçalho */}
      <section className="bg-[#ffffff] rounded-[24px] p-6 md:p-10 shadow-xs border border-[#061f16]/8 flex flex-col md:flex-row md:items-center gap-6">
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#1E6B2E]">
            <Cloud className="w-4 h-4" />
            <span>Gina na Salesforce</span>
          </div>
          <h1 className="font-['Bagel_Fat_One'] text-3xl md:text-5xl text-[#1E6B2E] tracking-tight leading-tight">
            Ela lê o seu CRM.
          </h1>
          <p className="text-sm md:text-base text-[#061f16]/75 max-w-2xl leading-relaxed">
            Contatos e pedidos da Salesforce passam pelas regras do método Gina Intell: ritmo pela mediana, recência, VIP
            pela regra dos terços e consentimento. A Gina só lê e decide. Nada é enviado sem o dono aprovar.
          </p>
        </div>

        <div className="flex flex-col gap-3 md:items-end shrink-0">
          <div className="inline-flex p-1 rounded-full bg-[#e9efe2] border border-[#061f16]/8" role="tablist" aria-label="Origem dos dados">
            {(['demo', 'org'] as Source[]).map((option) => (
              <button
                key={option}
                role="tab"
                aria-selected={source === option}
                onClick={() => setSource(option)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  source === option ? 'bg-[#1E6B2E] text-[#f5f3ed] shadow-xs' : 'text-[#061f16]/70 hover:text-[#1E6B2E]'
                }`}
              >
                {option === 'demo' ? 'Demonstração' : 'Minha org'}
              </button>
            ))}
          </div>
          <button
            onClick={() => load(source)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1E6B2E] hover:text-[#14502a] disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar leitura
          </button>
        </div>
      </section>

      {/* Aviso de origem */}
      {data && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[#061f16]/70">
          <span className="inline-flex items-center gap-1.5 font-semibold">
            <Database className="w-3.5 h-3.5 text-[#1E6B2E]" />
            {data.source === 'demo' ? 'Dados fictícios no formato Contact + Order da Salesforce' : 'Lido da sua org Salesforce'}
          </span>
          <span>Referência: {formatDate(data.referenceDate)}</span>
          <span className="inline-flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5" /> Somente leitura
          </span>
        </div>
      )}

      {/* Erro */}
      {error && (
        <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 text-sm flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-2">
            <strong className="block">
              {error.code === 'salesforce_not_configured' ? 'Sua org ainda não está conectada' : 'Não foi possível ler a Salesforce'}
            </strong>
            <p className="text-xs leading-relaxed">{error.message}</p>
            {error.code === 'salesforce_not_configured' && (
              <button
                onClick={() => setSource('demo')}
                className="text-xs font-bold text-[#1E6B2E] underline underline-offset-2 cursor-pointer"
              >
                Ver a demonstração
              </button>
            )}
          </div>
        </div>
      )}

      {/* Resumo */}
      {data && (
        <section className="flex flex-wrap gap-2.5" aria-label="Resumo das decisões">
          {summary.map(({ label, tone, count }) => (
            <span key={label} className={`px-3.5 py-1.5 rounded-full border text-xs font-bold ${tone}`}>
              {count} · {label}
            </span>
          ))}
        </section>
      )}

      {/* Clientes */}
      {data && (() => {
        // Quem tem pedido vem primeiro: é onde a Gina tem algo a decidir.
        // Contatos sem compra (comuns numa org real) ficam num bloco à parte.
        const buyers = data.customers.filter((c) => c.orderCount > 0);
        const withoutOrders = data.customers.filter((c) => c.orderCount === 0);
        const renderCard = (customer: GinaSalesforceCustomer) => {
            const action = actionFor(customer);
            const consent = CONSENT_INFO[customer.consent];
            const lastOrder = customer.orderDates[customer.orderDates.length - 1];
            const recency = lastOrder ? daysBetween(lastOrder, data.referenceDate) : null;

            return (
              <article
                key={customer.contactId}
                className="bg-[#ffffff] rounded-[22px] p-5 border border-[#061f16]/8 shadow-xs flex flex-col gap-4"
              >
                <header className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-full bg-[#f5f3ed] border border-[#14502a]/10 flex items-center justify-center overflow-hidden shrink-0">
                    <GinaCharacter mood={action.mood} size="mini" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-bold text-[#061f16] flex items-center gap-1.5 truncate">
                      {customer.name}
                      {customer.isVip && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#061f16] text-[#7FC453]">
                          <Crown className="w-3 h-3" /> VIP
                        </span>
                      )}
                    </h2>
                    <p className={`text-[11px] font-semibold ${consent.tone}`}>
                      {consent.label} <span className="font-normal text-[#061f16]/50">· {customer.consentSource}</span>
                    </p>
                  </div>
                </header>

                <dl className="grid grid-cols-4 gap-2 text-center">
                  {[
                    ['Pedidos', String(customer.orderCount)],
                    ['Gasto', brl(customer.totalSpending)],
                    ['Ritmo', customer.facts.medianIntervalDays ? `${customer.facts.medianIntervalDays}d` : '—'],
                    ['Última', recency !== null ? `${recency}d` : '—'],
                  ].map(([term, value]) => (
                    <div key={term} className="rounded-xl bg-[#f5f3ed] py-2">
                      <dt className="text-[10px] uppercase tracking-wider text-[#061f16]/55 font-semibold">{term}</dt>
                      <dd className="text-sm font-bold text-[#061f16]">{value}</dd>
                    </div>
                  ))}
                </dl>

                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-3 py-1 rounded-full border text-xs font-bold ${action.tone}`}>{action.label}</span>
                    <span className="text-[11px] font-semibold text-[#061f16]/60">
                      {CLASSIFICATION_LABEL[customer.facts.classification]}
                      {customer.facts.ratio !== null && ` · ${customer.facts.ratio}x o ritmo`}
                    </span>
                  </div>
                  <p className="text-xs text-[#061f16]/75 leading-relaxed">{customer.facts.explanation}</p>
                </div>

                <p className="mt-auto pt-3 border-t border-[#061f16]/8 text-[11px] text-[#061f16]/70 flex items-start gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#1E6B2E] shrink-0 mt-px" />
                  <span>{action.next}</span>
                </p>
              </article>
            );
        };

        return (
          <>
            {buyers.length > 0 && (
              <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">{buyers.map(renderCard)}</section>
            )}
            {withoutOrders.length > 0 && (
              <section className="space-y-4" aria-label="Contatos sem pedidos">
                <h2 className="text-xs font-bold uppercase tracking-widest text-[#061f16]/60">
                  Sem pedidos registrados · {withoutOrders.length}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">{withoutOrders.map(renderCard)}</div>
              </section>
            )}
          </>
        );
      })()}

      {loading && !data && <p className="text-sm text-[#061f16]/60">Lendo a Salesforce…</p>}
    </div>
  );
};
