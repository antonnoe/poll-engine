import { NextResponse } from 'next/server';
import { serviceClient } from '@/lib/supabase';
import { corsHeaders, corsPreflight } from '@/lib/cors';
import type { Poll } from '@/lib/types';

export const runtime = 'nodejs';

export function OPTIONS() {
  return corsPreflight();
}

// Publieke lijst van raadplegingen, gegroepeerd op status.
// Alleen slug/titel/status — nooit person of ip_hash. Met CORS-header.
export async function GET() {
  const supabase = serviceClient();

  const { data, error } = await supabase
    .from('polls')
    .select('slug, titel, status')
    .in('status', ['open', 'permanent', 'gesloten'])
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'Serverfout.' }, { status: 500, headers: corsHeaders });
  }

  const rows = (data ?? []) as Pick<Poll, 'slug' | 'titel' | 'status'>[];
  const pick = (status: Poll['status']) =>
    rows
      .filter((p) => p.status === status)
      .map((p) => ({ slug: p.slug, titel: p.titel, status: p.status }));

  const body = {
    lopend: pick('open'), // lopende raadplegingen
    permanent: pick('permanent'), // permanente raadplegingen
    voltooid: pick('gesloten'), // voltooide raadplegingen
  };

  return NextResponse.json(body, {
    headers: {
      ...corsHeaders,
      'Cache-Control': 'public, max-age=30, stale-while-revalidate=120',
    },
  });
}
