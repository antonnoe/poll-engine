-- ============ poll-engine: [i]-infoblok per vraag (communities-tools) ============
-- Optionele toelichting per vraag. Wanneer gevuld toont de publieke poll-pagina
-- een klein [i]-icoon naast het vraaglabel dat de tekst uit-/inklapt.
-- Standaard-engine-functie, herbruikbaar voor elke poll.
-- Bestaande migraties blijven ongewijzigd; dit is een aanvullende migratie.

alter table public.poll_questions
  add column if not exists info text;  -- null = geen infoblok
