-- ============ poll-engine: initiële migratie (communities-tools) ============
create table public.polls (
  id                    bigint generated always as identity primary key,
  slug                  text not null unique,
  titel                 text not null,
  intro                 text,
  status                text not null default 'concept'
                          check (status in ('concept','open','gesloten')),
  collect_personal_data boolean not null default false,
  personal_fields       jsonb   not null default '[]'::jsonb,  -- bv. ["naam","email"]
  ip_dedup              boolean not null default true,
  created_at            timestamptz not null default now(),
  closes_at             timestamptz
);

create table public.poll_questions (
  id        bigint generated always as identity primary key,
  poll_id   bigint not null references public.polls(id) on delete cascade,
  positie   int    not null default 0,
  type      text   not null check (type in ('keuze','meervoud','schaal','postcode')),
  label     text   not null,
  config    jsonb  not null default '{}'::jsonb,
  -- keuze/meervoud: {"opties":["Ja","Nee","Misschien"]}
  -- schaal:        {"min":1,"max":5,"min_label":"...","max_label":"..."}
  -- postcode:      {} (afleiding gebeurt server-side)
  verplicht boolean not null default true
);

create table public.poll_submissions (
  id         bigint generated always as identity primary key,
  poll_id    bigint not null references public.polls(id) on delete cascade,
  created_at timestamptz not null default now(),
  ip_hash    text,                 -- HMAC van IP; nooit het ruwe IP
  answers    jsonb not null,       -- { "<question_id>": <waarde> }
  person     jsonb                 -- alleen gevuld als poll.collect_personal_data
);

-- max één inzending per (poll, ip_hash) wanneer ip_hash gezet is
create unique index poll_submissions_dedup
  on public.poll_submissions (poll_id, ip_hash)
  where ip_hash is not null;

-- ---------- RLS ----------
alter table public.polls            enable row level security;
alter table public.poll_questions   enable row level security;
alter table public.poll_submissions enable row level security;

-- anon mag uitsluitend OPEN polls + hun vragen lezen (frontend rendering)
create policy "anon leest open polls" on public.polls
  for select to anon using (status = 'open');

create policy "anon leest vragen van open polls" on public.poll_questions
  for select to anon using (
    exists (select 1 from public.polls p
            where p.id = poll_questions.poll_id and p.status = 'open')
  );

-- poll_submissions: BEWUST geen anon-policies en geen grants.
-- Inzenden, uitslag en export lopen server-side via de service role.
-- Zo zijn ip_hash en persoonsgegevens per constructie onbereikbaar voor anon.

-- ---------- GRANTs ----------
grant select on public.polls          to anon;
grant select on public.poll_questions to anon;
-- geen grants op poll_submissions voor anon (opzettelijk)
