import { cookies } from 'next/headers';
import { createHmac, timingSafeEqual } from 'crypto';

// ---- Beheer-auth (v1) ----
// Lean admin-secret. Bij login zetten we een httpOnly cookie met een HMAC-token
// afgeleid van ADMIN_SECRET, zodat het secret zelf niet in de cookie staat.
//
// TODO (Café Claude): vervang dit door het bestaande SSO/HMAC-beheerpatroon.
// Alle admin-checks lopen via isAdmin()/requireAdmin() — alleen dáár hoeft de
// koppeling te veranderen.

export const ADMIN_COOKIE = 'poll_admin';

function adminToken(): string | null {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return null;
  return createHmac('sha256', secret).update('poll-admin-v1').digest('hex');
}

function safeEq(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

// Verifieert het meegegeven wachtwoord tegen ADMIN_SECRET; geeft het cookie-token terug.
export function verifyPasswordAndToken(password: string): string | null {
  const secret = process.env.ADMIN_SECRET;
  const token = adminToken();
  if (!secret || !token) return null;
  if (!safeEq(password, secret)) return null;
  return token;
}

// Async: leest de cookie en valideert tegen het verwachte token.
export async function isAdmin(): Promise<boolean> {
  const expected = adminToken();
  if (!expected) return false;
  const store = await cookies();
  const got = store.get(ADMIN_COOKIE)?.value;
  if (!got) return false;
  return safeEq(got, expected);
}

// Voor route handlers: valideert het cookie-token uit een Request.
export function isAdminRequest(req: Request): boolean {
  const expected = adminToken();
  if (!expected) return false;
  const cookieHeader = req.headers.get('cookie') ?? '';
  const match = cookieHeader
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${ADMIN_COOKIE}=`));
  if (!match) return false;
  const got = decodeURIComponent(match.slice(ADMIN_COOKIE.length + 1));
  return safeEq(got, expected);
}
