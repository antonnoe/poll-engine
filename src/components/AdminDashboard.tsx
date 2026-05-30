'use client';

import { useEffect, useState } from 'react';
import type { Poll, PollQuestion, PollStatus, PollResults, QuestionType } from '@/lib/types';
import Results from './Results';

export default function AdminDashboard() {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/admin/polls');
    if (res.ok) setPolls((await res.json()).polls);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  async function setStatus(slug: string, status: PollStatus) {
    await fetch(`/api/admin/polls/${slug}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    load();
  }

  function nextStatus(s: PollStatus): PollStatus | null {
    if (s === 'concept') return 'open';
    if (s === 'open') return 'gesloten';
    return null;
  }

  if (loading) return <p className="muted">Laden…</p>;

  if (selected) {
    return <PollDetail slug={selected} onBack={() => setSelected(null)} />;
  }

  return (
    <div>
      <CreatePoll onCreated={load} />

      <div className="poll-card">
        <h2>Polls</h2>
        {polls.length === 0 ? (
          <p className="muted">Nog geen polls.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Titel</th>
                <th>Slug</th>
                <th>Status</th>
                <th>Acties</th>
              </tr>
            </thead>
            <tbody>
              {polls.map((p) => {
                const next = nextStatus(p.status);
                return (
                  <tr key={p.id}>
                    <td>{p.titel}</td>
                    <td>
                      <code>{p.slug}</code>
                    </td>
                    <td>
                      <span className={`tag ${p.status}`}>{p.status}</span>
                    </td>
                    <td style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button className="btn-sm" onClick={() => setSelected(p.slug)}>
                        Vragen / uitslag
                      </button>
                      {next && (
                        <button className="btn-sm solid" onClick={() => setStatus(p.slug, next)}>
                          → {next}
                        </button>
                      )}
                      <a className="btn-sm" href={`/api/admin/poll/${p.slug}/export.csv`}>
                        CSV
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <button
        className="btn-sm"
        onClick={async () => {
          await fetch('/api/admin/login', { method: 'DELETE' });
          window.location.reload();
        }}
      >
        Uitloggen
      </button>
    </div>
  );
}

function CreatePoll({ onCreated }: { onCreated: () => void }) {
  const [titel, setTitel] = useState('');
  const [slug, setSlug] = useState('');
  const [intro, setIntro] = useState('');
  const [ipDedup, setIpDedup] = useState(true);
  const [collect, setCollect] = useState(false);
  const [fields, setFields] = useState('naam, email');
  const [closesAt, setClosesAt] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function create() {
    setBusy(true);
    setError(null);
    const res = await fetch('/api/admin/polls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        titel,
        slug,
        intro,
        ip_dedup: ipDedup,
        collect_personal_data: collect,
        personal_fields: collect ? fields.split(',').map((f) => f.trim()).filter(Boolean) : [],
        closes_at: closesAt || null,
      }),
    });
    const b = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(b.error ?? 'Aanmaken mislukt.');
      return;
    }
    setTitel('');
    setSlug('');
    setIntro('');
    onCreated();
  }

  return (
    <div className="poll-card admin-row-form">
      <h2>Nieuwe poll</h2>
      {error && <div className="form-error">{error}</div>}
      <label>Titel</label>
      <input value={titel} onChange={(e) => setTitel(e.target.value)} />
      <label>Slug (a-z, 0-9, -)</label>
      <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="bv. paspoortreis" />
      <label>Intro</label>
      <textarea value={intro} onChange={(e) => setIntro(e.target.value)} rows={2} />
      <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12 }}>
        <input type="checkbox" style={{ width: 'auto' }} checked={ipDedup} onChange={(e) => setIpDedup(e.target.checked)} />
        IP-deduplicatie (één stem per IP)
      </label>
      <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input type="checkbox" style={{ width: 'auto' }} checked={collect} onChange={(e) => setCollect(e.target.checked)} />
        Persoonsgegevens verzamelen
      </label>
      {collect && (
        <>
          <label>Velden (kommagescheiden)</label>
          <input value={fields} onChange={(e) => setFields(e.target.value)} />
        </>
      )}
      <label>Sluitdatum (optioneel)</label>
      <input type="datetime-local" value={closesAt} onChange={(e) => setClosesAt(e.target.value)} />
      <button className="btn-primary" style={{ marginTop: 14 }} onClick={create} disabled={busy}>
        {busy ? 'Bezig…' : 'Poll aanmaken'}
      </button>
    </div>
  );
}

function PollDetail({ slug, onBack }: { slug: string; onBack: () => void }) {
  const [questions, setQuestions] = useState<PollQuestion[]>([]);
  const [results, setResults] = useState<PollResults | null>(null);
  const [tab, setTab] = useState<'vragen' | 'uitslag'>('vragen');

  async function load() {
    const res = await fetch(`/api/admin/polls/${slug}`);
    if (res.ok) setQuestions((await res.json()).questions);
  }
  useEffect(() => {
    load();
  }, [slug]);

  async function loadResults() {
    const res = await fetch(`/api/poll/${slug}/results`);
    if (res.ok) setResults(await res.json());
  }

  async function deleteQuestion(id: number) {
    await fetch(`/api/admin/polls/${slug}/questions?id=${id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div>
      <button className="btn-sm" onClick={onBack}>
        ← Terug
      </button>
      <div style={{ display: 'flex', gap: 8, margin: '14px 0' }}>
        <button className={`btn-sm${tab === 'vragen' ? ' solid' : ''}`} onClick={() => setTab('vragen')}>
          Vragen
        </button>
        <button
          className={`btn-sm${tab === 'uitslag' ? ' solid' : ''}`}
          onClick={() => {
            setTab('uitslag');
            loadResults();
          }}
        >
          Uitslag
        </button>
      </div>

      {tab === 'vragen' && (
        <>
          <div className="poll-card">
            <h2>Vragen ({slug})</h2>
            {questions.length === 0 ? (
              <p className="muted">Nog geen vragen.</p>
            ) : (
              <ol>
                {questions.map((q) => (
                  <li key={q.id} style={{ marginBottom: 8 }}>
                    <strong>[{q.type}]</strong> {q.label}{' '}
                    <button className="btn-sm" onClick={() => deleteQuestion(q.id)}>
                      verwijder
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </div>
          <AddQuestion slug={slug} onAdded={load} />
        </>
      )}

      {tab === 'uitslag' && (
        <div className="poll-card">
          <h2>Uitslag</h2>
          {results ? <Results data={results} /> : <p className="muted">Laden…</p>}
        </div>
      )}
    </div>
  );
}

function AddQuestion({ slug, onAdded }: { slug: string; onAdded: () => void }) {
  const [type, setType] = useState<QuestionType>('keuze');
  const [label, setLabel] = useState('');
  const [opties, setOpties] = useState('Ja\nNee');
  const [verplicht, setVerplicht] = useState(true);
  const [smin, setSmin] = useState(1);
  const [smax, setSmax] = useState(5);
  const [minLabel, setMinLabel] = useState('');
  const [maxLabel, setMaxLabel] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function add() {
    setError(null);
    const payload: Record<string, unknown> = { type, label, verplicht };
    if (type === 'keuze' || type === 'meervoud') {
      payload.opties = opties.split('\n').map((o) => o.trim()).filter(Boolean);
    } else if (type === 'schaal') {
      payload.schaal = { min: smin, max: smax, min_label: minLabel, max_label: maxLabel };
    }
    const res = await fetch(`/api/admin/polls/${slug}/questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const b = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(b.error ?? 'Toevoegen mislukt.');
      return;
    }
    setLabel('');
    onAdded();
  }

  return (
    <div className="poll-card admin-row-form">
      <h3>Vraag toevoegen</h3>
      {error && <div className="form-error">{error}</div>}
      <label>Type</label>
      <select value={type} onChange={(e) => setType(e.target.value as QuestionType)}>
        <option value="keuze">keuze (single)</option>
        <option value="meervoud">meervoud (multi)</option>
        <option value="schaal">schaal</option>
        <option value="postcode">postcode (FR)</option>
      </select>
      <label>Label</label>
      <input value={label} onChange={(e) => setLabel(e.target.value)} />

      {(type === 'keuze' || type === 'meervoud') && (
        <>
          <label>Opties (één per regel)</label>
          <textarea value={opties} onChange={(e) => setOpties(e.target.value)} rows={4} />
        </>
      )}
      {type === 'schaal' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label>Min</label>
            <input type="number" value={smin} onChange={(e) => setSmin(Number(e.target.value))} />
          </div>
          <div>
            <label>Max</label>
            <input type="number" value={smax} onChange={(e) => setSmax(Number(e.target.value))} />
          </div>
          <div>
            <label>Min-label</label>
            <input value={minLabel} onChange={(e) => setMinLabel(e.target.value)} />
          </div>
          <div>
            <label>Max-label</label>
            <input value={maxLabel} onChange={(e) => setMaxLabel(e.target.value)} />
          </div>
        </div>
      )}

      <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12 }}>
        <input type="checkbox" style={{ width: 'auto' }} checked={verplicht} onChange={(e) => setVerplicht(e.target.checked)} />
        Verplicht
      </label>
      <button className="btn-primary" style={{ marginTop: 12 }} onClick={add}>
        Toevoegen
      </button>
    </div>
  );
}
