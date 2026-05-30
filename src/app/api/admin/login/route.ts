import { NextResponse } from 'next/server';
import { ADMIN_COOKIE, verifyPasswordAndToken } from '@/lib/admin-auth';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Ongeldige aanvraag.' }, { status: 400 });
  }
  const token = verifyPasswordAndToken(body.password ?? '');
  if (!token) {
    return NextResponse.json({ error: 'Onjuist wachtwoord.' }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 8, // 8 uur
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, '', { path: '/', maxAge: 0 });
  return res;
}
