import { NextResponse } from 'next/server';
import { serviceClient } from '@/lib/supabase';
import { isAdminRequest } from '@/lib/admin-auth';
import { buildCsv, SubmissionRow } from '@/lib/csv';
import type { Poll, PollQuestion } from '@/lib/types';

export const runtime = 'nodejs';

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

  const { data: subs } = await supabase
    .from('poll_submissions')
    .select('created_at, answers, person')
    .eq('poll_id', poll.id)
    .order('created_at', { ascending: true });

  const rows: SubmissionRow[] = (subs ?? []).map((s) => ({
    created_at: s.created_at as string,
    answers: (s.answers as Record<string, unknown>) ?? {},
    person: (s.person as Record<string, unknown> | null) ?? null,
  }));

  const personalFields = poll.collect_personal_data ? poll.personal_fields ?? [] : [];
  const csv = buildCsv((questions as PollQuestion[]) ?? [], personalFields, rows);

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="poll-${slug}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
