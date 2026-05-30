-- ============ Seed: eerste poll "paspoortreis" ============
-- Anoniem (collect_personal_data = false), ip_dedup aan, status open.
-- Idempotent: verwijdert een eventueel bestaande paspoortreis-poll eerst.

delete from public.polls where slug = 'paspoortreis';

with p as (
  insert into public.polls (slug, titel, intro, status, collect_personal_data, ip_dedup)
  values (
    'paspoortreis',
    'Paspoortreis — peiling',
    'Dit is een peiling, geen aanbod en geen toezegging.',
    'open',
    false,
    true
  )
  returning id
)
insert into public.poll_questions (poll_id, positie, type, label, config, verplicht)
select p.id, v.positie, v.type, v.label, v.config::jsonb, v.verplicht
from p,
(values
  (0, 'keuze',
      'Heeft u binnen 12 maanden een paspoort- of ID-kaartaanvraag voor de boeg?',
      '{"opties":["Ja","Nee","Mogelijk"]}', true),
  (1, 'keuze',
      'Zou u met anderen uit uw regio willen meereizen?',
      '{"opties":["Ja, graag","Misschien","Nee, liever zelf"]}', true),
  (2, 'postcode',
      'Vanuit welke postcode zou u vertrekken?',
      '{}', true)
) as v(positie, type, label, config, verplicht);
