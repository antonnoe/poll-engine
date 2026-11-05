# CLAUDE.md

Repo: poll-engine

## Wat dit is

Herbruikbare poll-engine voor het netwerk van platforms: meerdere polls, meerdere vraagtypes (keuze, meervoud, schaal, postcode), optionele persoonsgegevens, uitslag met CSS-balken en CSV-export voor beheer (bron: README.md, package.json).

## Live adres

https://poll-engine.vercel.app (overzichtsroute: https://poll-engine.vercel.app/raadplegingen, bron: README.md)

## Opbouw

- src/app: pagina's (poll/[slug], raadplegingen, admin/polls) en API-routes (api/poll/[slug]/vote en results, api/polls, api/admin/login, api/admin/polls en questions, api/admin/poll/[slug]/export.csv)
- src/components: PollForm, Results, ShareButtons, AdminLogin, AdminDashboard, RaadplegingenClient
- src/lib: admin-auth, aggregate, cors, csv, ip, links, postcode, supabase, types, validate
- supabase/migrations: 0001_init, 0002_purge, 0003_permanent, 0004_question_info; supabase/seed_paspoortreis.sql
- embed: lightbox-snippet.html, popup-snippet.html, raadplegingen-ning.html
- public: raadplegingen-qr.png; scripts: verify-seed.ts

## Techniek

Next.js 15 (App Router), React 19, TypeScript, @supabase/supabase-js. Scripts: dev, build, start, lint, typecheck.

## Externe diensten en namen van omgevingsvariabelen

- Supabase (Postgres met RLS), project communities-tools
- Vercel (hosting)
- geo.api.gouv.fr (departement afleiden uit postcode)
- Variabelen: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, POLL_IP_SALT, ADMIN_SECRET (voorbeeld in .env.example)

## Hoe het live gaat

Next.js-app op Vercel. Migraties worden handmatig in de Supabase SQL-editor uitgevoerd. De overzichtsroute en polls worden ingebed op nederlanders.fr via iframe (frame-ancestors in next.config.js) met de snippets in embed/.

## Regels en besluiten

Uit README.md:
- Server-only secrets nooit met de prefix NEXT_PUBLIC_.
- De frontend leest alleen open polls via de anon-client (RLS); stemmen, uitslag en export lopen server-side via de service role.
- poll_submissions heeft geen anon-grants en geen anon-policies; het ruwe IP wordt nooit opgeslagen of gelogd, alleen een HMAC-SHA256-hash met POLL_IP_SALT.
- Postcode: de server leidt het departement zelf af; de postcode wordt niet bewaard.
- Beheer-auth in v1 via ADMIN_SECRET, alle checks via src/lib/admin-auth.ts.
- Bewaartermijn persoonsgegevens per poll (purge_after_days, standaard nooit purgen); geen cron.
- Een poll die persoonsgegevens verzamelt, wordt niet gepubliceerd voordat de privacyverklaring dit dekt.
- Bewust niet in v1: vertakkende logica, drag-drop builder, realtime-sockets, meertaligheid, externe chartlibrary.

## Laatst nagelopen

Laatst nagelopen: 5 november 2026
