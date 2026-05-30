# poll-engine — communities-tools

Eén herbruikbare voorziening die **meerdere polls** draagt, met meerdere
vraagtypes, optionele persoonsgegevens, uitslag-weergave (CSS-balken, geen
chartlibrary) en CSV-export voor beheer. Lean — geen survey-platform.

**Stack:** Next.js (App Router) op Vercel · Supabase (Postgres + RLS).

---

## Vraagtypes

| Type | Invoer | Uitslag |
|------|--------|---------|
| `keuze` (incl. ja/nee) | tappable, single-select | horizontale balken, aantal + % |
| `meervoud` | tappable, multi-select | balken (som kan > 100%) |
| `schaal` (1–5, instelbaar) | knoppen | gemiddelde (1 decimaal) + verdeling |
| `postcode` (FR) | 5-cijferig veld + bevestigingschip | departement-balken (hoogste boven) |

Per poll instelbaar: anoniem of met persoonsgegevens · IP-deduplicatie aan/uit ·
sluitdatum.

---

## Setup

### 1. Database
Voer de migraties uit in de Supabase SQL-editor (project **communities-tools**,
`https://mqkhfyvrizgmmmcbdkxh.supabase.co`):

```
supabase/migrations/0001_init.sql
supabase/migrations/0002_purge.sql
```

Daarna de eerste poll seeden:

```
supabase/seed_paspoortreis.sql
```

### 2. Env (Vercel / `.env.local`)
Zie `.env.example`. Server-only secrets NOOIT met `NEXT_PUBLIC_` prefix.

| Var | Scope | Doel |
|-----|-------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | publiek | Supabase project-URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | publiek | anon-client (leest enkel OPEN polls via RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | **server** | vote/results/export/admin routes |
| `POLL_IP_SALT` | **server** | salt voor de HMAC-SHA256 IP-hash |
| `ADMIN_SECRET` | **server** | beheer-wachtwoord voor `/admin/polls` (v1) |

### 3. Draaien
```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # productiebuild
```

---

## Routes

**Publiek**
- `GET /poll/[slug]` — standalone poll-pagina (huisstijl, mobile-first).
- `POST /api/poll/[slug]/vote` — inzenden (service role).
- `GET /api/poll/[slug]/results` — uitslag, **alleen tellingen** (nooit `person`/`ip_hash`).

**Beheer** (achter `ADMIN_SECRET`-cookie)
- `GET /admin/polls` — dashboard: poll aanmaken, vragen toevoegen, status schakelen, uitslag, CSV.
- `GET /api/admin/poll/[slug]/export.csv` — CSV-export (incl. persoonsgegevens indien verzameld).
- `POST /api/admin/login` / `DELETE` — in-/uitloggen.
- `GET|POST /api/admin/polls`, `GET|PATCH /api/admin/polls/[slug]`, `POST|DELETE /api/admin/polls/[slug]/questions`.

---

## Beveiligingsposture

- De **frontend** leest open polls/vragen via de **anon-client**; RLS staat enkel
  `status = 'open'` toe.
- **Stemmen, uitslag en export** lopen server-side via de **service role** (omzeilt
  RLS bewust en veilig).
- `poll_submissions` heeft **geen anon-grants en geen anon-policies** — `ip_hash` en
  `person` zijn per constructie onbereikbaar voor anon.
- Het **ruwe IP** wordt nooit opgeslagen of gelogd; enkel `HMAC-SHA256(POLL_IP_SALT, ip)`.
- **Postcode**: server leidt het departement opnieuw af via `geo.api.gouv.fr` (vertrouwt
  client-afleiding niet). De 5-cijferige postcode wordt **niet** bewaard — alleen
  `{dept_code, dept_naam, region_naam}`.

---

## Embed in de NLFR-kolom

Twee snippets in `embed/` (vervang `BASE_URL` en `SLUG`):
- `embed/lightbox-snippet.html` — **voorkeur**: knop opent `/poll/[slug]` als
  iframe-overlay op volle breedte.
- `embed/popup-snippet.html` — fallback zonder inline JS: knop opent de poll in een
  nieuw tabblad.

---

## Twee beslispunten — gekozen invulling

1. **Beheer-auth.** Dit is een fresh standalone repo zonder bestaande communities-tools
   SSO/HMAC-code om aan te koppelen. Daarom v1 met een **lean `ADMIN_SECRET`**
   (httpOnly cookie met HMAC-token; het secret zit niet in de cookie). Alle checks
   lopen via `src/lib/admin-auth.ts` → `isAdmin()` / `isAdminRequest()`. Vervang
   **enkel daar** door het bestaande SSO/HMAC-patroon wanneer dat beschikbaar is.

2. **Bewaartermijn persoonsgegevens — ingebouwd.** Migratie `0002_purge.sql` voegt een
   kolom `purge_after_days int` (nullable, **default null = nooit purgen**) toe aan
   `polls`, plus de functie `purge_expired_person_data(p_poll_id bigint)`. Die wist
   **alleen het `person`-veld** van inzendingen ouder dan de per-poll ingestelde termijn;
   `answers` en `created_at` blijven intact, dus uitslagen blijven kloppen. **Geen cron:**
   de uitslag-route (`GET /api/poll/[slug]/results`) roept de functie best-effort aan voor
   de betreffende poll. Instelbaar bij het aanmaken van een poll (alleen relevant als
   persoonsgegevens worden verzameld). De paspoortreis-poll is anoniem en raakt dit niet.

---

## Legal / content-todo (geen code)

Zodra een poll **persoonsgegevens** verzamelt, moet **Privacyverklaring v2.1** dit
dekken (doel, bewaartermijn, geen deling). **Publiceer zo'n poll niet** vóór die regel
staat. De paspoortreis-poll is anoniem en raakt dit niet.

---

## Bewust NIET in v1

Geen vertakkende/skip-logica · geen drag-drop builder · geen realtime-sockets · geen
meertaligheid · geen externe chartlibrary.
