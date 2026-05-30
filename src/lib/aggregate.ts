import type {
  PollQuestion,
  QuestionResult,
  KeuzeConfig,
  SchaalConfig,
  PostcodeAnswer,
} from './types';

const round1 = (n: number) => Math.round(n * 10) / 10;
const pct = (count: number, total: number) => (total === 0 ? 0 : Math.round((count / total) * 100));

type SubmissionAnswers = Record<string, unknown>;

// Aggregeert submissions per vraag tot enkel tellingen (geen person/ip_hash).
export function aggregateQuestion(
  q: PollQuestion,
  submissions: SubmissionAnswers[]
): QuestionResult {
  const key = String(q.id);
  const values = submissions
    .map((s) => s[key])
    .filter((v) => v !== undefined && v !== null && v !== '');

  switch (q.type) {
    case 'keuze': {
      const opties = (q.config as KeuzeConfig).opties ?? [];
      const total = values.length;
      const counts = new Map<string, number>();
      opties.forEach((o) => counts.set(o, 0));
      for (const v of values) {
        if (typeof v === 'string' && counts.has(v)) counts.set(v, counts.get(v)! + 1);
      }
      return {
        type: 'keuze',
        label: q.label,
        total,
        options: opties.map((o) => {
          const c = counts.get(o) ?? 0;
          return { label: o, count: c, pct: pct(c, total) };
        }),
      };
    }
    case 'meervoud': {
      const opties = (q.config as KeuzeConfig).opties ?? [];
      const total = values.length; // aantal inzenders dat antwoordde
      const counts = new Map<string, number>();
      opties.forEach((o) => counts.set(o, 0));
      for (const v of values) {
        if (Array.isArray(v)) {
          for (const item of v) {
            if (typeof item === 'string' && counts.has(item)) counts.set(item, counts.get(item)! + 1);
          }
        }
      }
      return {
        type: 'meervoud',
        label: q.label,
        total,
        // pct t.o.v. aantal inzenders -> som kan > 100%
        options: opties.map((o) => {
          const c = counts.get(o) ?? 0;
          return { label: o, count: c, pct: pct(c, total) };
        }),
      };
    }
    case 'schaal': {
      const cfg = q.config as SchaalConfig;
      const nums = values.map((v) => Number(v)).filter((n) => Number.isFinite(n));
      const total = nums.length;
      const sum = nums.reduce((a, b) => a + b, 0);
      const average = total === 0 ? 0 : round1(sum / total);
      const distribution: SchaalResult['distribution'] = [];
      for (let val = cfg.min; val <= cfg.max; val++) {
        const c = nums.filter((n) => n === val).length;
        distribution.push({ value: val, count: c, pct: pct(c, total) });
      }
      return {
        type: 'schaal',
        label: q.label,
        total,
        average,
        min: cfg.min,
        max: cfg.max,
        distribution,
      };
    }
    case 'postcode': {
      const total = values.length;
      const map = new Map<string, { dept_code: string; dept_naam: string; region_naam: string; count: number }>();
      for (const v of values) {
        const pcAns = v as PostcodeAnswer;
        if (pcAns && typeof pcAns === 'object' && pcAns.dept_code) {
          const existing = map.get(pcAns.dept_code);
          if (existing) existing.count += 1;
          else
            map.set(pcAns.dept_code, {
              dept_code: pcAns.dept_code,
              dept_naam: pcAns.dept_naam,
              region_naam: pcAns.region_naam,
              count: 1,
            });
        }
      }
      const departments = Array.from(map.values())
        .map((d) => ({ ...d, pct: pct(d.count, total) }))
        .sort((a, b) => b.count - a.count); // hoogste boven
      return { type: 'postcode', label: q.label, total, departments };
    }
    default:
      return { type: 'keuze', label: q.label, total: 0, options: [] };
  }
}

// Lokale her-import om de distribution-type te kennen zonder circular import issues.
type SchaalResult = Extract<QuestionResult, { type: 'schaal' }>;
