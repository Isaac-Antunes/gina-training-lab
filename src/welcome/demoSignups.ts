import type { Signup } from './analyzeSignup';

/**
 * Cadastros fictícios de uma loja sem fluxo de boas-vindas. Um caso para cada
 * situação que a Gina precisa reconhecer. Nenhum dado real.
 */
export const DEMO_STORE = 'Loja Demo';

const CONSENT_TEXT =
  'Aceito receber novidades e ofertas da Loja Demo pelos canais marcados. Posso cancelar quando quiser.';

export const DEMO_SIGNUPS: Signup[] = [
  {
    id: 'cad-01',
    name: 'Camila Andrade',
    whatsapp: '(11) 98765-4321',
    email: 'camila.andrade@exemplo.com',
    source: 'Formulário do site',
    createdAt: '2026-10-09T10:12:00-03:00',
    consent: { checked: true, channels: ['whatsapp', 'email'], acceptedAt: '2026-10-09T10:12:00-03:00', text: CONSENT_TEXT },
  },
  {
    id: 'cad-02',
    whatsapp: '+55 21 99876-1234',
    source: 'QR code no balcão',
    createdAt: '2026-10-09T13:40:00-03:00',
    consent: { checked: true, channels: ['whatsapp'], acceptedAt: '2026-10-09T13:40:00-03:00', text: CONSENT_TEXT },
  },
  {
    id: 'cad-03',
    name: 'Diego Martins',
    whatsapp: '98765-12',
    email: 'diego.martins@exemplo.com',
    source: 'Formulário do site',
    createdAt: '2026-10-09T16:05:00-03:00',
    consent: { checked: true, channels: ['whatsapp', 'email'], acceptedAt: '2026-10-09T16:05:00-03:00', text: CONSENT_TEXT },
  },
  {
    // Importado de uma planilha antiga: alguém marcou "sim", mas não há registro de quando nem do quê.
    id: 'cad-04',
    name: 'Larissa Prado',
    whatsapp: '(31) 99123-4567',
    email: 'larissa.prado@exemplo.com',
    source: 'Planilha antiga da loja',
    createdAt: '2026-10-10T09:00:00-03:00',
    consent: { checked: true, channels: ['whatsapp'] },
  },
  {
    id: 'cad-05',
    name: 'Thiago Nunes',
    whatsapp: '(11) 97654-3210',
    email: 'thiago.nunes@exemplo.com',
    source: 'Formulário do site',
    createdAt: '2026-10-10T11:20:00-03:00',
    consent: { checked: false, channels: [] },
  },
  {
    // A Camila de novo, agora pelo Instagram e com o nome em maiúsculas.
    id: 'cad-06',
    name: 'CAMILA ANDRADE',
    whatsapp: '11987654321',
    source: 'Link da bio do Instagram',
    createdAt: '2026-10-10T14:30:00-03:00',
    consent: { checked: true, channels: ['whatsapp'], acceptedAt: '2026-10-10T14:30:00-03:00', text: CONSENT_TEXT },
  },
];

const EN_SOURCE: Record<string, string> = {
  'Formulário do site': 'Website form',
  'QR code no balcão': 'QR code at the counter',
  'Planilha antiga da loja': "The shop's old spreadsheet",
  'Link da bio do Instagram': 'Instagram bio link',
};

const EN_CONSENT_TEXT = 'I agree to get news and offers from Demo Shop on the channels I checked. I can opt out anytime.';

/** Os mesmos cadastros, com origem, texto aceito e loja na língua da vitrine. */
export function getDemoSignups(lang: 'pt' | 'en'): { store: string; signups: Signup[] } {
  if (lang === 'pt') return { store: DEMO_STORE, signups: DEMO_SIGNUPS };
  return {
    store: 'Demo Shop',
    signups: DEMO_SIGNUPS.map((s) => ({
      ...s,
      source: EN_SOURCE[s.source] ?? s.source,
      consent: { ...s.consent, text: s.consent.text ? EN_CONSENT_TEXT : undefined },
    })),
  };
}
