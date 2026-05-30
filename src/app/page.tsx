export default function Home() {
  return (
    <main className="poll-wrap">
      <div className="poll-card">
        <h1>communities-tools — Peilingen</h1>
        <p className="poll-intro">
          Dit is de poll-engine. Open een specifieke peiling via <code>/poll/&lt;slug&gt;</code>,
          of ga naar het <a href="/admin/polls">beheer</a>.
        </p>
      </div>
    </main>
  );
}
