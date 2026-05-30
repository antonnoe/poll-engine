// Gedeelde types voor de poll-engine.

export type PollStatus = 'concept' | 'open' | 'permanent' | 'gesloten';
export type QuestionType = 'keuze' | 'meervoud' | 'schaal' | 'postcode';

export interface Poll {
  id: number;
  slug: string;
  titel: string;
  intro: string | null;
  status: PollStatus;
  collect_personal_data: boolean;
  personal_fields: string[];
  ip_dedup: boolean;
  created_at: string;
  closes_at: string | null;
  purge_after_days: number | null; // null = persoonsgegevens nooit purgen
}

export interface KeuzeConfig {
  opties: string[];
  weergave?: 'knoppen' | 'dropdown'; // default 'knoppen'; 'dropdown' = select voor veel opties
}
export interface SchaalConfig {
  min: number;
  max: number;
  min_label?: string;
  max_label?: string;
}
export type QuestionConfig = KeuzeConfig | SchaalConfig | Record<string, never>;

export interface PollQuestion {
  id: number;
  poll_id: number;
  positie: number;
  type: QuestionType;
  label: string;
  config: QuestionConfig;
  verplicht: boolean;
  info: string | null; // optionele toelichting; toont [i]-uitklap naast het label
}

// Afgeleid postcode-antwoord zoals opgeslagen (postcode zelf wordt NIET bewaard).
export interface PostcodeAnswer {
  dept_code: string;
  dept_naam: string;
  region_naam: string;
}

// Antwoordwaarden per vraagtype, zoals opgeslagen in poll_submissions.answers
// keuze: string | meervoud: string[] | schaal: number | postcode: PostcodeAnswer
export type AnswerValue = string | string[] | number | PostcodeAnswer;

export interface PollWithQuestions extends Poll {
  questions: PollQuestion[];
}

// ---- Uitslag (alleen tellingen; nooit person/ip_hash) ----
export interface KeuzeResult {
  type: 'keuze' | 'meervoud';
  label: string;
  total: number; // aantal inzendingen dat deze vraag beantwoordde
  options: { label: string; count: number; pct: number }[];
}
export interface SchaalResult {
  type: 'schaal';
  label: string;
  total: number;
  average: number; // 1 decimaal
  min: number;
  max: number;
  distribution: { value: number; count: number; pct: number }[];
}
export interface PostcodeResult {
  type: 'postcode';
  label: string;
  total: number;
  departments: { dept_code: string; dept_naam: string; region_naam: string; count: number; pct: number }[];
}
export type QuestionResult = KeuzeResult | SchaalResult | PostcodeResult;

export interface PollResults {
  slug: string;
  titel: string;
  submissions: number;
  results: QuestionResult[];
}
