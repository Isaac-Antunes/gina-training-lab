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


export type Lang = 'pt' | 'en';

/** Todas as frases da regra, nas duas línguas. A lógica é uma só. */
const MSG = {
  pt: {
    noName: 'Sem nome: a boas-vindas usa uma saudação neutra.',
    allCaps: 'Nome todo em maiúsculas: ajuste no cadastro.',
    firstNameOnly: 'Só o primeiro nome.',
    noWhatsapp: 'Sem WhatsApp.',
    badWhatsapp: 'Número incompleto ou sem DDD.',
    noEmail: 'Sem e-mail.',
    badEmail: 'E-mail com formato inválido.',
    noSource: 'Origem desconhecida.',
    proofDate: 'data e hora do aceite',
    proofText: 'texto que a pessoa aceitou',
    proofChannels: 'canais autorizados',
    and: ' e ',
    refused: 'A pessoa não marcou o consentimento: não contatar.',
    unproven: (missing: string) => `Consentimento sem prova: falta ${missing}. Ajuste o formulário para registrar isso.`,
    duplicate: (source: string) => `Mesma pessoa de outro cadastro (${source}): junte os dois antes de qualquer envio.`,
    channel: { whatsapp: 'WhatsApp', email: 'e-mail' } as Record<Channel, string>,
    badChannel: (channel: string, empty: boolean) =>
      `Autorizou ${channel}, mas o contato está ${empty ? 'vazio' : 'inválido'}: corrigir.`,
    askName: 'Peça o nome no primeiro contato e complete o cadastro.',
    fixCaps: 'Corrija o nome no cadastro (está todo em maiúsculas).',
    hiName: (name: string) => `Oi, ${name}!`,
    hiNeutral: 'Oi! Que bom ter você aqui.',
    thanksName: (store: string) => ` Que bom ter você com a gente na ${store}.`,
    thanksNeutral: (store: string) => ` Obrigada por se cadastrar na ${store}.`,
    news: 'Sempre que chegar novidade do seu jeito, eu te aviso por aqui.',
    optOutWhatsapp: 'Se preferir não receber mensagens, é só responder SAIR.',
    optOutEmail: 'Se preferir não receber nossos e-mails, use o link de descadastro no fim desta mensagem.',
  },
  en: {
    noName: 'No name: the welcome uses a neutral greeting.',
    allCaps: 'Name is all caps: fix it in the record.',
    firstNameOnly: 'First name only.',
    noWhatsapp: 'No WhatsApp.',
    badWhatsapp: 'Incomplete number or missing area code.',
    noEmail: 'No email.',
    badEmail: 'Invalid email format.',
    noSource: 'Unknown source.',
    proofDate: 'date and time of opt-in',
    proofText: 'the text they agreed to',
    proofChannels: 'authorized channels',
    and: ' and ',
    refused: "They didn't check the consent box: don't contact.",
    unproven: (missing: string) => `Consent without proof: missing ${missing}. Update the form so it records this.`,
    duplicate: (source: string) => `Same person as another signup (${source}): merge them before sending anything.`,
    channel: { whatsapp: 'WhatsApp', email: 'email' } as Record<Channel, string>,
    badChannel: (channel: string, empty: boolean) =>
      `They allowed ${channel}, but the contact is ${empty ? 'empty' : 'invalid'}: fix it.`,
    askName: 'Ask for their name on first contact and complete the record.',
    fixCaps: "Fix the name in the record (it's all caps).",
    hiName: (name: string) => `Hi, ${name}!`,
    hiNeutral: "Hi! So glad you're here.",
    thanksName: (store: string) => ` So glad to have you at ${store}.`,
    thanksNeutral: (store: string) => ` Thanks for signing up at ${store}.`,
    news: "Whenever something new drops that's your style, I'll give you a ping here.",
    optOutWhatsapp: 'Rather not get messages? Just reply STOP.',
    optOutEmail: "Rather not get our emails? Use the unsubscribe link at the bottom of this message.",
  },
};

const capitalize = (word: string) => word.charAt(0).toLocaleUpperCase('pt-BR') + word.slice(1).toLocaleLowerCase('pt-BR');

type NameIssue = 'missing' | 'caps' | 'first_only' | null;

function checkName(name: string | undefined, m: (typeof MSG)[Lang]): { check: FieldCheck; firstName: string | null; issue: NameIssue } {
  const clean = (name || '').trim().replace(/\s+/g, ' ');
  if (!clean) return { check: { field: 'nome', status: 'missing', note: m.noName }, firstName: null, issue: 'missing' };
  const firstName = capitalize(clean.split(' ')[0]);
  if (clean === clean.toLocaleUpperCase('pt-BR') && /[A-ZÀ-Ý]/.test(clean)) {
    return { check: { field: 'nome', status: 'warn', note: m.allCaps }, firstName, issue: 'caps' };
  }
  if (!clean.includes(' ')) {
    return { check: { field: 'nome', status: 'warn', note: m.firstNameOnly }, firstName, issue: 'first_only' };
  }
  return { check: { field: 'nome', status: 'ok', note: clean }, firstName, issue: null };
}

function sameContact(a: Signup, b: Signup) {
  const wa = normalizeWhatsapp(a.whatsapp);
  const email = isValidEmail(a.email) ? a.email!.trim().toLowerCase() : null;
  return (!!wa && wa === normalizeWhatsapp(b.whatsapp)) || (!!email && email === b.email?.trim().toLowerCase());
}

export function buildWelcomeDraft(firstName: string | null, storeName: string, channel: Channel, lang: Lang = 'pt'): string {
  const m = MSG[lang];
  const greeting = firstName ? m.hiName(firstName) : m.hiNeutral;
  const thanks = firstName ? m.thanksName(storeName) : m.thanksNeutral(storeName);
  // Cada canal tem o seu jeito de sair: resposta no WhatsApp, link no e-mail.
  const optOut = channel === 'whatsapp' ? m.optOutWhatsapp : m.optOutEmail;
  return `${greeting}${thanks} ${m.news} ${optOut}`;
}

/**
 * Analisa um cadastro. `allSignups` serve para achar duplicados: o cadastro
 * mais novo de uma mesma pessoa espera a junção antes de qualquer envio.
 */
export function analyzeSignup(signup: Signup, allSignups: Signup[], storeName: string, lang: Lang = 'pt'): SignupReport {
  const m = MSG[lang];
  const pending: string[] = [];
  const { check: nameCheck, firstName, issue: nameIssue } = checkName(signup.name, m);

  const wa = normalizeWhatsapp(signup.whatsapp);
  const waCheck: FieldCheck = !signup.whatsapp
    ? { field: 'whatsapp', status: 'missing', note: m.noWhatsapp }
    : wa
      ? { field: 'whatsapp', status: 'ok', note: `(${wa.slice(0, 2)}) ${wa.slice(2, 7)}-${wa.slice(7)}` }
      : { field: 'whatsapp', status: 'invalid', note: m.badWhatsapp };

  const emailCheck: FieldCheck = !signup.email
    ? { field: 'email', status: 'missing', note: m.noEmail }
    : isValidEmail(signup.email)
      ? { field: 'email', status: 'ok', note: signup.email.trim() }
      : { field: 'email', status: 'invalid', note: m.badEmail };

  const sourceCheck: FieldCheck = signup.source?.trim()
    ? { field: 'origem', status: 'ok', note: signup.source.trim() }
    : { field: 'origem', status: 'missing', note: m.noSource };

  const fields = [nameCheck, waCheck, emailCheck, sourceCheck];

  // Consentimento: marcado não basta, precisa de prova (quando e o quê).
  const missingProof: string[] = [];
  if (signup.consent.checked) {
    if (!signup.consent.acceptedAt) missingProof.push(m.proofDate);
    if (!signup.consent.text?.trim()) missingProof.push(m.proofText);
    if (!signup.consent.channels.length) missingProof.push(m.proofChannels);
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
    pending.push(m.refused);
    return report('do_not_contact', null, null);
  }
  if (consent.status === 'unproven') {
    pending.push(m.unproven(missingProof.join(m.and)));
    return report('blocked_no_proof', null, null);
  }
  if (duplicate) {
    pending.push(m.duplicate(duplicate.source));
    return report('merge_first', null, null);
  }

  // Só canal autorizado E com contato válido. WhatsApp primeiro, se a pessoa permitiu.
  const usable: Channel[] = signup.consent.channels.filter((c) => (c === 'whatsapp' ? !!wa : isValidEmail(signup.email)));
  const channel = usable[0] ?? null;
  for (const c of signup.consent.channels) {
    if (usable.includes(c)) continue;
    const check = c === 'whatsapp' ? waCheck : emailCheck;
    pending.push(m.badChannel(m.channel[c], check.status === 'missing'));
  }
  if (!channel) return report('blocked_no_channel', null, null);

  // O que o dono faz com o nome; o relatório já diz o que está errado.
  if (nameIssue === 'missing') pending.push(m.askName);
  if (nameIssue === 'caps') pending.push(m.fixCaps);
  const decision: Decision = pending.length ? 'welcome_partial' : 'welcome_ready';
  return report(decision, channel, buildWelcomeDraft(firstName, storeName, channel, lang));
}

export const analyzeSignups = (signups: Signup[], storeName: string, lang: Lang = 'pt') =>
  signups.map((signup) => analyzeSignup(signup, signups, storeName, lang));
