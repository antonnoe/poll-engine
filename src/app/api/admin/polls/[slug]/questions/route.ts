import { NextResponse } from 'next/server';
import { serviceClient } from '@/lib/supabase';
import { isAdminRequest } from '@/lib/admin-auth';
import type { Poll, QuestionType } from '@/lib/types';

export const runtime = 'nodejs';

// POST: voeg een vraag toe aan een poll.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'Niet geautoriseerd.' }, { status: 401 });
  }
  const { slug } = await params;
  let body: {
    type?: QuestionType;
    label?: string;
    opties?: string[];
    schaal?: { min?: number; max?: number; min_label?: string; max_label?: string };
    verplicht?: boolean;
    positie?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Ongeldige aanvraag.' }, { status: 400 });
  }

  const type = body.type;
  const label = (body.label ?? '').trim();
  if (!['keuze', 'meervoud', 'schaal', 'postcode'].includes(type ?? '')) {
    return NextResponse.json({ error: 'Ongeldig vraagtype.' }, { status: 400 });
  }
  if (!label) return NextResponse.json({ error: 'Label is verplicht.' }, { status: 400 });

  // Bouw config per type.
  let config: Record<string, unknown> = {};
  if (type === 'keuze' || type === 'meervoud') {
    const opties = (body.opties ?? []).map((o) => o.trim()).filter(Boolean);
    if (opties.length < 2) {
      return NextResponse.json({ error: 'Minimaal 2 opties vereist.' }, { status: 400 });
    }
    config = { opties };
  } else if (type === 'schaal') {
    const min = body.schaal?.min ?? 1;
    const max = body.schaal?.max ?? 5;
    if (!Number.isInteger(min) || !Number.isInteger(max) || min >= max) {
      return NextResponse.json({ error: 'Schaal: min < max vereist.' }, { status: 400 });
    }
    config = {
      min,
      max,
      min_label: body.schaal?.min_label ?? '',
      max_label: body.schaal?.max_label ?? '',
    };
  }
  // postcode: config blijft {}

  const supabase = serviceClient();
  const { data: poll } = await supabase
    .from('polls')
    .select('id')
    .eq('slug', slug)
    .maybeSingle<Pick<Poll, 'id'>>();
  if (!poll) return NextResponse.json({ error: 'Poll niet gevonden.' }, { status: 404 });

  // Bepaal positie als niet meegegeven.
  let positie = body.positie;
  if (positie === undefined) {
    const { count } = await supabase
      .from('poll_questions')
      .select('id', { count: 'exact', head: true })
      .eq('poll_id', poll.id);
    positie = count ?? 0;
  }

  const { data, error } = await supabase
    .from('poll_questions')
    .insert({ poll_id: poll.id, type, label, config, verplicht: body.verplicht ?? true, positie })
    .select()
    .single();
  if (error) return NextResponse.json({ error: 'Toevoegen mislukt.' }, { status: 500 });
  return NextResponse.json({ question: data });
}

// DELETE: verwijder een vraag (?id=...).
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'Niet geautoriseerd.' }, { status: 401 });
  }
  await params;
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id ontbreekt.' }, { status: 400 });
  const supabase = serviceClient();
  const { error } = await supabase.from('poll_questions').delete().eq('id', Number(id));
  if (error) return NextResponse.json({ error: 'Verwijderen mislukt.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
