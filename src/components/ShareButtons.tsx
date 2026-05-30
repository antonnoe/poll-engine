'use client';

import { useState } from 'react';
import { RAADPLEGINGEN_URL, SHARE_TITLE, SHARE_TEXT } from '@/lib/links';

// "Deel deze raadpleging": Web Share API met fallback naar kopieer-link,
// plus een directe Facebook-deelknop. Deelt altijd de raadplegingen-URL.
export default function ShareButtons() {
  const [copied, setCopied] = useState(false);

  async function share() {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: SHARE_TITLE, text: SHARE_TEXT, url: RAADPLEGINGEN_URL });
        return;
      } catch {
        // gebruiker annuleerde of API faalde → val terug op kopiëren
      }
    }
    try {
      await navigator.clipboard.writeText(RAADPLEGINGEN_URL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt('Kopieer deze link:', RAADPLEGINGEN_URL);
    }
  }

  const fbUrl =
    'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(RAADPLEGINGEN_URL);

  return (
    <div className="share-row">
      <button type="button" className="btn-share" onClick={share}>
        Deel deze raadpleging
      </button>
      <a className="btn-share fb" href={fbUrl} target="_blank" rel="noopener">
        Deel op Facebook
      </a>
      {copied && <span className="share-copied">Link gekopieerd ✓</span>}
    </div>
  );
}
