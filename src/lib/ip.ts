import { createHmac } from 'crypto';

// HMAC-SHA256 over het IP met POLL_IP_SALT. Het ruwe IP wordt nooit opgeslagen of gelogd.
export function hashIp(ip: string): string | null {
  const salt = process.env.POLL_IP_SALT;
  if (!salt) {
    // Zonder salt geen dedup — liever null dan een zwakke/lege hash.
    return null;
  }
  if (!ip) return null;
  return createHmac('sha256', salt).update(ip).digest('hex');
}

// Leest het client-IP uit standaard proxy-headers (Vercel zet x-forwarded-for).
export function clientIpFromHeaders(headers: Headers): string | null {
  const xff = headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  const real = headers.get('x-real-ip');
  if (real) return real.trim();
  return null;
}
