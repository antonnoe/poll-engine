-- ============ Seed: raadpleging "paspoortreis" (herzien) ============
-- Status: permanent (sluit nooit, doorlopend stemmen + resultaat).
-- Anoniem (collect_personal_data = false), ip_dedup aan, vier vragen.
-- Idempotent: verwijdert bestaande poll + vragen (cascade) en voegt opnieuw in.
-- Vereist migratie 0003_permanent.sql (status 'permanent') en 0004_question_info.sql
-- (kolom poll_questions.info).

delete from public.polls where slug = 'paspoortreis';

with p as (
  insert into public.polls (slug, titel, intro, status, collect_personal_data, ip_dedup)
  values (
    'paspoortreis',
    'Paspoortreis — raadpleging',
    'Dit is een peiling, geen aanbod en geen toezegging.',
    'permanent',
    false,
    true
  )
  returning id
)
insert into public.poll_questions (poll_id, positie, type, label, config, verplicht, info)
select p.id, v.positie, v.type, v.label, v.config::jsonb, v.verplicht, v.info
from p,
(values
  (0, 'keuze',
      'Wanneer verwacht u uw paspoort of ID-kaart te moeten vernieuwen?',
      '{"opties":["Q3 2026 (jul–sep)","Q4 2026 (okt–dec)","Q1 2027 (jan–mrt)","Q2 2027 (apr–jun)","Q3 2027 (jul–sep)","Q4 2027 (okt–dec)","Later of weet ik nog niet"],"weergave":"dropdown"}',
      true, null),
  (1, 'keuze',
      'Zou u met anderen uit uw regio willen meereizen?',
      '{"opties":["Ja, graag","Misschien","Nee, liever zelf"]}',
      true, null),
  (2, 'meervoud',
      'Welke locatie heeft uw voorkeur?',
      '{"opties":["Ambassade Parijs","Barcelona (VFS Global)","Buurland-ambassade (Luxemburg, België, Duitsland)","Grensgemeente in Nederland","Schiphol","Mobiel station afwachten","Geen voorkeur"]}',
      true,
      'Persoonlijke verschijning is bij elke locatie verplicht. De ambassade in Parijs en grensgemeenten zijn het voordeligst; een grensgemeente in Nederland verwerkt de aanvraag in Nederland en is daardoor goedkoper. VFS Global (o.a. Barcelona) kost dezelfde basisprijs plus een toeslag, maar heeft vaak sneller plek dan een volgeboekte ambassade. Het mobiele aanvraagstation is bedoeld voor wie om medische redenen niet kan reizen en heeft beperkte capaciteit.'),
  (3, 'postcode',
      'Vanuit welke postcode zou u vertrekken?',
      '{}',
      true, null)
) as v(positie, type, label, config, verplicht, info);
