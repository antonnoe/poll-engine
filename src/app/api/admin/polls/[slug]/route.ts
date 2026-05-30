import { NextResponse } from 'next/server';
import { serviceClient } from '@/lib/supabase';
import { isAdminRequest } from '@/lib/admin-auth';
import type { Poll, PollQuestion } from '@/lib/types';

export const runtime = 'nodejs';

// GET: één poll + vragen (beheer).
export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'Niet geautoriseerd.' }, { status: 401 });
  }
  const { slug } = await params;
  const supabase = serviceClient();

  const { data: poll } = await supabase
    .from('polls')
    .select('*')
    .eq('slug', slug)
    .maybeSingle<Poll>();
  if (!poll) return NextResponse.json({ error: 'Poll niet gevonden.' }, { status: 404 });

  const { data: questions } = await supabase
    .from('poll_questions')
    .select('*')
    .eq('poll_id', poll.id)
    .order('positie', { ascending: true });

  return NextResponse.json({ poll, questions: (questions as PollQuestion[]) ?? [] });
}

// PATCH: status schakelen (concept -> open -> gesloten).
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'Niet geautoriseerd.' }, { status: 401 });
  }
  const { slug } = await params;
  let body: { status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Ongeldige aanvraag.' }, { status: 400 });
  }
  if (!['concept', 'open', 'gesloten'].includes(body.status ?? '')) {
    return NextResponse.json({ error: 'Ongeldige status.' }, { status: 400 });
  }
  const supabase = serviceClient();
  const { error } = await supabase
    .from('polls')
    .update({ status: body.status })
    .eq('slug', slug);
  if (error) return NextResponse.json({ error: 'Bijwerken mislukt.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
