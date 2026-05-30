'use client';

import { useState } from 'react';
import type { PollWithQuestions, PollQuestion, KeuzeConfig, SchaalConfig, PollResults } from '@/lib/types';
import Results from './Results';
import { ABONNEMENT_URL } from '@/lib/links';

interface PostcodeState {
  value: string;
  chip: string | null;
  error: boolean;
}

export default function PollForm({ poll }: { poll: PollWithQuestions }) {
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [postcodes, setPostcodes] = useState<Record<string, PostcodeState>>({});
  const [person, setPerson] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [results, setResults] = useState<PollResults | null>(null);

  function setAnswer(qid: number, value: unknown) {
    setAnswers((prev) => ({ ...prev, [qid]: value }));
  }

  function toggleMulti(qid: number, opt: string) {
    setAnswers((prev) => {
      const cur = (prev[qid] as string[] | undefined) ?? [];
      const next = cur.includes(opt) ? cur.filter((o) => o !== opt) : [...cur, opt];
      return { ...prev, [qid]: next };
    });
  }

  async function lookupPostcode(qid: number, value: string) {
    if (!/^\d{5}$/.test(value)) {
      setPostcodes((p) => ({ ...p, [qid]: { value, chip: null, error: false } }));
      return;
    }
    try {
      const res = await fetch(
        `https://geo.api.gouv.fr/communes?codePostal=${value}&fields=nom,departement,region&format=json`
      );
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0 && data[0].departement) {
        const d = data[0].departement;
        const r = data[0].region;
        setPostcodes((p) => ({
          ...p,
          [qid]: {
            value,
            chip: `${d.nom} (${d.code})${r?.nom ? ' — ' + r.nom : ''}`,
            error: false,
          },
        }));
        setAnswer(qid, value);
      } else {
        setPostcodes((p) => ({ ...p, [qid]: { value, chip: null, error: true } }));
        setAnswer(qid, '');
      }
    } catch {
      setPostcodes((p) => ({ ...p, [qid]: { value, chip: null, error: true } }));
      setAnswer(qid, '');
    }
  }

  async function submit() {
    setError(null);
    // client-side check verplichte velden
    for (const q of poll.questions) {
      if (!q.verplicht) continue;
      const v = answers[q.id];
      const empty = v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);
      if (empty) {
        setError(`Vul a.u.b. "${q.label}" in.`);
        return;
      }
      if (q.type === 'postcode' && postcodes[q.id]?.error) {
        setError('Onbekende Franse postcode — controleer de postcode.');
        return;
      }
    }
    if (poll.collect_personal_data) {
      for (const f of poll.personal_fields) {
        if (!person[f]?.trim()) {
          setError(`Vul a.u.b. het veld "${f}" in.`);
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/poll/${poll.slug}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers,
          person: poll.collect_personal_data ? person : undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? 'Er ging iets mis.');
        setSubmitting(false);
        return;
      }
      setDone(true);
      // uitslag ophalen
      const rRes = await fetch(`/api/poll/${poll.slug}/results`);
      if (rRes.ok) setResults(await rRes.json());
    } catch {
      setError('Netwerkfout. Probeer opnieuw.');
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="poll-card">
        <div className="success-box">
          <h2>Bedankt!</h2>
          <p className="muted">Uw stem is geteld.</p>
        </div>
        {results && (
          <>
            <h2>Tussenstand</h2>
            <Results data={results} />
          </>
        )}

        {/* CTA: discrete abonnee-werving onder de uitslag. */}
        <div className="cta-block">
          <p className="cta-text">Waardeert u dit initiatief?</p>
          <a className="btn-cta" href={ABONNEMENT_URL} target="_blank" rel="noopener">
            Word abonnee
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="poll-card">
      {error && <div className="form-error">{error}</div>}
      {poll.questions.map((q) => (
        <Question
          key={q.id}
          q={q}
          answers={answers}
          postcode={postcodes[q.id]}
          onSelect={setAnswer}
          onToggle={toggleMulti}
          onPostcode={lookupPostcode}
        />
      ))}

      {poll.collect_personal_data && (
        <div className="question">
          {poll.personal_fields.map((f) => (
            <div key={f} style={{ marginBottom: 12 }}>
              <label className="field-label" htmlFor={`pf-${f}`}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </label>
              <input
                id={`pf-${f}`}
                className="text-input"
                value={person[f] ?? ''}
                onChange={(e) => setPerson((p) => ({ ...p, [f]: e.target.value }))}
              />
            </div>
          ))}
        </div>
      )}

      <button className="btn-primary" onClick={submit} disabled={submitting}>
        {submitting ? 'Bezig…' : 'Verstuur'}
      </button>

      <p className="privacy-note">
        {poll.collect_personal_data
          ? `Uw gegevens worden uitsluitend gebruikt voor "${poll.titel}" en niet gedeeld.`
          : 'We bewaren geen persoonsgegevens; uw stem wordt anoniem geteld.'}
      </p>
    </div>
  );
}

function Question({
  q,
  answers,
  postcode,
  onSelect,
  onToggle,
  onPostcode,
}: {
  q: PollQuestion;
  answers: Record<string, unknown>;
  postcode?: PostcodeState;
  onSelect: (qid: number, v: unknown) => void;
  onToggle: (qid: number, opt: string) => void;
  onPostcode: (qid: number, v: string) => void;
}) {
  const [infoOpen, setInfoOpen] = useState(false);
  return (
    <div className="question">
      <div className="question-label">
        {q.label}
        {q.verplicht && <span className="req-mark"> *</span>}
        {q.info && (
          <button
            type="button"
            className="info-toggle"
            aria-expanded={infoOpen}
            aria-label="Toelichting tonen"
            onClick={() => setInfoOpen((v) => !v)}
          >
            i
          </button>
        )}
      </div>
      {q.info && infoOpen && <div className="info-block">{q.info}</div>}

      {q.type === 'keuze' && (
        <div className="options">
          {(q.config as KeuzeConfig).opties.map((opt) => {
            const selected = answers[q.id] === opt;
            return (
              <button
                key={opt}
                type="button"
                className={`option-btn${selected ? ' selected' : ''}`}
                onClick={() => onSelect(q.id, opt)}
              >
                <span className="option-mark" />
                {opt}
              </button>
            );
          })}
        </div>
      )}

      {q.type === 'meervoud' && (
        <div className="options">
          {(q.config as KeuzeConfig).opties.map((opt) => {
            const selected = ((answers[q.id] as string[] | undefined) ?? []).includes(opt);
            return (
              <button
                key={opt}
                type="button"
                className={`option-btn checkbox${selected ? ' selected' : ''}`}
                onClick={() => onToggle(q.id, opt)}
              >
                <span className="option-mark" />
                {opt}
              </button>
            );
          })}
        </div>
      )}

      {q.type === 'schaal' && (
        <Scale q={q} value={answers[q.id] as number | undefined} onSelect={onSelect} />
      )}

      {q.type === 'postcode' && (
        <div>
          <input
            className="pc-input"
            inputMode="numeric"
            maxLength={5}
            placeholder="bv. 31000"
            value={postcode?.value ?? ''}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, '').slice(0, 5);
              onPostcode(q.id, v);
            }}
            onBlur={(e) => onPostcode(q.id, e.target.value.replace(/\D/g, '').slice(0, 5))}
          />
          {postcode?.chip && <span className="pc-chip">{postcode.chip}</span>}
          {postcode?.error && <span className="pc-chip error">Onbekende Franse postcode</span>}
        </div>
      )}
    </div>
  );
}

function Scale({
  q,
  value,
  onSelect,
}: {
  q: PollQuestion;
  value: number | undefined;
  onSelect: (qid: number, v: unknown) => void;
}) {
  const cfg = q.config as SchaalConfig;
  const buttons = [];
  for (let i = cfg.min; i <= cfg.max; i++) buttons.push(i);
  return (
    <div>
      <div className="scale-row">
        {buttons.map((n) => (
          <button
            key={n}
            type="button"
            className={`scale-btn${value === n ? ' selected' : ''}`}
            onClick={() => onSelect(q.id, n)}
          >
            {n}
          </button>
        ))}
      </div>
      {(cfg.min_label || cfg.max_label) && (
        <div className="scale-labels">
          <span>{cfg.min_label}</span>
          <span>{cfg.max_label}</span>
        </div>
      )}
    </div>
  );
}
