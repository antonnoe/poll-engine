'use client';

import { useEffect, useState } from 'react';
import Results from './Results';
import ShareButtons from './ShareButtons';
import { RAADPLEGINGEN_URL } from '@/lib/links';
import type { PollResults } from '@/lib/types';

interface PollListItem {
  slug: string;
  titel: string;
  status: string;
}
interface PollsResponse {
  lopend: PollListItem[];
  permanent: PollListItem[];
  voltooid: PollListItem[];
}

// Live tussenstand per poll (zelfde origin, dus relatieve fetch).
function PollResultBlock({ slug }: { slug: string }) {
  const [data, setData] = useState<PollResults | null>(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    let active = true;
    fetch(`/api/poll/${encodeURIComponent(slug)}/results`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => active && setData(d))
      .catch(() => active && setErr(true));
    return () => {
      active = false;
    };
  }, [slug]);
  if (err) return <p className="muted">Resultaat niet beschikbaar.</p>;
  if (!data) return <p className="loading">Tussenstand laden…</p>;
  return <Results data={data} />;
}

function JoinAndResultCard({ p }: { p: PollListItem }) {
  return (
    <div className="rdpl-card">
      <h3>{p.titel}</h3>
      <a className="btn-primary rdpl-join" href={`/poll/${p.slug}`} target="_top">
        Doe mee
      </a>
      <div className="rdpl-result">
        <PollResultBlock slug={p.slug} />
      </div>
    </div>
  );
}

function ResultCard({ p }: { p: PollListItem }) {
  return (
    <div className="rdpl-card">
      <h3>{p.titel}</h3>
      <div className="rdpl-result">
        <PollResultBlock slug={p.slug} />
      </div>
    </div>
  );
}

function Section({
  title,
  items,
  cards,
  withButton,
}: {
  title: string;
  items: PollListItem[];
  cards: boolean;
  withButton: boolean;
}) {
  return (
    <section className="rdpl-group">
      <h2>{title}</h2>
      {items.length === 0 ? (
        <p className="empty">Geen raadplegingen in deze categorie.</p>
      ) : (
        <div className={cards ? 'rdpl-grid cards' : 'rdpl-grid'}>
          {items.map((p) =>
            withButton ? <JoinAndResultCard key={p.slug} p={p} /> : <ResultCard key={p.slug} p={p} />
          )}
        </div>
      )}
    </section>
  );
}

export default function RaadplegingenClient() {
  const [data, setData] = useState<PollsResponse | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    fetch('/api/polls')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setData)
      .catch(() => setErr(true));
  }, []);

  // postMessage-hoogtecommunicatie: laat de parent-iframe meegroeien met de inhoud.
  useEffect(() => {
    const sendHeight = () => {
      const h = document.documentElement.scrollHeight;
      window.parent?.postMessage({ type: 'raadplegingen:height', height: h }, '*');
    };
    sendHeight();
    const ro = new ResizeObserver(sendHeight);
    ro.observe(document.body);
    window.addEventListener('load', sendHeight);
    const t = setInterval(sendHeight, 1500); // vangt async-geladen resultaten op
    return () => {
      ro.disconnect();
      window.removeEventListener('load', sendHeight);
      clearInterval(t);
    };
  }, [data]);

  return (
    <main className="rdpl-wrap">
      <header className="rdpl-intro">
        <h1>Raadplegingen</h1>
        <p>Uw mening telt. Dit zijn peilingen, geen aanbod en geen toezegging.</p>
      </header>

      <div className="rdpl-actions">
        <div className="rdpl-share-col">
          <h2>Deel deze raadpleging</h2>
          <ShareButtons />
        </div>
        <div className="rdpl-qr-col">
          <h2>QR-code</h2>
          <a href={RAADPLEGINGEN_URL} target="_blank" rel="noopener" aria-label="Open de raadplegingen">
            {/* Vaste QR-afbeelding uit public/ (zelfde origin, werkt ook in de iframe). */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/raadplegingen-qr.png" alt="QR-code naar de raadplegingen" />
          </a>
          <div className="rdpl-qr-caption">Scan de QR-code</div>
          <a className="btn-share" href="/raadplegingen-qr.png" download>
            Download QR
          </a>
        </div>
      </div>

      {err && <p className="muted">Kon de raadplegingen niet laden. Probeer het later opnieuw.</p>}
      {!err && !data && <p className="loading">Raadplegingen laden…</p>}

      {data && (
        <>
          <Section title="Lopende raadplegingen" items={data.lopend} cards withButton />
          <Section title="Permanente raadplegingen" items={data.permanent} cards withButton />
          <Section title="Voltooide raadplegingen" items={data.voltooid} cards={false} withButton={false} />
        </>
      )}

      <footer className="rdpl-herkomst">
        Raadplegingsinstrument ontwikkeld door Communities Abroad, de serviceorganisatie
        achter Infofrankrijk.com, Café Claude (cafeclaude.fr), Nedergids.nl en Nederlanders.fr.
      </footer>
    </main>
  );
}
