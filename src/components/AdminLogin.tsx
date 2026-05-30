'use client';

import { useState } from 'react';

export default function AdminLogin() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function login() {
    setBusy(true);
    setError(null);
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      window.location.reload();
    } else {
      const b = await res.json().catch(() => ({}));
      setError(b.error ?? 'Inloggen mislukt.');
      setBusy(false);
    }
  }

  return (
    <div className="poll-card" style={{ maxWidth: 400 }}>
      <h2>Inloggen</h2>
      {error && <div className="form-error">{error}</div>}
      <input
        className="text-input"
        type="password"
        placeholder="Beheer-wachtwoord"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && login()}
      />
      <button className="btn-primary" style={{ marginTop: 12 }} onClick={login} disabled={busy}>
        {busy ? 'Bezig…' : 'Inloggen'}
      </button>
    </div>
  );
}
