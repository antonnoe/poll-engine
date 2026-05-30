// Verificatie tegen de echte seed-config: render-branch, vote-validatie, aggregatie.
// Draai met: node scripts/verify-seed.ts
import { validateAnswer } from '../src/lib/validate.ts';
import { aggregateQuestion } from '../src/lib/aggregate.ts';
import type { PollQuestion, KeuzeConfig } from '../src/lib/types.ts';

let failures = 0;
function check(name: string, cond: boolean) {
  console.log((cond ? 'PASS' : 'FAIL') + ' — ' + name);
  if (!cond) failures++;
}

// Exacte configs uit seed_paspoortreis.sql
const q0: PollQuestion = {
  id: 100, poll_id: 1, positie: 0, type: 'keuze',
  label: 'Wanneer verwacht u uw paspoort of ID-kaart te moeten vernieuwen?',
  config: {
    opties: ['Q3 2026 (jul–sep)', 'Q4 2026 (okt–dec)', 'Q1 2027 (jan–mrt)',
      'Q2 2027 (apr–jun)', 'Q3 2027 (jul–sep)', 'Q4 2027 (okt–dec)', 'Later of weet ik nog niet'],
    weergave: 'dropdown',
  },
  verplicht: true, info: null,
};
const q2: PollQuestion = {
  id: 102, poll_id: 1, positie: 2, type: 'meervoud',
  label: 'Welke locatie heeft uw voorkeur?',
  config: {
    opties: ['Ambassade Parijs', 'Barcelona (VFS Global)',
      'Buurland-ambassade (Luxemburg, België, Duitsland)', 'Grensgemeente in Nederland',
      'Schiphol', 'Mobiel station afwachten', 'Geen voorkeur'],
  },
  verplicht: true, info: null,
};

// --- Render-branch logica (zoals in PollForm Question) ---
const isDropdown = (q: PollQuestion) =>
  q.type === 'keuze' && (q.config as KeuzeConfig).weergave === 'dropdown';
const isCheckbox = (q: PollQuestion) => q.type === 'meervoud';

check('V0 rendert als dropdown', isDropdown(q0) === true);
check('V0 rendert NIET als losse keuze-knoppen', !(q0.type === 'keuze' && (q0.config as KeuzeConfig).weergave !== 'dropdown'));
check('V0 dropdown bevat 7 opties', (q0.config as KeuzeConfig).opties.length === 7);

check('V2 rendert als checkboxes (meervoud)', isCheckbox(q2) === true);
check('V2 toont 7 opties', (q2.config as KeuzeConfig).opties.length === 7);
check('V2 bevat "Geen voorkeur" als laatste optie',
  (q2.config as KeuzeConfig).opties[6] === 'Geen voorkeur');

// --- Vote-validatie tegen de echte validateAnswer ---
const r0 = validateAnswer(q0, 'Q4 2026 (okt–dec)');
check('V0 accepteert een geldige dropdown-keuze', r0.ok === true && (r0 as any).value === 'Q4 2026 (okt–dec)');

const multi = ['Ambassade Parijs', 'Schiphol', 'Geen voorkeur'];
const r2 = validateAnswer(q2, multi);
check('V2 accepteert meerdere aangevinkte opties (array)',
  r2.ok === true && Array.isArray((r2 as any).value) && (r2 as any).value.length === 3);
const r2g = validateAnswer(q2, ['Geen voorkeur']);
check('V2 accepteert "Geen voorkeur" als geldige keuze', r2g.ok === true);
const r2bad = validateAnswer(q2, ['Onbestaande optie']);
check('V2 weigert een optie die niet in config staat', r2bad.ok === false);

// --- Aggregatie meervoud (echte aggregateQuestion) ---
const subs = [
  { '102': ['Ambassade Parijs', 'Schiphol'] },
  { '102': ['Ambassade Parijs', 'Geen voorkeur'] },
  { '102': ['Geen voorkeur'] },
];
const agg = aggregateQuestion(q2, subs);
const parijs = (agg as any).options.find((o: any) => o.label === 'Ambassade Parijs');
const geen = (agg as any).options.find((o: any) => o.label === 'Geen voorkeur');
check('Aggregatie type is meervoud', (agg as any).type === 'meervoud');
check('Aggregatie telt "Ambassade Parijs" = 2', parijs && parijs.count === 2);
check('Aggregatie telt "Geen voorkeur" = 2', geen && geen.count === 2);
check('Aggregatie toont alle 7 opties', (agg as any).options.length === 7);

console.log('\n' + (failures === 0 ? 'ALLE CHECKS GESLAAGD' : failures + ' CHECK(S) GEFAALD'));
process.exit(failures === 0 ? 0 : 1);
