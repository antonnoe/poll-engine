import type { PollQuestion, KeuzeConfig, SchaalConfig, AnswerValue } from './types';

export interface ValidationResult {
  ok: boolean;
  error?: string;
  // genormaliseerde, op te slaan answers (postcode wordt elders server-side afgeleid)
}

// Valideert één antwoord tegen zijn vraag. Postcode-afleiding gebeurt apart
// (server-side) in de vote-route; hier checken we enkel aanwezigheid/vorm.
export function validateAnswer(q: PollQuestion, raw: unknown): { ok: true; value?: AnswerValue } | { ok: false; error: string } {
  const isEmpty =
    raw === undefined ||
    raw === null ||
    raw === '' ||
    (Array.isArray(raw) && raw.length === 0);

  if (isEmpty) {
    if (q.verplicht) return { ok: false, error: `Vraag "${q.label}" is verplicht.` };
    return { ok: true, value: undefined };
  }

  switch (q.type) {
    case 'keuze': {
      const opties = (q.config as KeuzeConfig).opties ?? [];
      if (typeof raw !== 'string' || !opties.includes(raw)) {
        return { ok: false, error: `Ongeldige keuze bij "${q.label}".` };
      }
      return { ok: true, value: raw };
    }
    case 'meervoud': {
      const opties = (q.config as KeuzeConfig).opties ?? [];
      if (!Array.isArray(raw) || !raw.every((v) => typeof v === 'string' && opties.includes(v))) {
        return { ok: false, error: `Ongeldige selectie bij "${q.label}".` };
      }
      // dedup
      return { ok: true, value: Array.from(new Set(raw as string[])) };
    }
    case 'schaal': {
      const cfg = q.config as SchaalConfig;
      const n = typeof raw === 'number' ? raw : Number(raw);
      if (!Number.isFinite(n) || !Number.isInteger(n) || n < cfg.min || n > cfg.max) {
        return { ok: false, error: `Ongeldige waarde bij "${q.label}".` };
      }
      return { ok: true, value: n };
    }
    case 'postcode': {
      // De vote-route leidt het departement server-side af; hier verwachten we
      // een 5-cijferige string als input.
      if (typeof raw !== 'string' || !/^\d{5}$/.test(raw.trim())) {
        return { ok: false, error: `Ongeldige postcode bij "${q.label}".` };
      }
      return { ok: true, value: raw.trim() };
    }
    default:
      return { ok: false, error: 'Onbekend vraagtype.' };
  }
}
