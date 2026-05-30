-- ============ poll-engine: status 'permanent' (communities-tools) ============
-- Derde status naast 'open' en 'gesloten': een raadpleging die niet sluit,
-- doorlopend stemmen aanneemt én zijn resultaat toont.
-- Bestaande migraties blijven ongewijzigd; dit is een aanvullende migratie.

-- 1. Check-constraint uitbreiden.
alter table public.polls drop constraint if exists polls_status_check;
alter table public.polls
  add constraint polls_status_check
  check (status in ('concept','open','permanent','gesloten'));

-- 2. Anon-leespolicies: anon mag ook 'permanent'-polls + hun vragen lezen.
drop policy if exists "anon leest open polls" on public.polls;
create policy "anon leest open polls" on public.polls
  for select to anon using (status in ('open','permanent'));

drop policy if exists "anon leest vragen van open polls" on public.poll_questions;
create policy "anon leest vragen van open polls" on public.poll_questions
  for select to anon using (
    exists (select 1 from public.polls p
            where p.id = poll_questions.poll_id
              and p.status in ('open','permanent'))
  );
