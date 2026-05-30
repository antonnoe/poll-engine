import { NextResponse } from 'next/server';
import { serviceClient } from '@/lib/supabase';
import { isAdminRequest } from '@/lib/admin-auth';

export const runtime = 'nodejs';

// GET: lijst alle polls (beheer).
export async function GET(req: Request) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'Niet geautoriseerd.' }, { status: 401 });
  }
  const supabase = serviceClient();
  const { data, error } = await supabase
    .from('polls')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: 'Serverfout.' }, { status: 500 });
  return NextResponse.json({ polls: data ?? [] });
}

// POST: maak een poll aan.
export async function POST(req: Request) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'Niet geautoriseerd.' }, { status: 401 });
  }
  let body: {
    slug?: string;
    titel?: string;
    intro?: string;
    collect_personal_data?: boolean;
    personal_fields?: string[];
    ip_dedup?: boolean;
    closes_at?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Ongeldige aanvraag.' }, { status: 400 });
  }

  const slug = (body.slug ?? '').trim().toLowerCase();
  const titel = (body.titel ?? '').trim();
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return NextResponse.json({ error: 'Slug mag enkel a-z, 0-9 en - bevatten.' }, { status: 400 });
  }
  if (!titel) return NextResponse.json({ error: 'Titel is verplicht.' }, { status: 400 });

  const supabase = serviceClient();
  const { data, error } = await supabase
    .from('polls')
    .insert({
      slug,
      titel,
      intro: body.intro?.trim() || null,
      status: 'concept',
      collect_personal_data: !!body.collect_personal_data,
      personal_fields: body.collect_personal_data ? body.personal_fields ?? [] : [],
      ip_dedup: body.ip_dedup ?? true,
      closes_at: body.closes_at || null,
    })
    .select()
    .single();

  if (error) {
    if ((error as { code?: string }).code === '23505') {
      return NextResponse.json({ error: 'Deze slug bestaat al.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Aanmaken mislukt.' }, { status: 500 });
  }
  return NextResponse.json({ poll: data });
}
