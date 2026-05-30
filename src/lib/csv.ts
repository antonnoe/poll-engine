import type { PollQuestion, PostcodeAnswer } from './types';

function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function formatAnswer(q: PollQuestion, raw: unknown): string {
  if (raw === undefined || raw === null) return '';
  switch (q.type) {
    case 'meervoud':
      return Array.isArray(raw) ? raw.join('; ') : String(raw);
    case 'postcode': {
      const a = raw as PostcodeAnswer;
      if (a && typeof a === 'object' && a.dept_code) {
        return `${a.dept_naam} (${a.dept_code})${a.region_naam ? ' — ' + a.region_naam : ''}`;
      }
      return '';
    }
    default:
      return String(raw);
  }
}

export interface SubmissionRow {
  created_at: string;
  answers: Record<string, unknown>;
  person: Record<string, unknown> | null;
}

// Bouwt CSV: created_at, één kolom per vraag (label als kop), plus personal_fields.
export function buildCsv(
  questions: PollQuestion[],
  personalFields: string[],
  rows: SubmissionRow[]
): string {
  const header = ['created_at', ...questions.map((q) => q.label), ...personalFields];
  const lines = [header.map(escapeCsv).join(',')];

  for (const row of rows) {
    const cells: string[] = [row.created_at];
    for (const q of questions) {
      cells.push(formatAnswer(q, row.answers[String(q.id)]));
    }
    for (const field of personalFields) {
      const val = row.person?.[field];
      cells.push(val === undefined || val === null ? '' : String(val));
    }
    lines.push(cells.map(escapeCsv).join(','));
  }

  // BOM zodat Excel UTF-8 correct leest.
  return '﻿' + lines.join('\r\n') + '\r\n';
}
