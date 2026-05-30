-- ============ poll-engine: purge persoonsgegevens (communities-tools) ============
-- Standaard UIT (purge_after_days = null). Per poll instelbaar.
-- Wist alleen het person-veld; answers en created_at blijven intact, zodat
-- uitslagen blijven kloppen. Geen cron: de functie lift mee met de uitslag-route.

alter table public.polls
  add column if not exists purge_after_days int;  -- null = nooit purgen

-- Wist person van inzendingen ouder dan de per-poll ingestelde termijn.
-- Optioneel beperkt tot één poll (p_poll_id), zodat de uitslag-route enkel de
-- relevante poll opschoont. Geeft het aantal opgeschoonde rijen terug.
create or replace function public.purge_expired_person_data(p_poll_id bigint default null)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  affected integer := 0;
begin
  update public.poll_submissions s
     set person = null
    from public.polls p
   where s.poll_id = p.id
     and p.purge_after_days is not null
     and s.person is not null
     and s.created_at < now() - make_interval(days => p.purge_after_days)
     and (p_poll_id is null or p.id = p_poll_id);
  get diagnostics affected = row_count;
  return affected;
end;
$$;

-- Alleen server-side (service role) mag purgen; anon krijgt geen execute.
revoke all on function public.purge_expired_person_data(bigint) from public;
grant execute on function public.purge_expired_person_data(bigint) to service_role;
