'use client';

import type { PollResults, QuestionResult } from '@/lib/types';

function Bars({
  rows,
}: {
  rows: { label: string; count: number; pct: number }[];
}) {
  return (
    <>
      {rows.map((r, i) => (
        <div className="bar-row" key={i}>
          <div className="bar-top">
            <span>{r.label}</span>
            <span className="muted">
              {r.count} · {r.pct}%
            </span>
          </div>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${r.pct}%` }} />
          </div>
        </div>
      ))}
    </>
  );
}

function QuestionResultView({ q }: { q: QuestionResult }) {
  return (
    <div className="result-q">
      <h3 className="question-label">{q.label}</h3>
      {q.type === 'keuze' && <Bars rows={q.options} />}
      {q.type === 'meervoud' && (
        <>
          <Bars rows={q.options} />
          <p className="muted" style={{ fontSize: '0.85rem' }}>
            Meerdere antwoorden mogelijk — som kan boven 100% uitkomen.
          </p>
        </>
      )}
      {q.type === 'schaal' && (
        <>
          <div className="scale-avg">Gemiddelde: {q.average.toFixed(1)}</div>
          <Bars
            rows={q.distribution.map((d) => ({
              label: String(d.value),
              count: d.count,
              pct: d.pct,
            }))}
          />
        </>
      )}
      {q.type === 'postcode' && (
        <>
          {q.departments.length === 0 ? (
            <p className="muted">Nog geen antwoorden.</p>
          ) : (
            <Bars
              rows={q.departments.map((d) => ({
                label: `${d.dept_naam} (${d.dept_code})`,
                count: d.count,
                pct: d.pct,
              }))}
            />
          )}
        </>
      )}
      <p className="muted" style={{ fontSize: '0.82rem' }}>
        {q.total} {q.total === 1 ? 'antwoord' : 'antwoorden'}
      </p>
    </div>
  );
}

export default function Results({ data }: { data: PollResults }) {
  return (
    <div>
      <p className="muted">
        {data.submissions} {data.submissions === 1 ? 'inzending' : 'inzendingen'}
      </p>
      {data.results.map((q, i) => (
        <QuestionResultView key={i} q={q} />
      ))}
    </div>
  );
}
