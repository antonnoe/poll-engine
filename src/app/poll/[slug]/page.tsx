import { notFound } from 'next/navigation';
import { anonClient } from '@/lib/supabase';
import PollForm from '@/components/PollForm';
import ShareButtons from '@/components/ShareButtons';
import type { Poll, PollQuestion, PollWithQuestions } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function PollPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  // Frontend leest open polls/vragen via de anon-client (RLS staat enkel status='open' toe).
  const supabase = anonClient();

  const { data: poll } = await supabase
    .from('polls')
    .select('*')
    .eq('slug', slug)
    .maybeSingle<Poll>();

  if (!poll) notFound();

  const { data: questions } = await supabase
    .from('poll_questions')
    .select('*')
    .eq('poll_id', poll.id)
    .order('positie', { ascending: true });

  const full: PollWithQuestions = {
    ...poll,
    questions: (questions as PollQuestion[]) ?? [],
  };

  return (
    <main className="poll-wrap">
      <div className="poll-card">
        <h1>{poll.titel}</h1>
        {/* Toon óf de database-intro, óf de standaardregel als fallback — nooit beide. */}
        <p className="poll-intro">
          {poll.intro?.trim()
            ? poll.intro
            : 'Dit is een peiling, geen aanbod en geen toezegging.'}
        </p>
      </div>
      <PollForm poll={full} />
      <div className="poll-card share-card">
        <ShareButtons />
      </div>
      <footer className="poll-herkomst">
        Raadplegingsinstrument ontwikkeld door Communities Abroad, de
        serviceorganisatie achter Infofrankrijk.com, Café Claude (cafeclaude.fr),
        Nedergids.nl en Nederlanders.fr.
      </footer>
    </main>
  );
}
