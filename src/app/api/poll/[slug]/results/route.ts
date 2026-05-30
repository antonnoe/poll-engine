import { NextResponse } from 'next/server';
import { serviceClient } from '@/lib/supabase';
import { aggregateQuestion } from '@/lib/aggregate';
import type { Poll, PollQuestion, PollResults } from '@/lib/types';

export const runtime = 'nodejs';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const supabase = serviceClient();

  const { data: poll, error: pollErr } = await supabase
    .from('polls')
    .select('id, slug, titel, status')
    .eq('slug', slug)
    .maybeSingle<Pick<Poll, 'id' | 'slug' | 'titel' | 'status'>>();

  if (pollErr) return NextResponse.json({ error: 'Serverfout.' }, { status: 500 });
  if (!poll) return NextResponse.json({ error: 'Poll niet gevonden.' }, { status: 404 });

  const { data: questions } = await supabase
    .from('poll_questions')
    .select('*')
    .eq('poll_id', poll.id)
    .order('positie', { ascending: true });

  // Alleen tellingen — nooit person of ip_hash selecteren.
  const { data: subs } = await supabase
    .from('poll_submissions')
    .select('answers')
    .eq('poll_id', poll.id);

  const submissions = (subs ?? []).map((s) => s.answers as Record<string, unknown>);

  const body: PollResults = {
    slug: poll.slug,
    titel: poll.titel,
    submissions: submissions.length,
    results: (questions as PollQuestion[] | null ?? []).map((q) =>
      aggregateQuestion(q, submissions)
    ),
  };

  return NextResponse.json(body, {
    headers: { 'Cache-Control': 'public, max-age=15, stale-while-revalidate=60' },
  });
}
