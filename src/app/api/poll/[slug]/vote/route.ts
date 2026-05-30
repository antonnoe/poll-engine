import { NextResponse } from 'next/server';
import { serviceClient } from '@/lib/supabase';
import { validateAnswer } from '@/lib/validate';
import { deriveDepartment } from '@/lib/postcode';
import { hashIp, clientIpFromHeaders } from '@/lib/ip';
import type { Poll, PollQuestion, AnswerValue } from '@/lib/types';

export const runtime = 'nodejs';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const supabase = serviceClient();

  // 1. Laad poll + vragen (service role).
  const { data: poll, error: pollErr } = await supabase
    .from('polls')
    .select('*')
    .eq('slug', slug)
    .maybeSingle<Poll>();

  if (pollErr) return NextResponse.json({ error: 'Serverfout.' }, { status: 500 });
  if (!poll) return NextResponse.json({ error: 'Poll niet gevonden.' }, { status: 404 });

  // Stemmen wordt geaccepteerd bij 'open' én 'permanent'; 'permanent' sluit nooit.
  if (poll.status !== 'open' && poll.status !== 'permanent') {
    return NextResponse.json({ error: 'Deze peiling is gesloten.' }, { status: 409 });
  }
  if (
    poll.status !== 'permanent' &&
    poll.closes_at &&
    new Date(poll.closes_at).getTime() < Date.now()
  ) {
    return NextResponse.json({ error: 'Deze peiling is gesloten.' }, { status: 409 });
  }

  const { data: questions, error: qErr } = await supabase
    .from('poll_questions')
    .select('*')
    .eq('poll_id', poll.id)
    .order('positie', { ascending: true });

  if (qErr || !questions) return NextResponse.json({ error: 'Serverfout.' }, { status: 500 });

  // Parse body.
  let body: { answers?: Record<string, unknown>; person?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Ongeldige aanvraag.' }, { status: 400 });
  }
  const incoming = body.answers ?? {};

  // 2. IP-hash voor dedup.
  let ip_hash: string | null = null;
  if (poll.ip_dedup) {
    const ip = clientIpFromHeaders(req.headers);
    ip_hash = ip ? hashIp(ip) : null;
  }

  // 3. Valideer antwoorden + leid postcodes server-side af.
  const stored: Record<string, AnswerValue> = {};
  for (const q of questions as PollQuestion[]) {
    const result = validateAnswer(q, incoming[String(q.id)]);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    if (result.value === undefined) continue; // optioneel & leeg

    if (q.type === 'postcode') {
      // Vertrouw client-afleiding niet: opnieuw afleiden, postcode niet bewaren.
      const derived = await deriveDepartment(result.value as string);
      if (!derived) {
        return NextResponse.json({ error: 'Onbekende Franse postcode.' }, { status: 400 });
      }
      stored[String(q.id)] = derived;
    } else {
      stored[String(q.id)] = result.value;
    }
  }

  // 4. Persoonsgegevens alleen als de poll dat verzamelt.
  let person: Record<string, unknown> | null = null;
  if (poll.collect_personal_data) {
    const fields = poll.personal_fields ?? [];
    const collected: Record<string, unknown> = {};
    for (const field of fields) {
      const val = body.person?.[field];
      if (val === undefined || val === null || val === '') {
        return NextResponse.json(
          { error: `Veld "${field}" is verplicht.` },
          { status: 400 }
        );
      }
      collected[field] = val;
    }
    person = collected;
  }

  // 5. Insert; vang unieke-constraint (dedup) af.
  const { error: insErr } = await supabase.from('poll_submissions').insert({
    poll_id: poll.id,
    ip_hash,
    answers: stored,
    person,
  });

  if (insErr) {
    if ((insErr as { code?: string }).code === '23505') {
      return NextResponse.json({ error: 'U heeft al gestemd.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Opslaan mislukt.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
