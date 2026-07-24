# Spinnerei

Organisations-App der Spinnerei. Läuft auf https://spinnerei.al-daellen.ch.

Basierend auf der **hausfest26**-App (gleiche Grundstruktur, eine Ebene
höher: mehrere Anlässe), Design 1:1 von der **Spinnplan**-App übernommen
(Industrial-Dark, Barlow / Share Tech Mono / VT323, Gold-Akzent).

## Struktur

- **Startseite**: alle Anlässe (kommende + vergangene), chronologisch;
  Admins legen neue Anlässe direkt hier an
- **Pro Anlass** (`/anlass/[id]`): gleiche Struktur wie die Hausfest-App,
  ohne Programm-Übersicht:
  - **Ressorts** → Sub-Ressorts → **Todos** → Diskussion (@Mentions),
    Pinnwand pro Ressort; Spezial-Ressorts: **Acts** (Bands/DJs mit Rider,
    Gagen, Übernachtung) und **Finanzen** (Ausgaben, Belege, Budget)
  - **Sitzungen**: Doodle-Verfügbarkeit, Termin fixieren, Protokoll (Markdown)
  - **Einkauf**: Einkaufsliste je Ressort
- **Global** (ein Login für alle Anlässe): **Meine Sachen**, **Inbox**
  (Mentions, Zuweisungen, Kommentare, Sitzungen), **Admin**
  (Accounts + Ressorts), PWA mit Web-Push

Accounts: Jede:r registriert sich selbst (`/register`); der erste Account
wird automatisch Admin. Optional: `REGISTRATION_CODE` (Einladungscode) und
`ADMIN_EMAILS` als Env-Variablen.

Die Anlässe Herbst/Winter 2026 werden per Migration geseedet
(`drizzle/0001_seed-anlaesse.sql`), die Start-Ressorts pro Anlass beim
ersten Start über `scripts/seed.mjs` (idempotent).

## Stack

- **Next.js 16** (App Router, Standalone Output) + **React 19**
- **Tailwind CSS v4**
- **Postgres 16** + **Drizzle ORM**
- **Docker** + **GitHub Actions** für Auto-Deploy
- Reverse-Proxy: **Caddy** (zentral im `ambardaellen-app`-Stack auf demselben VPS)

## So arbeitest du dran (ohne Terminal)

1. Repo auf github.com öffnen, Punkttaste `.` drücken → VS Code im Browser (github.dev)
2. Änderungen mit Codex/ChatGPT machen, einfügen
3. Source-Control → Commit-Message → Sync-Button
4. ~2 Min später live auf https://spinnerei.al-daellen.ch

## Schema-Änderungen

1. `src/lib/db/schema.ts` editieren
2. `npm run db:generate` → erzeugt Migration in `drizzle/`
3. Committen + pushen → wird beim Deploy automatisch migriert
