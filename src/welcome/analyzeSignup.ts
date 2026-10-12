/**
 * Boas-vindas com consentimento: lê um cadastro novo, confere a prova de
 * consentimento (LGPD), avalia a qualidade dos dados e decide o que fazer.
 * Regras determinísticas, sem IA: o mesmo cadastro dá sempre o mesmo resultado.
 */

export type Channel = 'whatsapp' | 'email';

export interface Signup {
  id: string;
  name?: string;
  whatsapp?: string;
  email?: string;
  /** De onde veio o cadastro (formulário do site, Instagram, balcão…). */
  source: string;
  createdAt: string;
  consent: {
    /** A caixinha de consentimento foi marcada. */
    checked: boolean;
    /** Canais que a pessoa autorizou. */
    channels: Channel[];
    /** Quando aceitou. Sem isso, não há como provar o consentimento. */
    acceptedAt?: string;
    /** O texto que a pessoa aceitou. Sem isso, também não há prova. */
    text?: string;
  };
}

export type FieldStatus = 'ok' | 'warn' | 'missing' | 'invalid';

export interface FieldCheck {
  field: 'nome' | 'whatsapp' | 'email' | 'origem';
  status: FieldStatus;
  note: string;
}

export type Decision = 'welcome_ready' | 'welcome_partial' | 'merge_first' | 'blocked_no_proof' | 'blocked_no_channel' | 'do_not_contact';

export interface SignupReport {
  signup: Signup;
  fields: FieldCheck[];
  consent: { status: 'proven' | 'unproven' | 'refused'; missing: string[] };
  duplicateOf?: string;
  decision: Decision;
  channel: Channel | null;
  /** Pendências para o dono resolver, em linguagem direta. */
  pending: string[];
  /** Rascunho da boas-vindas. Só existe quando dá para contatar. */
  draft: string | null;
}

const digits = (value = '') => value.replace(/\D/g, '');

/** Celular brasileiro: DDD + 9 dígitos começando em 9 (aceita +55 na frente). */
export function normalizeWhatsapp(value?: string): string | null {
  let d = digits(value);
  if (d.length === 13 && d.startsWith('55')) d = d.slice(2);
  return d.length === 11 && d[2] === '9' ? d : null;
}

export const isValidEmail = (value?: string) => !!value && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());

const capitalize = (word: string) => word.charAt(0).toLocaleUpperCase('pt-BR') + word.slice(1).toLocaleLowerCase('pt-BR');

function checkName(name?: string): { check: FieldCheck; firstName: string | null } {
  const clean = (name || '').trim().replace(/\s+/g, ' ');
  if (!clean) return { check: { field: 'nome', status: 'missing', note: 'Sem nome: a boas-vindas usa uma saudação neutra.' }, firstName: null };
  const firstName = capitalize(clean.split(' ')[0]);
  if (clean === clean.toLocaleUpperCase('pt-BR') && /[A-ZÀ-Ý]/.test(clean)) {
    return { check: { field: 'nome', status: 'warn', note: 'Nome todo em maiúsculas: ajuste no cadastro.' }, firstName };
  }
  if (!clean.includes(' ')) {
    return { check: { field: 'nome', status: 'warn', note: 'Só o primeiro nome.' }, firstName };
  }
  return { check: { field: 'nome', status: 'ok', note: clean }, firstName };
}

function sameContact(a: Signup, b: Signup) {
  const wa = normalizeWhatsapp(a.whatsapp);
  const email = isValidEmail(a.email) ? a.email!.trim().toLowerCase() : null;
  return (!!wa && wa === normalizeWhatsapp(b.whatsapp)) || (!!email && email === b.email?.trim().toLowerCase());
}

const CHANNEL_LABEL: Record<Channel, string> = { whatsapp: 'WhatsApp', email: 'e-mail' };

export function buildWelcomeDraft(firstName: string | null, storeName: string): string {
  const greeting = firstName ? `Oi, ${firstName}!` : 'Oi! Que bom ter você aqui.';
  const thanks = firstName ? ` Que bom ter você com a gente na ${storeName}.` : ` Obrigada por se cadastrar na ${storeName}.`;
  return `${greeting}${thanks} Sempre que chegar novidade do seu jeito, eu te aviso por aqui. Se preferir não receber mensagens, é só responder SAIR.`;
}

/**
 * Analisa um cadastro. `allSignups` serve para achar duplicados: o cadastro
 * mais novo de uma mesma pessoa espera a junção antes de qualquer envio.
 */
export function analyzeSignup(signup: Signup, allSignups: Signup[], storeName: string): SignupReport {
  const pending: string[] = [];
  const { check: nameCheck, firstName } = checkName(signup.name);

  const wa = normalizeWhatsapp(signup.whatsapp);
  const waCheck: FieldCheck = !signup.whatsapp
    ? { field: 'whatsapp', status: 'missing', note: 'Sem WhatsApp.' }
    : wa
      ? { field: 'whatsapp', status: 'ok', note: `(${wa.slice(0, 2)}) ${wa.slice(2, 7)}-${wa.slice(7)}` }
      : { field: 'whatsapp', status: 'invalid', note: 'Número incompleto ou sem DDD.' };

  const emailCheck: FieldCheck = !signup.email
    ? { field: 'email', status: 'missing', note: 'Sem e-mail.' }
    : isValidEmail(signup.email)
      ? { field: 'email', status: 'ok', note: signup.email.trim() }
      : { field: 'email', status: 'invalid', note: 'E-mail com formato inválido.' };

  const sourceCheck: FieldCheck = signup.source?.trim()
    ? { field: 'origem', status: 'ok', note: signup.source.trim() }
    : { field: 'origem', status: 'missing', note: 'Origem desconhecida.' };

  const fields = [nameCheck, waCheck, emailCheck, sourceCheck];

  // Consentimento: marcado não basta, precisa de prova (quando e o quê).
  const missingProof: string[] = [];
  if (signup.consent.checked) {
    if (!signup.consent.acceptedAt) missingProof.push('data e hora do aceite');
    if (!signup.consent.text?.trim()) missingProof.push('texto que a pessoa aceitou');
    if (!signup.consent.channels.length) missingProof.push('canais autorizados');
  }
  const consent: SignupReport['consent'] = !signup.consent.checked
    ? { status: 'refused', missing: [] }
    : { status: missingProof.length ? 'unproven' : 'proven', missing: missingProof };

  const duplicate = allSignups.find(
    (other) => other.id !== signup.id && other.createdAt < signup.createdAt && sameContact(signup, other)
  );

  const report = (decision: Decision, channel: Channel | null, draft: string | null): SignupReport => ({
    signup,
    fields,
    consent,
    duplicateOf: duplicate?.id,
    decision,
    channel,
    pending,
    draft,
  });

  if (consent.status === 'refused') {
    pending.push('A pessoa não marcou o consentimento: não contatar.');
    return report('do_not_contact', null, null);
  }
  if (consent.status === 'unproven') {
    pending.push(`Consentimento sem prova: falta ${missingProof.join(' e ')}. Ajuste o formulário para registrar isso.`);
    return report('blocked_no_proof', null, null);
  }
  if (duplicate) {
    pending.push(`Mesma pessoa de outro cadastro (${duplicate.source}): junte os dois antes de qualquer envio.`);
    return report('merge_first', null, null);
  }

  // Só canal autorizado E com contato válido. WhatsApp primeiro, se a pessoa permitiu.
  const usable: Channel[] = signup.consent.channels.filter((c) => (c === 'whatsapp' ? !!wa : isValidEmail(signup.email)));
  const channel = usable[0] ?? null;
  for (const c of signup.consent.channels) {
    if (usable.includes(c)) continue;
    const check = c === 'whatsapp' ? waCheck : emailCheck;
    pending.push(`Autorizou ${CHANNEL_LABEL[c]}, mas o contato está ${check.status === 'missing' ? 'vazio' : 'inválido'}: corrigir.`);
  }
  if (!channel) return report('blocked_no_channel', null, null);

  if (nameCheck.status !== 'ok') pending.push(nameCheck.note);
  const decision: Decision = pending.length ? 'welcome_partial' : 'welcome_ready';
  return report(decision, channel, buildWelcomeDraft(firstName, storeName));
}

export const analyzeSignups = (signups: Signup[], storeName: string) =>
  signups.map((signup) => analyzeSignup(signup, signups, storeName));
